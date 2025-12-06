import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Token估算函数
const estimateTokens = (text) => Math.ceil((text || '').length / 4);

// 计算字符串hash
const hashString = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 判断是否需要联网搜索
const shouldUseWebSearch = (userMessage, conversationHistory) => {
  const message = userMessage.toLowerCase();
  
  // 强制触发关键词
  const forceSearchKeywords = [
    '今天', '昨天', '最新', '现在', '当前', '近期', '2024年', '2025年',
    '天气', '股价', '汇率', '新闻', '比赛', '帮我查', '搜索', '联网'
  ];
  
  if (forceSearchKeywords.some(keyword => message.includes(keyword))) {
    return { shouldSearch: true, confidence: 1.0, reason: '明确的实时信息请求' };
  }
  
  // 不需要联网的场景
  const noSearchPatterns = [
    { pattern: /如何|怎么|怎样|为什么/, desc: '方法指导' },
    { pattern: /是什么|什么是|解释|定义/, desc: '概念解释' },
    { pattern: /帮我写|生成|创作/, desc: '创作任务' },
    { pattern: /^.{0,20}$/, desc: '短对话' }
  ];
  
  for (const { pattern, desc } of noSearchPatterns) {
    if (pattern.test(message)) {
      return { shouldSearch: false, confidence: 0, reason: desc };
    }
  }
  
  // 智能评分模型
  let score = 0;
  const factors = [];
  
  // 具体日期/时间
  if (/\d{4}年|\d+月\d+日|今年|去年/.test(message)) {
    score += 0.4;
    factors.push('包含具体时间');
  }
  
  // 市场/金融/政治话题
  if (/价格|股票|政策|选举|公司|CEO/.test(message)) {
    score += 0.3;
    factors.push('涉及时效性话题');
  }
  
  // 质疑词
  if (/真的吗|确定吗|是真的|可靠吗/.test(message)) {
    score += 0.2;
    factors.push('包含质疑词');
  }
  
  const shouldSearch = score >= 0.6;
  return {
    shouldSearch,
    confidence: score,
    reason: shouldSearch ? factors.join('、') : '基于训练数据可以回答'
  };
};

// 判断是否需要创建缓存断点
const shouldCreateCheckpoint = (messages) => {
  if (messages.length < 6) return false;
  
  const recent = messages.slice(-6);
  const oldTokens = recent.slice(0, 3).reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const newTokens = recent.slice(3).reduce((sum, m) => sum + estimateTokens(m.content), 0);
  
  // 累计新增内容达到800 tokens
  if (newTokens > 800) return true;
  
  // 检查话题转换（简化版：检查关键词变化）
  const oldKeywords = new Set(recent.slice(0, 3).map(m => m.content.slice(0, 20)));
  const newKeywords = new Set(recent.slice(3).map(m => m.content.slice(0, 20)));
  const overlap = [...oldKeywords].filter(k => newKeywords.has(k)).length;
  const similarity = overlap / Math.max(oldKeywords.size, newKeywords.size);
  
  if (similarity < 0.3) return true;
  
  return false;
};

// 生成轻量摘要（每3轮）
const generateLightweightSummary = async (messages, haikuModel) => {
  const recentMessages = messages.slice(-6);
  const content = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  
  const summaryPrompt = `请为以下对话生成结构化摘要，格式如下：
讨论主题：[主题]
已解决问题：[问题列表]
待处理问题：[问题列表]
用户偏好：[偏好描述]
关键信息：[重要信息点]

对话内容：
${content}`;

  try {
    const { data } = await base44.integrations.Core.InvokeLLM({
      prompt: summaryPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          resolved: { type: 'array', items: { type: 'string' } },
          pending: { type: 'array', items: { type: 'string' } },
          preferences: { type: 'string' },
          key_points: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    
    return data;
  } catch (e) {
    console.error('生成摘要失败:', e);
    return null;
  }
};

// 检查搜索缓存
const checkSearchCache = async (base44, queryText) => {
  const queryHash = await hashString(queryText);
  
  try {
    const caches = await base44.asServiceRole.entities.SearchCache.filter({ query_hash: queryHash });
    if (caches.length > 0) {
      const cache = caches[0];
      const expiresAt = new Date(cache.expires_at);
      if (expiresAt > new Date()) {
        return cache.search_result;
      }
    }
  } catch (e) {
    console.error('查询缓存失败:', e);
  }
  
  return null;
};

// 保存搜索缓存
const saveSearchCache = async (base44, queryText, result, cacheType) => {
  const queryHash = await hashString(queryText);
  
  const expiresMap = {
    'no_cache': 0,
    'short': 6 * 60 * 60 * 1000, // 6小时
    'medium': 24 * 60 * 60 * 1000, // 1天
    'long': 3 * 24 * 60 * 60 * 1000 // 3天
  };
  
  if (cacheType === 'no_cache') return;
  
  const expiresAt = new Date(Date.now() + expiresMap[cacheType]);
  
  try {
    await base44.asServiceRole.entities.SearchCache.create({
      query_hash: queryHash,
      query_text: queryText,
      search_result: result,
      cache_type: cacheType,
      expires_at: expiresAt.toISOString()
    });
  } catch (e) {
    console.error('保存缓存失败:', e);
  }
};

// 确定缓存类型
const determineCacheType = (queryText) => {
  const query = queryText.toLowerCase();
  
  if (/天气|股价|汇率/.test(query)) return 'no_cache';
  if (/新闻|产品/.test(query)) return 'short';
  if (/论文|政策|文件/.test(query)) return 'long';
  return 'medium';
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { conversation_id, model_id, messages, system_prompt } = await req.json();
    
    // 获取AI模型配置
    const model = await base44.asServiceRole.entities.AIModel.get(model_id);
    if (!model || !model.is_active) {
      return Response.json({ error: '模型不可用' }, { status: 400 });
    }
    
    // 获取对话历史
    let conversation = null;
    let conversationMessages = messages || [];
    
    if (conversation_id) {
      try {
        conversation = await base44.asServiceRole.entities.Conversation.get(conversation_id);
        conversationMessages = conversation.messages || [];
      } catch (e) {
        console.log('对话不存在，使用传入的消息');
      }
    }
    
    const userMessage = conversationMessages[conversationMessages.length - 1]?.content || '';
    
    // 判断是否需要联网搜索
    const searchDecision = shouldUseWebSearch(userMessage, conversationMessages);
    let webSearchResult = null;
    let webSearchUsed = false;
    
    if (model.enable_web_search && searchDecision.shouldSearch) {
      // 检查缓存
      const cachedResult = await checkSearchCache(base44, userMessage);
      
      if (cachedResult) {
        webSearchResult = cachedResult;
        webSearchUsed = true;
      } else {
        // 执行联网搜索
        try {
          const searchResponse = await base44.integrations.Core.InvokeLLM({
            prompt: userMessage,
            add_context_from_internet: true
          });
          
          webSearchResult = searchResponse;
          webSearchUsed = true;
          
          // 保存到缓存
          const cacheType = determineCacheType(userMessage);
          await saveSearchCache(base44, userMessage, JSON.stringify(searchResponse), cacheType);
        } catch (e) {
          console.error('联网搜索失败:', e);
        }
      }
    }
    
    // 检查是否需要生成摘要
    let summaryContext = '';
    if (conversationMessages.length > 0 && conversationMessages.length % 6 === 0) {
      const summary = await generateLightweightSummary(conversationMessages, model);
      if (summary) {
        summaryContext = `\n\n【对话摘要】\n主题：${summary.topic}\n已解决：${summary.resolved.join('、')}\n待处理：${summary.pending.join('、')}\n`;
        
        // 保存摘要到数据库
        if (conversation_id) {
          try {
            await base44.asServiceRole.entities.ConversationSummary.create({
              conversation_id,
              summary_type: 'lightweight',
              summary_content: JSON.stringify(summary),
              topic: summary.topic,
              resolved_issues: summary.resolved,
              pending_issues: summary.pending,
              user_preferences: summary.preferences,
              key_entities: summary.key_points,
              start_message_index: Math.max(0, conversationMessages.length - 6),
              end_message_index: conversationMessages.length - 1,
              token_count: estimateTokens(conversationMessages.slice(-6).map(m => m.content).join('')),
              compressed_token_count: estimateTokens(JSON.stringify(summary))
            });
          } catch (e) {
            console.error('保存摘要失败:', e);
          }
        }
      }
    }
    
    // 构建最终消息列表（智能压缩）
    let finalMessages = [];
    if (conversationMessages.length > 10) {
      // 保留最近5轮完整对话
      const recentMessages = conversationMessages.slice(-10);
      finalMessages = recentMessages;
      
      // 添加摘要上下文
      if (summaryContext) {
        finalMessages.unshift({
          role: 'assistant',
          content: summaryContext
        });
      }
    } else {
      finalMessages = conversationMessages;
    }
    
    // 添加联网搜索结果
    let enhancedSystemPrompt = system_prompt || '';
    if (webSearchUsed && webSearchResult) {
      enhancedSystemPrompt += `\n\n【最新信息】(已为用户查询最新信息)\n${JSON.stringify(webSearchResult)}`;
    }
    
    // 调用AI模型
    const aiResponse = await base44.functions.invoke('callAIModel', {
      model_id: model_id,
      messages: finalMessages,
      system_prompt: enhancedSystemPrompt
    });
    
    return Response.json({
      ...aiResponse.data,
      search_decision: searchDecision,
      web_search_used: webSearchUsed,
      summary_generated: !!summaryContext
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});