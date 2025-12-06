import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 清理过期缓存的定时任务
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // 只允许管理员或系统调用
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const now = new Date().toISOString();
    
    // 获取所有缓存记录
    const allCaches = await base44.asServiceRole.entities.SearchCache.list();
    
    let deletedCount = 0;
    let totalSavings = 0;
    
    for (const cache of allCaches) {
      if (cache.expires_at && cache.expires_at < now) {
        totalSavings += cache.cost_saved || 0;
        await base44.asServiceRole.entities.SearchCache.delete(cache.id);
        deletedCount++;
      }
    }
    
    // 同时清理30天前的搜索决策记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldDecisions = await base44.asServiceRole.entities.SearchDecision.filter({});
    
    let decisionsDeleted = 0;
    for (const decision of oldDecisions) {
      if (new Date(decision.created_date) < thirtyDaysAgo) {
        await base44.asServiceRole.entities.SearchDecision.delete(decision.id);
        decisionsDeleted++;
      }
    }
    
    // 清理60天前的统计数据
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];
    
    const oldStats = await base44.asServiceRole.entities.SearchStatistics.filter({});
    let statsDeleted = 0;
    
    for (const stat of oldStats) {
      if (stat.date < sixtyDaysAgoStr) {
        await base44.asServiceRole.entities.SearchStatistics.delete(stat.id);
        statsDeleted++;
      }
    }
    
    return Response.json({
      success: true,
      cleanup_summary: {
        expired_caches_deleted: deletedCount,
        old_decisions_deleted: decisionsDeleted,
        old_stats_deleted: statsDeleted,
        total_savings_from_deleted_caches: totalSavings.toFixed(6),
        cleanup_time: new Date().toISOString()
      },
      remaining: {
        active_caches: allCaches.length - deletedCount,
        recent_decisions: oldDecisions.length - decisionsDeleted,
        stats_records: oldStats.length - statsDeleted
      }
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});