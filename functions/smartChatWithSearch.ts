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
    
    const { conversation_id, message, system_prompt } = await req.json();
    console.log('[smartChatWithSearch] User:', user.email, 'Message:', message?.slice(0, 50));
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const startTime = Date.now();
    
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
    
    // 步骤2：只有当模型启用了联网搜索时，才调用智能搜索判断系统
    let decision = { need_search: false, search_type: 'none', confidence: 0, reason: 'Web search disabled in model settings', decision_level: 'none', decision_time_ms: 0, decision_id: null };
    
    if (selectedModel.enable_web_search) {
      try {
        console.log('[smartChatWithSearch] Calling search classifier...');
        const classifierRes = await base44.functions.invoke('searchClassifier', {
          message,
          conversation_id,
          context: null
        });
        decision = classifierRes.data;
        console.log('[smartChatWithSearch] Search decision:', decision.need_search, decision.search_type);
      } catch (error) {
        console.log('[smartChatWithSearch] Search classifier not available:', error.message);
      }
    } else {
      console.log('[smartChatWithSearch] Web search disabled, skipping search classifier');
    }
    
    let searchResults = null;
    let cacheHit = false;
    let searchCost = 0;
    
    // 步骤2：如果需要搜索，检查缓存
    if (decision.need_search && decision.search_type !== 'none') {
      searchResults = await checkCache(message, decision.search_type, base44);
      
      if (searchResults) {
        cacheHit = true;
        console.log('Cache hit for query:', message);
      } else {
        // 执行实际搜索
        try {
          searchResults = await executeSearch(message, decision.search_type);
          searchCost = WEB_SEARCH_COST;
          
          // 保存到缓存
          await saveCache(message, decision.search_type, searchResults, base44);
          
          console.log('Search executed and cached:', message);
        } catch (error) {
          console.error('Search execution failed:', error);
          // 降级：不使用搜索结果
          searchResults = null;
        }
      }
    }
    
    // 步骤3：构建增强的提示词
    let enhancedMessage = message;
    if (searchResults) {
      const searchContext = `\n\n<search_results>\n搜索结果（${searchResults.timestamp}）：\n${
        searchResults.results.map((r, i) => 
          `${i + 1}. ${r.title}\n   ${r.snippet}\n   来源: ${r.url}`
        ).join('\n\n')
      }\n</search_results>\n\n基于以上搜索结果，请回答：${message}`;
      
      enhancedMessage = searchContext;
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
      }
    }
    
    // 构建消息列表
    const apiMessages = conversationMessages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // 添加当前增强消息
    apiMessages.push({ role: 'user', content: enhancedMessage });
    
    console.log('[smartChatWithSearch] Calling AI model with', apiMessages.length, 'messages');
    
    // 系统提示词只在新对话的第一轮使用，已有对话不再使用
    const shouldUseSystemPrompt = !conversation && system_prompt;
    
    // 调用 AI 模型
    const modelRes = await base44.functions.invoke('callAIModel', {
      model_id: selectedModel.id,
      messages: apiMessages,
      system_prompt: shouldUseSystemPrompt ? system_prompt : undefined
    });
    
    if (!modelRes.data || modelRes.data.error) {
      throw new Error(modelRes.data?.error || 'AI model call failed');
    }
    
    const modelData = modelRes.data;
    console.log('[smartChatWithSearch] AI response received');
    
    // 计算积分消耗（整合搜索成本）
    const inputCreditsPerK = 1;
    const outputCreditsPerK = 5;
    
    const inputTokens = modelData.input_tokens || 0;
    const outputTokens = modelData.output_tokens || 0;
    const inputCredits = Math.ceil(inputTokens / 1000) * inputCreditsPerK;
    const outputCredits = Math.ceil(outputTokens / 1000) * outputCreditsPerK;
    const searchCredits = searchCost > 0 ? 5 : 0;
    const totalCredits = inputCredits + outputCredits + searchCredits;
    
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
        system_prompt: system_prompt,
        messages: newMessages,
        total_credits_used: totalCredits
      });
      finalConversationId = newConv.id;
    }
    
    // 步骤5：更新搜索决策记录
    if (decision.decision_id) {
      try {
        const decisions = await base44.asServiceRole.entities.SearchDecision.filter({
          id: decision.decision_id
        });
        
        if (decisions.length > 0) {
          await base44.asServiceRole.entities.SearchDecision.update(decisions[0].id, {
            search_executed: !!searchResults,
            cache_hit: cacheHit,
            search_cost: searchCost
          });
        }
      } catch (error) {
        console.log('Failed to update search decision:', error.message);
      }
    }
    
    // 步骤6：更新每日统计
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = await base44.asServiceRole.entities.SearchStatistics.filter({ date: today });
      
      if (stats.length > 0) {
        const stat = stats[0];
        const updates = {
          search_triggered: (stat.search_triggered || 0) + (decision.need_search ? 1 : 0),
          cache_hits: (stat.cache_hits || 0) + (cacheHit ? 1 : 0),
          total_search_cost: (stat.total_search_cost || 0) + searchCost,
          total_cost_saved: (stat.total_cost_saved || 0) + (cacheHit ? WEB_SEARCH_COST : 0)
        };
        
        // 计算触发率和命中率
        const totalReq = stat.total_requests || 1;
        const searchTrig = updates.search_triggered;
        const cacheH = updates.cache_hits;
        
        updates.search_trigger_rate = (searchTrig / totalReq) * 100;
        updates.cache_hit_rate = searchTrig > 0 ? (cacheH / searchTrig) * 100 : 0;
        
        await base44.asServiceRole.entities.SearchStatistics.update(stat.id, updates);
      }
    } catch (error) {
      console.log('Failed to update search statistics:', error.message);
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
      search_decision: {
        need_search: decision.need_search,
        confidence: decision.confidence,
        reason: decision.reason,
        search_type: decision.search_type,
        decision_level: decision.decision_level,
        decision_time_ms: decision.decision_time_ms
      },
      search_info: searchResults ? {
        executed: true,
        cache_hit: cacheHit,
        cost: searchCost,
        results_count: searchResults.results.length
      } : {
        executed: false,
        cache_hit: false,
        cost: 0
      }
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