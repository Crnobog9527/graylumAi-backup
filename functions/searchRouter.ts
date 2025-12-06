import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 缓存有效期（分钟）
const CACHE_TTL_MINUTES = 15;
const SIMILARITY_THRESHOLD = 0.85;

// 计算余弦相似度
function cosineSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().match(/[\u4e00-\u9fa5a-z0-9]+/g) || [];
  const words2 = str2.toLowerCase().match(/[\u4e00-\u9fa5a-z0-9]+/g) || [];
  
  const allWords = [...new Set([...words1, ...words2])];
  const vector1 = allWords.map(w => words1.filter(x => x === w).length);
  const vector2 = allWords.map(w => words2.filter(x => x === w).length);
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const mag1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
}

// 生成查询哈希
function generateHash(text, searchType = 'general') {
  const normalized = text.toLowerCase().trim() + searchType;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      user_message,
      model_id,
      messages = [],
      system_prompt,
      conversation_history = [],
      force_search = false
    } = await req.json();

    if (!user_message || !model_id) {
      return Response.json({ 
        error: 'user_message and model_id are required' 
      }, { status: 400 });
    }

    // Step 1: 调用搜索分类器
    const classifierResult = await base44.functions.invoke('searchClassifier', {
      user_message,
      conversation_history,
      force_search
    });

    const decision = classifierResult.data;
    const queryHash = decision.query_hash;

    // Step 2: 检查配额（仅当需要搜索时）
    let quotaCheck = { allowed: true, message: 'Search not needed' };
    if (decision.need_search) {
      quotaCheck = (await base44.functions.invoke('quotaManager', {
        action: 'check',
        consume: false
      })).data;

      if (!quotaCheck.allowed) {
        // 配额不足，降级到不搜索
        decision.need_search = false;
        decision.reason = `Quota exceeded. ${quotaCheck.message}`;
        decision.quota_exceeded = true;
      }
    }

    let searchResults = null;
    let fromCache = false;
    let actualSearched = false;

    // Step 3: 如果需要搜索，检查缓存
    if (decision.need_search) {
      const now = new Date();
      
      // 查找缓存
      const cacheRecords = await base44.asServiceRole.entities.SearchCache.filter({
        query_hash: queryHash
      });

      if (cacheRecords.length > 0) {
        const cache = cacheRecords[0];
        const expiresAt = new Date(cache.expires_at);
        
        if (now < expiresAt) {
          // 缓存有效
          searchResults = JSON.parse(cache.search_results);
          fromCache = true;
          
          // 更新命中次数
          await base44.asServiceRole.entities.SearchCache.update(cache.id, {
            hit_count: cache.hit_count + 1
          });
        } else {
          // 缓存过期，删除
          await base44.asServiceRole.entities.SearchCache.delete(cache.id);
        }
      }

      // 如果没有缓存，检查相似查询
      if (!fromCache) {
        const recentCaches = await base44.asServiceRole.entities.SearchCache.filter({}, '-created_date', 50);
        
        for (const cache of recentCaches) {
          const expiresAt = new Date(cache.expires_at);
          if (now >= expiresAt) continue;
          
          const similarity = cosineSimilarity(user_message, cache.original_query);
          if (similarity >= SIMILARITY_THRESHOLD) {
            searchResults = JSON.parse(cache.search_results);
            fromCache = true;
            
            await base44.asServiceRole.entities.SearchCache.update(cache.id, {
              hit_count: cache.hit_count + 1
            });
            break;
          }
        }
      }

      // 如果没有缓存，执行实际搜索
      if (!fromCache) {
        // 消耗配额
        await base44.functions.invoke('quotaManager', {
          action: 'check',
          consume: true
        });

        // 执行搜索（使用 Core.InvokeLLM 的联网功能）
        const searchPrompt = `请搜索以下问题的最新信息：${user_message}`;
        searchResults = await base44.integrations.Core.InvokeLLM({
          prompt: searchPrompt,
          add_context_from_internet: true
        });

        actualSearched = true;

        // 保存到缓存
        const expiresAt = new Date(now.getTime() + CACHE_TTL_MINUTES * 60 * 1000);
        await base44.asServiceRole.entities.SearchCache.create({
          query_hash: queryHash,
          original_query: user_message,
          search_results: JSON.stringify(searchResults),
          search_type: decision.search_type,
          expires_at: expiresAt.toISOString(),
          hit_count: 0
        });
      }
    }

    // Step 4: 调用主模型
    const callModelPayload = {
      model_id,
      messages,
      system_prompt
    };

    // 如果有搜索结果，将其添加到上下文
    if (searchResults && decision.need_search) {
      const searchContext = `【搜索结果】\n${typeof searchResults === 'string' ? searchResults : JSON.stringify(searchResults, null, 2)}\n\n请基于以上搜索结果回答用户问题。`;
      
      callModelPayload.system_prompt = system_prompt 
        ? `${system_prompt}\n\n${searchContext}`
        : searchContext;
    }

    const modelResponse = await base44.functions.invoke('callAIModel', callModelPayload);

    // Step 5: 记录搜索决策
    await base44.asServiceRole.entities.SearchDecision.create({
      user_email: user.email,
      message: user_message,
      need_search: decision.need_search,
      confidence: decision.confidence,
      reason: decision.reason,
      search_type: decision.search_type,
      decision_layer: decision.decision_layer,
      actual_searched: actualSearched,
      cached_result: fromCache,
      cost: actualSearched ? 0.001 : 0, // 估算成本
      response_time: Date.now() - startTime
    });

    return Response.json({
      ...modelResponse.data,
      search_decision: {
        need_search: decision.need_search,
        confidence: decision.confidence,
        reason: decision.reason,
        search_type: decision.search_type,
        decision_layer: decision.decision_layer,
        from_cache: fromCache,
        actual_searched: actualSearched,
        quota_remaining: quotaCheck.remaining_hourly
      },
      response_time: Date.now() - startTime
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      response_time: Date.now() - startTime
    }, { status: 500 });
  }
});