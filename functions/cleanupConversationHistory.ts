import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // 只允许管理员执行
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 获取所有会员等级配置
    const membershipPlans = await base44.asServiceRole.entities.MembershipPlan.list();
    
    // 获取所有用户
    const users = await base44.asServiceRole.entities.User.list();
    
    // 获取所有对话
    const conversations = await base44.asServiceRole.entities.Conversation.list();

    const now = new Date();
    let deletedCount = 0;
    const deletedDetails = [];

    // 按用户处理
    for (const targetUser of users) {
      const userTier = targetUser.subscription_tier || 'free';
      const plan = membershipPlans.find(p => p.level === userTier);
      
      // 默认保存天数：free=5天, pro=30天, gold=30天
      let retentionDays = 5;
      if (plan && plan.history_retention_days !== undefined) {
        retentionDays = plan.history_retention_days;
      } else if (userTier === 'pro' || userTier === 'gold') {
        retentionDays = 30;
      }

      // 计算过期日期
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() - retentionDays);

      // 找出该用户的过期对话
      const userConversations = conversations.filter(conv => 
        conv.created_by === targetUser.email &&
        new Date(conv.created_date) < expirationDate
      );

      // 删除过期对话
      for (const conv of userConversations) {
        await base44.asServiceRole.entities.Conversation.delete(conv.id);
        deletedCount++;
        deletedDetails.push({
          user: targetUser.email,
          conversation_id: conv.id,
          title: conv.title,
          created_date: conv.created_date
        });
      }
    }

    return Response.json({
      success: true,
      message: `清理完成，共删除 ${deletedCount} 条过期对话`,
      deleted_count: deletedCount,
      details: deletedDetails,
      executed_at: now.toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});