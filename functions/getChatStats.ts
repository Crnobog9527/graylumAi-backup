import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversation_id');
    const timeRange = url.searchParams.get('time_range') || '7d'; // 7d, 30d, all
    
    // 计算时间范围
    let startDate = new Date(0);
    if (timeRange === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // 获取统计数据
    let filter = { user_email: user.email };
    if (conversationId) {
      filter.conversation_id = conversationId;
    }
    
    const stats = await base44.asServiceRole.entities.TokenStats.filter(filter);
    
    // 过滤时间范围
    const filteredStats = stats.filter(s => 
      new Date(s.created_date) >= startDate
    );
    
    // 聚合统计
    const summary = {
      total_requests: filteredStats.length,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cached_tokens: 0,
      total_cache_creation_tokens: 0,
      total_cost: 0,
      total_savings: 0,
      
      by_model: {},
      by_request_type: {
        simple: { count: 0, cost: 0 },
        complex: { count: 0, cost: 0 },
        compression: { count: 0, cost: 0 }
      },
      
      compression_events: 0,
      cache_hit_rate: 0,
      average_cost_per_request: 0
    };
    
    for (const stat of filteredStats) {
      summary.total_input_tokens += stat.input_tokens || 0;
      summary.total_output_tokens += stat.output_tokens || 0;
      summary.total_cached_tokens += stat.cached_tokens || 0;
      summary.total_cache_creation_tokens += stat.cache_creation_tokens || 0;
      summary.total_cost += stat.total_cost || 0;
      summary.total_savings += stat.cache_savings || 0;
      
      // 按模型统计
      const model = stat.model_used;
      if (!summary.by_model[model]) {
        summary.by_model[model] = {
          count: 0,
          input_tokens: 0,
          output_tokens: 0,
          cached_tokens: 0,
          cost: 0,
          savings: 0
        };
      }
      summary.by_model[model].count++;
      summary.by_model[model].input_tokens += stat.input_tokens || 0;
      summary.by_model[model].output_tokens += stat.output_tokens || 0;
      summary.by_model[model].cached_tokens += stat.cached_tokens || 0;
      summary.by_model[model].cost += stat.total_cost || 0;
      summary.by_model[model].savings += stat.cache_savings || 0;
      
      // 按请求类型统计
      const reqType = stat.request_type || 'simple';
      summary.by_request_type[reqType].count++;
      summary.by_request_type[reqType].cost += stat.total_cost || 0;
      
      if (stat.compression_triggered) {
        summary.compression_events++;
      }
    }
    
    // 计算缓存命中率
    const totalTokensProcessed = summary.total_input_tokens + summary.total_cached_tokens;
    if (totalTokensProcessed > 0) {
      summary.cache_hit_rate = ((summary.total_cached_tokens / totalTokensProcessed) * 100).toFixed(2);
    }
    
    // 计算平均成本
    if (summary.total_requests > 0) {
      summary.average_cost_per_request = (summary.total_cost / summary.total_requests).toFixed(6);
    }
    
    // 获取缓存状态（如果是单个对话）
    let cacheInfo = null;
    if (conversationId) {
      const cacheStates = await base44.asServiceRole.entities.ConversationCache.filter({
        conversation_id: conversationId
      });
      
      if (cacheStates.length > 0) {
        const cache = cacheStates[0];
        const isExpired = new Date(cache.expires_at) < new Date();
        
        cacheInfo = {
          is_active: !isExpired,
          system_prompt_cached: cache.system_prompt_cached,
          summary_cached: cache.summary_cached,
          cache_hit_count: cache.cache_hit_count,
          total_cached_tokens: cache.total_cached_tokens,
          last_cache_time: cache.last_cache_time,
          expires_at: cache.expires_at
        };
      }
      
      // 获取摘要信息
      const summaries = await base44.asServiceRole.entities.ConversationSummary.filter({
        conversation_id: conversationId
      });
      
      if (summaries.length > 0) {
        const latestSummary = summaries[summaries.length - 1];
        cacheInfo = {
          ...cacheInfo,
          summary: {
            covered_messages: latestSummary.covered_messages,
            summary_tokens: latestSummary.summary_tokens,
            compression_ratio: (latestSummary.compression_ratio * 100).toFixed(1) + '%',
            key_topics: latestSummary.key_topics || []
          }
        };
      }
    }
    
    return Response.json({
      time_range: timeRange,
      summary,
      cache_info: cacheInfo,
      recent_stats: filteredStats.slice(-10).reverse()
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});