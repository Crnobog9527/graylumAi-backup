import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invitee_email, invite_code, register_ip, device_fingerprint } = await req.json();

    if (!invitee_email || !invite_code) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 使用service role操作
    const serviceBase44 = base44.asServiceRole;

    // 获取系统设置
    const settings = await serviceBase44.entities.SystemSettings.list();
    const getSettingValue = (key, defaultValue) => {
      const setting = settings.find(s => s.setting_key === key);
      return setting ? setting.setting_value : defaultValue;
    };

    const referrerBonus = parseInt(getSettingValue('referrer_bonus', '50'));
    const refereeBonus = parseInt(getSettingValue('referee_bonus', '50'));
    const bindingDays = parseInt(getSettingValue('referral_binding_days', '30'));
    const dailyRewardLimit = parseInt(getSettingValue('daily_invite_reward_limit', '1000'));
    const monthlyInviteLimit = parseInt(getSettingValue('monthly_invite_limit', '50'));
    const totalRewardLimit = parseInt(getSettingValue('total_invite_reward_limit', '50000'));
    const enableRiskControl = getSettingValue('enable_invite_risk_control', 'true') === 'true';
    const ipHourlyLimit = parseInt(getSettingValue('ip_hourly_register_limit', '3'));
    const ipDailyLimit = parseInt(getSettingValue('ip_daily_register_limit', '5'));

    // 查找邀请人
    const users = await serviceBase44.entities.User.filter({ invite_code: invite_code });
    if (users.length === 0) {
      return Response.json({ error: '无效的邀请码' }, { status: 400 });
    }
    const inviter = users[0];

    // 检查被邀请人是否已被邀请过
    const existingInvitations = await serviceBase44.entities.InvitationRecord.filter({
      invitee_email: invitee_email
    });
    if (existingInvitations.length > 0) {
      return Response.json({ error: '该用户已被邀请过' }, { status: 400 });
    }

    // 风控检查
    let riskLevel = 'low';
    const riskReasons = [];
    let rewardBlocked = false;
    let blockReason = '';

    if (enableRiskControl) {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // 检查IP限制
      if (register_ip) {
        // 检查同IP一小时内注册数
        const recentIpRegistrations = await serviceBase44.entities.InvitationRecord.filter({
          register_ip: register_ip
        });
        const hourlyCount = recentIpRegistrations.filter(r => 
          new Date(r.created_date) > new Date(oneHourAgo)
        ).length;
        
        if (hourlyCount >= ipHourlyLimit) {
          riskLevel = 'high';
          riskReasons.push(`同IP一小时内注册${hourlyCount}次`);
          rewardBlocked = true;
          blockReason = '同IP注册频率过高';
        }

        // 检查同IP 24小时内注册数
        const dailyCount = recentIpRegistrations.filter(r => {
          const regDate = new Date(r.created_date).toISOString().split('T')[0];
          return regDate === today;
        }).length;
        
        if (dailyCount >= ipDailyLimit) {
          riskLevel = 'high';
          riskReasons.push(`同IP今日已注册${dailyCount}次`);
          rewardBlocked = true;
          blockReason = '同IP每日注册超限';
        }

        // 检查邀请人与被邀请人IP是否相同
        if (inviter.register_ip === register_ip) {
          riskLevel = 'high';
          riskReasons.push('邀请人与被邀请人IP相同');
          rewardBlocked = true;
          blockReason = '疑似自邀请';
        }
      }

      // 检查设备指纹
      if (device_fingerprint && inviter.device_fingerprint === device_fingerprint) {
        riskLevel = 'high';
        riskReasons.push('设备指纹与邀请人相同');
        rewardBlocked = true;
        blockReason = '疑似同设备注册';
      }

      // 检查邀请人每日奖励上限
      if (inviter.last_invite_date === today && (inviter.daily_invite_rewards || 0) >= dailyRewardLimit) {
        riskLevel = 'medium';
        riskReasons.push('邀请人今日奖励已达上限');
        rewardBlocked = true;
        blockReason = '每日奖励上限';
      }

      // 检查邀请人每月邀请上限
      if (inviter.last_invite_month === currentMonth && (inviter.monthly_invite_count || 0) >= monthlyInviteLimit) {
        riskLevel = 'medium';
        riskReasons.push('邀请人本月邀请已达上限');
        rewardBlocked = true;
        blockReason = '每月邀请上限';
      }

      // 检查总奖励上限
      if ((inviter.total_invite_rewards || 0) >= totalRewardLimit) {
        riskLevel = 'medium';
        riskReasons.push('邀请人总奖励已达上限');
        rewardBlocked = true;
        blockReason = '总奖励上限';
      }
    }

    // 计算绑定期过期时间
    const bindingExpiresAt = new Date();
    bindingExpiresAt.setDate(bindingExpiresAt.getDate() + bindingDays);

    // 创建邀请记录
    const invitationRecord = await serviceBase44.entities.InvitationRecord.create({
      inviter_email: inviter.email,
      invitee_email: invitee_email,
      invite_code: invite_code,
      status: rewardBlocked ? 'rejected' : 'registered',
      inviter_reward: rewardBlocked ? 0 : referrerBonus,
      invitee_reward: rewardBlocked ? 0 : refereeBonus,
      binding_expires_at: bindingExpiresAt.toISOString(),
      register_ip: register_ip,
      device_fingerprint: device_fingerprint,
      risk_level: riskLevel,
      risk_reasons: riskReasons,
      reward_blocked: rewardBlocked,
      block_reason: blockReason
    });

    // 如果奖励未被拦截，发放奖励
    if (!rewardBlocked) {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      // 更新邀请人数据
      const inviterNewCredits = (inviter.credits || 0) + referrerBonus;
      const inviterDailyRewards = inviter.last_invite_date === today 
        ? (inviter.daily_invite_rewards || 0) + referrerBonus 
        : referrerBonus;
      const inviterMonthlyCount = inviter.last_invite_month === currentMonth
        ? (inviter.monthly_invite_count || 0) + 1
        : 1;

      await serviceBase44.entities.User.update(inviter.id, {
        credits: inviterNewCredits,
        total_invites: (inviter.total_invites || 0) + 1,
        total_invite_rewards: (inviter.total_invite_rewards || 0) + referrerBonus,
        daily_invite_rewards: inviterDailyRewards,
        daily_invite_count: inviter.last_invite_date === today 
          ? (inviter.daily_invite_count || 0) + 1 
          : 1,
        monthly_invite_count: inviterMonthlyCount,
        last_invite_date: today,
        last_invite_month: currentMonth
      });

      // 创建邀请人积分交易记录
      await serviceBase44.entities.CreditTransaction.create({
        user_email: inviter.email,
        type: 'bonus',
        amount: referrerBonus,
        balance_after: inviterNewCredits,
        description: `邀请好友 ${invitee_email} 注册奖励`
      });

      // 更新邀请记录状态为已发放
      await serviceBase44.entities.InvitationRecord.update(invitationRecord.id, {
        status: 'rewarded'
      });

      return Response.json({
        success: true,
        inviter_reward: referrerBonus,
        invitee_reward: refereeBonus,
        binding_expires_at: bindingExpiresAt.toISOString(),
        message: '邀请奖励发放成功'
      });
    } else {
      return Response.json({
        success: false,
        reward_blocked: true,
        block_reason: blockReason,
        risk_level: riskLevel,
        message: '邀请奖励被风控拦截'
      });
    }

  } catch (error) {
    console.error('处理邀请奖励失败:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});