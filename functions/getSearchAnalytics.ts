import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const timeRange = url.searchParams.get('range') || '7d';
    const isAdmin = user.role === 'admin';
    
    // 计算时间范围
    let days = 7;
    if (timeRange === '30d') days = 30;
    if (timeRange === 'all') days = 365;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // 获取统计数据
    const allStats = await base44.asServiceRole.entities.SearchStatistics.list();
    const stats = allStats.filter(s => s.date >= startDateStr);
    
    // 聚合数据
    const summary = {
      time_range: timeRange,
      period_days: days,
      total_requests: 0,
      search_triggered: 0,
      cache_hits: 0,
      keyword_decisions: 0,
      haiku_decisions: 0,
      context_decisions: 0,
      total_search_cost: 0,
      total_cost_saved: 0,
      avg_decision_time_ms: 0,
      search_trigger_rate: 0,
      cache_hit_rate: 0,
      cost_reduction_rate: 0
    };
    
    let totalDecisionTime = 0;
    
    for (const stat of stats) {
      summary.total_requests += stat.total_requests || 0;
      summary.search_triggered += stat.search_triggered || 0;
      summary.cache_hits += stat.cache_hits || 0;
      summary.keyword_decisions += stat.keyword_decisions || 0;
      summary.haiku_decisions += stat.haiku_decisions || 0;
      summary.context_decisions += stat.context_decisions || 0;
      summary.total_search_cost += stat.total_search_cost || 0;
      summary.total_cost_saved += stat.total_cost_saved || 0;
      totalDecisionTime += (stat.avg_decision_time_ms || 0) * (stat.total_requests || 0);
    }
    
    // 计算平均值和比率
    if (summary.total_requests > 0) {
      summary.search_trigger_rate = ((summary.search_triggered / summary.total_requests) * 100).toFixed(2);
      summary.avg_decision_time_ms = Math.round(totalDecisionTime / summary.total_requests);
    }
    
    if (summary.search_triggered > 0) {
      summary.cache_hit_rate = ((summary.cache_hits / summary.search_triggered) * 100).toFixed(2);
    }
    
    const totalWouldBeCost = summary.search_triggered * 0.005;
    if (totalWouldBeCost > 0) {
      summary.cost_reduction_rate = ((summary.total_cost_saved / totalWouldBeCost) * 100).toFixed(2);
    }
    
    // 按天统计
    const dailyStats = stats.map(s => ({
      date: s.date,
      requests: s.total_requests || 0,
      searches: s.search_triggered || 0,
      cache_hits: s.cache_hits || 0,
      trigger_rate: s.search_trigger_rate || 0,
      cache_hit_rate: s.cache_hit_rate || 0,
      cost: s.total_search_cost || 0,
      saved: s.total_cost_saved || 0
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // 决策级别分布
    const decisionDistribution = {
      keyword: summary.keyword_decisions,
      haiku: summary.haiku_decisions,
      context: summary.context_decisions,
      total: summary.keyword_decisions + summary.haiku_decisions + summary.context_decisions
    };
    
    if (decisionDistribution.total > 0) {
      decisionDistribution.keyword_pct = ((decisionDistribution.keyword / decisionDistribution.total) * 100).toFixed(2);
      decisionDistribution.haiku_pct = ((decisionDistribution.haiku / decisionDistribution.total) * 100).toFixed(2);
      decisionDistribution.context_pct = ((decisionDistribution.context / decisionDistribution.total) * 100).toFixed(2);
    }
    
    // 获取用户专属数据
    let userStats = null;
    if (!isAdmin) {
      const userDecisions = await base44.asServiceRole.entities.SearchDecision.filter({
        user_email: user.email
      });
      
      const userSearches = userDecisions.filter(d => d.search_executed);
      const userCacheHits = userDecisions.filter(d => d.cache_hit);
      
      userStats = {
        total_queries: userDecisions.length,
        searches_triggered: userSearches.length,
        cache_hits: userCacheHits.length,
        total_cost: userSearches.reduce((sum, d) => sum + (d.search_cost || 0), 0).toFixed(6),
        cost_saved: userCacheHits.reduce((sum, d) => sum + 0.005, 0).toFixed(6)
      };
    }
    
    // 获取最近的搜索决策示例（仅管理员）
    let recentDecisions = [];
    if (isAdmin) {
      const decisions = await base44.asServiceRole.entities.SearchDecision.filter({}, '-created_date', 20);
      recentDecisions = decisions.map(d => ({
        id: d.id,
        user: d.user_email,
        message: d.user_message.slice(0, 50) + '...',
        need_search: d.need_search,
        confidence: d.confidence,
        decision_level: d.decision_level,
        search_executed: d.search_executed,
        cache_hit: d.cache_hit,
        decision_time_ms: d.decision_time_ms,
        created_at: d.created_date
      }));
    }
    
    // 获取搜索类型分布（仅管理员）
    let searchTypeDistribution = null;
    if (isAdmin) {
      const allDecisions = await base44.asServiceRole.entities.SearchDecision.filter({
        need_search: true
      });
      
      const types = {};
      for (const d of allDecisions) {
        types[d.search_type] = (types[d.search_type] || 0) + 1;
      }
      
      searchTypeDistribution = types;
    }
    
    return Response.json({
      summary,
      daily_stats: dailyStats,
      decision_distribution: decisionDistribution,
      search_type_distribution: searchTypeDistribution,
      user_stats: userStats,
      recent_decisions: recentDecisions,
      performance_metrics: {
        avg_decision_time: `${summary.avg_decision_time_ms}ms`,
        target_trigger_rate: '15-25%',
        actual_trigger_rate: `${summary.search_trigger_rate}%`,
        target_cache_hit_rate: '>40%',
        actual_cache_hit_rate: `${summary.cache_hit_rate}%`,
        cost_reduction: `${summary.cost_reduction_rate}%`
      }
    });
    
  } catch (error) {
    console.error('Get search analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});