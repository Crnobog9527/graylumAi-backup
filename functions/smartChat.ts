import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Token 估算函数
const estimateTokens = (text) => Math.ceil((text || '').length / 4);

// 缓存阈值
const CACHE_MIN_TOKENS = 1024;
const SYSTEM_CACHE_THRESHOLD = 1024;
const SUMMARY_CACHE_THRESHOLD = 2048;
const COMPRESSION_TRIGGER_ROUNDS = 5;
const COMPRESSION_TOKEN_THRESHOLD = 8000;
const CACHE_EXPIRY_MINUTES = 5;
const RECENT_MESSAGES_COUNT = 4;

// 模型配置
const MODELS = {
  haiku: '@preset/claude-haiku-4.5',
  sonnet: '@preset/claude-4-5-sonnet'
};

// 成本配置（per 1M tokens）
const COSTS = {
  haiku: { input: 1.0, output: 5.0, cached: 0.1 },
  sonnet: { input: 3.0, output: 15.0, cached: 0.3 }
};

// 复杂度分类器
const isComplexRequest = (message) => {
  const complexKeywords = [
    '代码', '分析', '创作', '解释', '比较', '设计', '架构',
    'code', 'analyze', 'explain', 'compare', 'design', 'create',
    '详细', '深入', '专业', 'detailed', 'in-depth', 'professional'
  ];
  
  const messageText = message.toLowerCase();
  const hasComplexKeyword = complexKeywords.some(kw => messageText.includes(kw));
  const isLongRequest = message.length > 100;
  
  return hasComplexKeyword || isLongRequest;
};

// 构建带缓存的消息
const buildCachedMessages = (systemPrompt, summary, recentMessages, currentMessage, cacheState) => {
  const messages = [];
  const cacheBreakpoints = [];
  
  // 第一层：系统提示词
  const systemTokens = estimateTokens(systemPrompt);
  if (systemPrompt && systemTokens >= SYSTEM_CACHE_THRESHOLD) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `<system_instruction>\n${systemPrompt}\n</system_instruction>`,
          cache_control: { type: 'ephemeral' }
        }
      ]
    });
    cacheBreakpoints.push({ layer: 'system', tokens: systemTokens });
  } else if (systemPrompt) {
    messages.push({
      role: 'user',
      content: systemPrompt
    });
  }
  
  // 第二层：历史摘要
  if (summary && summary.summary_text) {
    const summaryTokens = estimateTokens(summary.summary_text);
    if (summaryTokens >= SUMMARY_CACHE_THRESHOLD) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user' && Array.isArray(lastMessage.content)) {
        lastMessage.content.push({
          type: 'text',
          text: `<conversation_history>\n${summary.summary_text}\n</conversation_history>`,
          cache_control: { type: 'ephemeral' }
        });
      } else {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `<conversation_history>\n${summary.summary_text}\n</conversation_history>`,
              cache_control: { type: 'ephemeral' }
            }
          ]
        });
      }
      cacheBreakpoints.push({ layer: 'summary', tokens: summaryTokens });
    }
  }
  
  // 第三层：最近对话（不缓存）
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }
  
  // 当前消息
  messages.push({
    role: 'user',
    content: currentMessage
  });
  
  return { messages, cacheBreakpoints };
};

// 计算成本
const calculateCost = (model, inputTokens, outputTokens, cachedTokens, cacheCreationTokens) => {
  const modelCosts = COSTS[model === MODELS.haiku ? 'haiku' : 'sonnet'];
  
  const inputCost = (inputTokens / 1000000) * modelCosts.input;
  const outputCost = (outputTokens / 1000000) * modelCosts.output;
  const cachedCost = (cachedTokens / 1000000) * modelCosts.cached;
  const cacheCreationCost = (cacheCreationTokens / 1000000) * modelCosts.input * 1.25; // 创建缓存额外25%
  
  const totalCost = inputCost + outputCost + cachedCost + cacheCreationCost;
  const wouldBeCost = ((inputTokens + cachedTokens) / 1000000) * modelCosts.input + outputCost;
  const savings = wouldBeCost - totalCost;
  
  return { totalCost, savings };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { conversation_id, message, system_prompt, force_model, disable_model_web_search } = await req.json();
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // 获取或创建对话
    let conversation;
    if (conversation_id) {
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      conversation = convs[0];
    }
    
    if (!conversation) {
      conversation = await base44.asServiceRole.entities.Conversation.create({
        title: message.slice(0, 50),
        messages: [],
        total_credits_used: 0
      });
    }
    
    const messages = conversation.messages || [];
    const messageCount = Math.floor(messages.length / 2); // 用户消息数
    
    // 检查是否需要压缩
    const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const needsCompression = messageCount >= COMPRESSION_TRIGGER_ROUNDS || totalTokens >= COMPRESSION_TOKEN_THRESHOLD;
    
    let summary = null;
    if (needsCompression && messageCount > RECENT_MESSAGES_COUNT) {
      // 获取或生成摘要
      const summaries = await base44.asServiceRole.entities.ConversationSummary.filter({ 
        conversation_id: conversation.id 
      });
      
      if (summaries.length === 0 || summaries[0].covered_messages < messageCount - RECENT_MESSAGES_COUNT) {
        // 需要生成新摘要
        const messagesToCompress = messages.slice(0, -(RECENT_MESSAGES_COUNT * 2));
        const conversationText = messagesToCompress.map(m => 
          `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`
        ).join('\n\n');
        
        // 使用 Haiku 生成摘要
        const summaryPrompt = `请为以下对话生成结构化摘要，包括：
1. 主要讨论的主题（列表形式）
2. 用户的关键需求和偏好
3. 重要的上下文信息
4. 未完成的任务或待解决问题

对话内容：
${conversationText}

请以简洁的结构化格式输出，保留所有关键信息。`;

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        const summaryRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`
          },
          body: JSON.stringify({
            model: MODELS.haiku,
            messages: [{ role: 'user', content: summaryPrompt }],
            max_tokens: 1000
          })
        });
        
        const summaryData = await summaryRes.json();
        const summaryText = summaryData.choices[0].message.content;
        const summaryTokens = estimateTokens(summaryText);
        
        summary = await base44.asServiceRole.entities.ConversationSummary.create({
          conversation_id: conversation.id,
          user_email: user.email,
          summary_text: summaryText,
          covered_messages: messagesToCompress.length / 2,
          summary_tokens: summaryTokens,
          compression_ratio: summaryTokens / totalTokens
        });
        
        // 记录压缩统计
        await base44.asServiceRole.entities.TokenStats.create({
          conversation_id: conversation.id,
          user_email: user.email,
          model_used: MODELS.haiku,
          output_tokens: summaryTokens,
          request_type: 'compression',
          compression_triggered: true
        });
      } else {
        summary = summaries[0];
      }
    }
    
    // 选择模型
    const selectedModel = force_model || (isComplexRequest(message) ? MODELS.sonnet : MODELS.haiku);
    
    // 获取最近消息
    const recentMessages = messages.slice(-(RECENT_MESSAGES_COUNT * 2));
    
    // 构建缓存消息
    const { messages: apiMessages, cacheBreakpoints } = buildCachedMessages(
      system_prompt || conversation.system_prompt,
      summary,
      recentMessages,
      message,
      null
    );
    
    // 调用 OpenRouter API
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      return Response.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
    }
    
    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: apiMessages,
        max_tokens: 4096
      })
    });
    
    if (!apiRes.ok) {
      const error = await apiRes.text();
      return Response.json({ error: `API error: ${error}` }, { status: apiRes.status });
    }
    
    const data = await apiRes.json();
    const response = data.choices[0].message.content;
    
    // 解析 token 使用情况
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const cachedTokens = data.usage?.prompt_tokens_details?.cached_tokens || 0;
    const cacheCreationTokens = data.usage?.prompt_tokens_details?.cache_creation_tokens || 0;
    
    // 计算成本
    const { totalCost, savings } = calculateCost(
      selectedModel,
      inputTokens - cachedTokens - cacheCreationTokens,
      outputTokens,
      cachedTokens,
      cacheCreationTokens
    );
    
    // 更新对话
    const newMessages = [
      ...messages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: response, timestamp: new Date().toISOString() }
    ];
    
    await base44.asServiceRole.entities.Conversation.update(conversation.id, {
      messages: newMessages,
      updated_date: new Date().toISOString()
    });
    
    // 记录统计
    await base44.asServiceRole.entities.TokenStats.create({
      conversation_id: conversation.id,
      user_email: user.email,
      model_used: selectedModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      cache_creation_tokens: cacheCreationTokens,
      total_cost: totalCost,
      cache_savings: savings,
      request_type: isComplexRequest(message) ? 'complex' : 'simple',
      compression_triggered: needsCompression
    });
    
    // 更新或创建缓存状态
    const cacheStates = await base44.asServiceRole.entities.ConversationCache.filter({
      conversation_id: conversation.id
    });
    
    const expiresAt = new Date(Date.now() + CACHE_EXPIRY_MINUTES * 60 * 1000).toISOString();
    
    if (cacheStates.length > 0) {
      await base44.asServiceRole.entities.ConversationCache.update(cacheStates[0].id, {
        system_prompt_cached: cacheBreakpoints.some(b => b.layer === 'system'),
        summary_cached: cacheBreakpoints.some(b => b.layer === 'summary'),
        cache_breakpoints: cacheBreakpoints,
        last_cache_time: new Date().toISOString(),
        total_cached_tokens: cachedTokens,
        cache_hit_count: (cacheStates[0].cache_hit_count || 0) + (cachedTokens > 0 ? 1 : 0),
        expires_at: expiresAt
      });
    } else {
      await base44.asServiceRole.entities.ConversationCache.create({
        conversation_id: conversation.id,
        user_email: user.email,
        system_prompt_cached: cacheBreakpoints.some(b => b.layer === 'system'),
        summary_cached: cacheBreakpoints.some(b => b.layer === 'summary'),
        cache_breakpoints: cacheBreakpoints,
        last_cache_time: new Date().toISOString(),
        total_cached_tokens: cachedTokens,
        cache_hit_count: cachedTokens > 0 ? 1 : 0,
        expires_at: expiresAt
      });
    }
    
    return Response.json({
      conversation_id: conversation.id,
      response,
      model_used: selectedModel,
      stats: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: cachedTokens,
        cache_creation_tokens: cacheCreationTokens,
        total_cost: totalCost.toFixed(6),
        cache_savings: savings.toFixed(6),
        cache_hit_rate: cachedTokens > 0 ? ((cachedTokens / inputTokens) * 100).toFixed(1) + '%' : '0%',
        compression_triggered: needsCompression,
        summary_used: summary !== null
      }
    });
    
  } catch (error) {
    console.error('Smart chat error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});