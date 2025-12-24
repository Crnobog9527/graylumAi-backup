import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 完成邀请奖励发放（在用户完成邮箱验证后调用）
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: '未登录' }, { status: 401 });
    }

    // 查找该用户的待处理邀请记录
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ 
      invitee_email: user.email,
      status: 'pending'
    });

    if (invitations.length === 0) {
      return Response.json({ success: true, message: '无待处理的邀请奖励' });
    }

    const invitation = invitations[0];

    // 检查风险等级
    if (invitation.risk_level === 'high') {
      await base44.asServiceRole.entities.Invitation.update(invitation.id, {
        status: 'rejected',
        reject_reason: '高风险自动拒绝'
      });
      return Response.json({ success: false, message: '邀请奖励审核未通过' });
    }

    // 获取邀请人信息
    const inviters = await base44.asServiceRole.entities.User.filter({ 
      email: invitation.inviter_email 
    });
    
    if (inviters.length === 0) {
      return Response.json({ error: '邀请人不存在' }, { status: 400 });
    }

    const inviter = inviters[0];

    // 获取系统设置
    const settings = await base44.asServiceRole.entities.SystemSettings.list();
    const getSettingValue = (key, defaultValue) => {
      const setting = settings.find(s => s.setting_key === key);
      return setting ? setting.setting_value : defaultValue;
    };

    const dailyLimit = parseInt(getSettingValue('invite_daily_reward_limit', '1000')) || 1000;
    const totalLimit = parseInt(getSettingValue('invite_total_reward_limit', '50000')) || 50000;

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // 计算实际可发放的奖励
    let actualInviterReward = invitation.inviter_reward || 0;
    
    // 检查今日限制
    const todayRewards = inviter.invite_rewards_today_date === today 
      ? (inviter.invite_rewards_today || 0) 
      : 0;
    if (todayRewards + actualInviterReward > dailyLimit) {
      actualInviterReward = Math.max(0, dailyLimit - todayRewards);
    }

    // 检查总限制
    const totalRewards = inviter.invite_rewards_total || 0;
    if (totalRewards + actualInviterReward > totalLimit) {
      actualInviterReward = Math.max(0, totalLimit - totalRewards);
    }

    // 发放邀请人奖励
    if (actualInviterReward > 0) {
      const newInviterBalance = (inviter.credits || 0) + actualInviterReward;
      
      // 更新邀请人统计
      const updateData = {
        credits: newInviterBalance,
        invite_count: (inviter.invite_count || 0) + 1,
        invite_rewards_total: (inviter.invite_rewards_total || 0) + actualInviterReward,
        invite_rewards_today: inviter.invite_rewards_today_date === today 
          ? (inviter.invite_rewards_today || 0) + actualInviterReward 
          : actualInviterReward,
        invite_rewards_today_date: today,
        invite_count_this_month: inviter.invite_count_month === currentMonth 
          ? (inviter.invite_count_this_month || 0) + 1 
          : 1,
        invite_count_month: currentMonth,
      };

      await base44.asServiceRole.entities.User.update(inviter.id, updateData);

      // 创建邀请人积分交易记录
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: inviter.email,
        type: 'bonus',
        amount: actualInviterReward,
        balance_after: newInviterBalance,
        description: `邀请好友奖励 - 邀请 ${user.email}`,
      });
    }

    // 发放被邀请人奖励
    const inviteeReward = invitation.invitee_reward || 0;
    if (inviteeReward > 0) {
      const newInviteeBalance = (user.credits || 0) + inviteeReward;
      
      await base44.auth.updateMe({
        credits: newInviteeBalance,
        invited_by: inviter.email,
      });

      // 创建被邀请人积分交易记录
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: user.email,
        type: 'bonus',
        amount: inviteeReward,
        balance_after: newInviteeBalance,
        description: `新用户邀请奖励 - 被 ${inviter.email} 邀请`,
      });
    }

    // 更新邀请记录状态
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'rewarded',
      inviter_reward: actualInviterReward,
    });

    return Response.json({ 
      success: true, 
      inviter_reward: actualInviterReward,
      invitee_reward: inviteeReward,
    });

  } catch (error) {
    console.error('发放邀请奖励失败:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});