import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CACHE_TTL_MINUTES = 15;
const SIMILARITY_THRESHOLD = 0.85;
const WEB_SEARCH_COST = 0.005;

// 标准化查询
const normalizeQuery = (query) => {
  return query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

// 计算查询hash
const hashQuery = (query, searchType) => {
  const normalized = normalizeQuery(query);
  const str = `${normalized}_${searchType}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// 检查缓存
const checkCache = async (query, searchType, base44) => {
  const queryHash = hashQuery(query, searchType);
  const caches = await base44.asServiceRole.entities.SearchCache.filter({ query_hash: queryHash });
  
  if (caches.length === 0) {
    return null;
  }
  
  const cache = caches[0];
  const now = new Date();
  const expiresAt = new Date(cache.expires_at);
  
  if (now > expiresAt) {
    // 缓存过期，删除
    await base44.asServiceRole.entities.SearchCache.delete(cache.id);
    return null;
  }
  
  // 命中缓存，更新统计
  await base44.asServiceRole.entities.SearchCache.update(cache.id, {
    hit_count: (cache.hit_count || 0) + 1,
    cost_saved: (cache.cost_saved || 0) + WEB_SEARCH_COST
  });
  
  return JSON.parse(cache.search_results);
};

// 保存缓存
const saveCache = async (query, searchType, results, base44) => {
  const queryHash = hashQuery(query, searchType);
  const normalized = normalizeQuery(query);
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
  
  try {
    await base44.asServiceRole.entities.SearchCache.create({
      query_hash: queryHash,
      normalized_query: normalized,
      search_type: searchType,
      search_results: JSON.stringify(results),
      hit_count: 0,
      expires_at: expiresAt,
      cost_saved: 0
    });
  } catch (error) {
    console.error('Save cache error:', error);
  }
};

// 执行搜索
const executeSearch = async (query, searchType) => {
  // 这里集成实际的搜索API
  // 为了演示，返回模拟数据
  return {
    query,
    results: [
      { title: '搜索结果1', snippet: '相关内容...', url: 'https://example.com/1' },
      { title: '搜索结果2', snippet: '相关内容...', url: 'https://example.com/2' }
    ],
    timestamp: new Date().toISOString()
  };
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('[smartChatWithSearch] Request started');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('[smartChatWithSearch] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { conversation_id, message, system_prompt, image_files } = await req.json();
    console.log('[smartChatWithSearch] User:', user.email, 'Message:', message?.slice(0, 50));
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // 步骤1：获取模型配置，检查是否启用智能搜索
    console.log('[smartChatWithSearch] Getting AI models...');
    const models = await base44.asServiceRole.entities.AIModel.filter({ is_active: true });
    if (models.length === 0) {
      throw new Error('No active AI models found');
    }
    
    // 优先使用默认模型或对话指定的模型
    let selectedModel = models.find(m => m.is_default) || models[0];
    
    if (conversation_id) {
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      if (convs.length > 0 && convs[0].model_id) {
        const convModel = models.find(m => m.id === convs[0].model_id);
        if (convModel) selectedModel = convModel;
      }
    }
    
    console.log('[smartChatWithSearch] Using model:', selectedModel.name, 'Web search enabled:', selectedModel.enable_web_search);
    
    // 步骤1.5：Token预算检查
    try {
      const budgetRes = await base44.functions.invoke('tokenBudgetManager', {
        conversation_id: conversation_id || 'temp',
        operation: 'check'
      });
      
      if (budgetRes.data?.budget?.is_exceeded) {
        console.log('[smartChatWithSearch] WARNING: Token budget exceeded');
      } else if (budgetRes.data?.budget?.should_warn) {
        console.log('[smartChatWithSearch] WARNING: Token budget at', budgetRes.data.budget.usage_percent);
      }
    } catch (e) {
      console.log('[smartChatWithSearch] Budget check skipped:', e.message);
    }
    
    // 步骤2：智能任务分类和模型选择
    let taskClassification = null;
    try {
      const classifyRes = await base44.functions.invoke('taskClassifier', {
        message,
        conversation_id
      });
      
      if (classifyRes.data && !classifyRes.data.error) {
        taskClassification = classifyRes.data;
        console.log('[smartChatWithSearch] Task classification:', taskClassification.task_type, 
                    '| Model:', taskClassification.recommended_model,
                    '| Complexity:', taskClassification.complexity_score);
        
        // 根据任务分类结果选择模型（如果有对应的AI模型）
        if (taskClassification.model_id) {
          const classifiedModel = models.find(m => 
            m.model_id === taskClassification.model_id || 
            m.model_id.includes(taskClassification.recommended_model)
          );
          if (classifiedModel && classifiedModel.is_active) {
            selectedModel = classifiedModel;
            console.log('[smartChatWithSearch] Switched to classified model:', selectedModel.name);
          }
        }
      }
    } catch (e) {
      console.log('[smartChatWithSearch] Task classification skipped:', e.message);
    }
    
    // 步骤3：简化的搜索判断（关键词匹配或URL检测）- 无论模型是否启用联网，都进行判断
    const lowerMessage = message.toLowerCase();
    const searchKeywords = [
      "天气", "股价", "汇率", "比赛", "新闻", "最新", "今天", "昨天", "现在", "当前",
      "近期", "帮我查", "搜索", "找一下", "谁是", "CEO", "总统", "总理", "价格",
      "多少钱", "排名", "评分", "weather", "stock", "price", "news", "latest", "today", "current",
      "search", "查询", "查一下"
    ];
    
    // URL 检测正则
    const hasUrl = /(https?:\/\/[^\s]+)/.test(message);
    const hasSearchKeyword = searchKeywords.some(kw => lowerMessage.includes(kw));
    const shouldSearch = hasSearchKeyword || hasUrl;
    
    let decision;
    if (shouldSearch && selectedModel.enable_web_search) {
      decision = {
        need_search: true,
        search_type: 'general',
        confidence: 0.9,
        reason: hasUrl ? '检测到URL链接' : '检测到搜索关键词',
        decision_level: 'keyword',
        decision_time_ms: 0,
        will_use_web_search: true
      };
      console.log('[smartChatWithSearch] ✓ Search enabled by', hasUrl ? 'URL detection' : 'keyword match');
    } else {
      decision = {
        need_search: false,
        search_type: 'none',
        confidence: 0.9,
        reason: shouldSearch ? 'Web search disabled in model settings' : '未检测到搜索关键词或URL',
        decision_level: 'keyword',
        decision_time_ms: 0,
        will_use_web_search: false
      };
      console.log('[smartChatWithSearch] ✗ Search disabled -', decision.reason);
    }
    
    let searchResults = null;
    let cacheHit = false;
    let searchCost = 0;
    
    // will_use_web_search 已在上面设置，这里不需要额外处理
    
    // 步骤3：构建消息（不需要额外处理，联网在callAIModel中启用）
    const enhancedMessage = message;
    
    // 步骤3.5：检查是否需要压缩历史
    let shouldCompress = false;
    let summaryToUse = null;
    
    if (conversation_id) {
      try {
        // 获取现有摘要
        const summaries = await base44.asServiceRole.entities.ConversationSummary.filter(
          { conversation_id },
          '-created_date',
          1
        );
        
        if (summaries.length > 0) {
          summaryToUse = summaries[0];
          console.log('[smartChatWithSearch] Found existing summary covering', summaryToUse.covered_messages, 'messages');
        }
      } catch (e) {
        console.log('[smartChatWithSearch] Summary fetch skipped:', e.message);
      }
    }
    
    // 步骤4：获取对话历史
    let conversation;
    let conversationMessages = [];
    
    if (conversation_id) {
      console.log('[smartChatWithSearch] Loading conversation:', conversation_id);
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      if (convs.length > 0) {
        conversation = convs[0];
        conversationMessages = conversation.messages || [];
        console.log('[smartChatWithSearch] Loaded', conversationMessages.length, 'messages from conversation');
        console.log('[smartChatWithSearch] Conversation has system_prompt:', !!conversation.system_prompt);
        if (conversation.system_prompt) {
          console.log('[smartChatWithSearch] WARNING: Conversation has saved system_prompt, tokens:', estimateTokens(conversation.system_prompt));
        }
      }
    } else {
      console.log('[smartChatWithSearch] New conversation, no history');
    }
    
    // 构建消息列表 - 使用摘要替换旧消息（如果存在）
    let apiMessages = [];
    
    if (summaryToUse && conversationMessages.length > 8) {
      // 有摘要且消息较多时，使用摘要 + 最近消息
      const coveredCount = summaryToUse.covered_messages * 2; // 转换为消息数（一问一答=2条）
      const recentMessages = conversationMessages.slice(coveredCount);
      
      // 添加摘要作为系统消息
      apiMessages.push({
        role: 'user',
        content: `[对话历史摘要 - 前${summaryToUse.covered_messages}轮]\n${summaryToUse.summary_text}`
      });
      
      // 添加最近的消息
      apiMessages.push(...recentMessages.map(m => ({
        role: m.role,
        content: m.content
      })));
      
      console.log('[smartChatWithSearch] Using summary + recent messages:', recentMessages.length);
    } else {
      // 没有摘要或消息较少，使用完整历史
      apiMessages = conversationMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
    }
    
    // 添加当前增强消息
    apiMessages.push({ role: 'user', content: enhancedMessage });
    
    // 计算token估算
    const estimateTokens = (text) => Math.ceil((text || '').length / 4);
    const totalTokens = apiMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0) + 
                        (system_prompt ? estimateTokens(system_prompt) : 0);
    
    console.log('[smartChatWithSearch] Calling AI model with', apiMessages.length, 'messages, estimated', totalTokens, 'tokens');
    console.log('[smartChatWithSearch] Message details:');
    apiMessages.forEach((m, i) => {
      const tokens = estimateTokens(m.content);
      console.log(`  [${i}] role=${m.role}, tokens=${tokens}, preview=${m.content.slice(0, 50)}...`);
    });
    
    // 系统提示词只在新对话的第一轮时使用（消息列表为空）
    // 如果有历史消息，说明不是第一轮，绝对不能使用 system_prompt
    // CRITICAL: 只有当 system_prompt 有实际内容时才使用
    const isFirstTurn = conversationMessages.length === 0;
    const hasValidSystemPrompt = system_prompt && system_prompt.trim().length > 0;
    const shouldUseSystemPrompt = isFirstTurn && !conversation && hasValidSystemPrompt;
    
    console.log('[smartChatWithSearch] ===== SYSTEM PROMPT DECISION =====');
    console.log('[smartChatWithSearch] isFirstTurn:', isFirstTurn, '(conversationMessages.length:', conversationMessages.length, ')');
    console.log('[smartChatWithSearch] conversation exists:', !!conversation);
    console.log('[smartChatWithSearch] system_prompt:', system_prompt ? `"${system_prompt.slice(0, 100)}..."` : 'null/undefined');
    console.log('[smartChatWithSearch] hasValidSystemPrompt:', hasValidSystemPrompt);
    console.log('[smartChatWithSearch] shouldUseSystemPrompt:', shouldUseSystemPrompt);
    
    if (shouldUseSystemPrompt) {
      console.log('[smartChatWithSearch] ✓ WILL USE system prompt, tokens:', estimateTokens(system_prompt));
    } else {
      console.log('[smartChatWithSearch] ✗ WILL NOT USE system prompt');
      if (system_prompt) {
        console.log('[smartChatWithSearch]   Reason: isFirstTurn=', isFirstTurn, 'conversation=', !!conversation);
      }
    }
    console.log('[smartChatWithSearch] ========================================');
    
    // 调用 AI 模型 - 启用联网搜索
    console.log('[smartChatWithSearch] === ABOUT TO CALL callAIModel ===');
    console.log('[smartChatWithSearch] Parameters:');
    console.log('[smartChatWithSearch]   - model_id:', selectedModel.id);
    console.log('[smartChatWithSearch]   - messages count:', apiMessages.length);
    console.log('[smartChatWithSearch]   - system_prompt:', shouldUseSystemPrompt ? `YES (${system_prompt.length} chars, ~${Math.ceil(system_prompt.length / 4)} tokens)` : 'NO');
    console.log('[smartChatWithSearch]   - force_web_search:', decision.will_use_web_search || false);
    if (shouldUseSystemPrompt && system_prompt) {
      console.log('[smartChatWithSearch]   - system_prompt preview:', system_prompt.slice(0, 200) + '...');
    }
    console.log('[smartChatWithSearch] === END PARAMETERS ===');
    
    const modelRes = await base44.functions.invoke('callAIModel', {
      model_id: selectedModel.id,
      messages: apiMessages,
      system_prompt: shouldUseSystemPrompt ? system_prompt : undefined,
      force_web_search: decision.will_use_web_search || false
    });
    
    if (!modelRes.data || modelRes.data.error) {
      throw new Error(modelRes.data?.error || 'AI model call failed');
    }
    
    const modelData = modelRes.data;
    console.log('[smartChatWithSearch] AI response received, web_search_used:', modelData.web_search_enabled);
    
    // 计算积分消耗（使用callAIModel返回的积分）
    const totalCredits = modelData.credits_used || 1;
    const inputTokens = modelData.input_tokens || 0;
    const outputTokens = modelData.output_tokens || 0;
    const inputCredits = modelData.input_credits || 0;
    const outputCredits = modelData.output_credits || 0;
    const webSearchUsed = modelData.web_search_enabled || false;
    
    // 步骤5：更新Token预算
    try {
      await base44.functions.invoke('tokenBudgetManager', {
        conversation_id: finalConversationId || conversation_id || 'temp',
        operation: 'consume',
        tokens: inputTokens + outputTokens
      });
    } catch (e) {
      console.log('[smartChatWithSearch] Budget update skipped:', e.message);
    }
    
    // 步骤6：检查是否需要触发压缩
    const messageCount = conversationMessages.length + 2; // +2 = 当前一问一答
    if (messageCount >= 16 && messageCount % 8 === 0) { // 每8轮检查一次
      console.log('[smartChatWithSearch] Triggering compression check for', messageCount / 2, 'rounds');
      try {
        // 异步触发压缩，不等待结果
        base44.functions.invoke('compressConversation', {
          conversation_id: finalConversationId || conversation_id,
          messages_to_compress: messageCount - 8 // 保留最近4轮
        }).catch(err => console.log('[smartChatWithSearch] Compression failed:', err.message));
      } catch (e) {
        console.log('[smartChatWithSearch] Compression trigger skipped:', e.message);
      }
    }
    
    // 更新或创建对话
    const newMessages = [
      ...conversationMessages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: modelData.response, timestamp: new Date().toISOString() }
    ];
    
    let finalConversationId = conversation_id;
    
    if (conversation) {
      console.log('[smartChatWithSearch] Updating conversation');
      await base44.asServiceRole.entities.Conversation.update(conversation.id, {
        messages: newMessages,
        total_credits_used: (conversation.total_credits_used || 0) + totalCredits,
        updated_date: new Date().toISOString()
      });
    } else {
      console.log('[smartChatWithSearch] Creating new conversation');
      const newConv = await base44.asServiceRole.entities.Conversation.create({
        title: message.slice(0, 50),
        model_id: selectedModel.id,
        messages: newMessages,
        total_credits_used: totalCredits
      });
      finalConversationId = newConv.id;
    }
    
    console.log('[smartChatWithSearch] Request completed successfully');
    
    return Response.json({
      conversation_id: finalConversationId,
      response: modelData.response,
      model_used: selectedModel.name,
      credits_used: totalCredits,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      input_credits: inputCredits,
      output_credits: outputCredits,
      search_info: {
        executed: webSearchUsed,
        cache_hit: false,
        cost: 0
      },
      task_classification: taskClassification,
      compression_used: !!summaryToUse
    });
    
  } catch (error) {
    console.error('[smartChatWithSearch] Error:', error);
    console.error('[smartChatWithSearch] Stack:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      time_ms: Date.now() - startTime
    }, { status: 500 });
  }
});