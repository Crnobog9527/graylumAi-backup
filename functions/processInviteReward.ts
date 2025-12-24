import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invitee_email, invite_code, ip_address, device_fingerprint } = await req.json();

    if (!invitee_email || !invite_code) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 查找邀请码对应的用户
    const users = await base44.asServiceRole.entities.User.filter({ invite_code });
    if (users.length === 0) {
      return Response.json({ error: '无效的邀请码' }, { status: 400 });
    }
    const inviter = users[0];

    // 检查是否自己邀请自己
    if (inviter.email === invitee_email) {
      return Response.json({ error: '不能邀请自己' }, { status: 400 });
    }

    // 检查是否已存在邀请记录
    const existingInvitations = await base44.asServiceRole.entities.Invitation.filter({ 
      invitee_email 
    });
    if (existingInvitations.length > 0) {
      return Response.json({ error: '该用户已被邀请过' }, { status: 400 });
    }

    // 获取系统设置
    const settings = await base44.asServiceRole.entities.SystemSettings.list();
    const getSettingValue = (key, defaultValue) => {
      const setting = settings.find(s => s.setting_key === key);
      return setting ? setting.setting_value : defaultValue;
    };

    const inviterReward = parseInt(getSettingValue('invite_inviter_reward', '50')) || 50;
    const inviteeReward = parseInt(getSettingValue('invite_invitee_reward', '30')) || 30;
    const dailyLimit = parseInt(getSettingValue('invite_daily_reward_limit', '1000')) || 1000;
    const monthlyLimit = parseInt(getSettingValue('invite_monthly_count_limit', '50')) || 50;
    const totalLimit = parseInt(getSettingValue('invite_total_reward_limit', '50000')) || 50000;
    const bindingDays = parseInt(getSettingValue('invite_binding_days', '30')) || 30;

    // 风险检测
    const riskReasons = [];
    let riskLevel = 'low';

    // 检查同IP注册
    if (ip_address) {
      const sameIpInvitations = await base44.asServiceRole.entities.Invitation.filter({ 
        ip_address 
      });
      const recentSameIp = sameIpInvitations.filter(inv => {
        const created = new Date(inv.created_date);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return created > hourAgo;
      });
      if (recentSameIp.length >= 3) {
        riskReasons.push('同IP 1小时内注册超过3次');
        riskLevel = 'high';
      }

      // 检查邀请人和被邀请人IP是否相同
      // (这里简化处理，实际应该在用户表记录IP)
      if (sameIpInvitations.some(inv => inv.inviter_email === inviter.email)) {
        riskReasons.push('邀请人与被邀请人IP相同');
        riskLevel = 'high';
      }
    }

    // 检查设备指纹
    if (device_fingerprint) {
      const sameFpInvitations = await base44.asServiceRole.entities.Invitation.filter({ 
        device_fingerprint 
      });
      if (sameFpInvitations.length >= 2) {
        riskReasons.push('相同设备指纹多次注册');
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }
    }

    // 检查邀请人是否达到限制
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // 检查今日奖励上限
    if (inviter.invite_rewards_today_date === today && 
        (inviter.invite_rewards_today || 0) >= dailyLimit) {
      riskReasons.push('邀请人今日奖励已达上限');
    }

    // 检查本月邀请人数上限
    if (inviter.invite_count_month === currentMonth && 
        (inviter.invite_count_this_month || 0) >= monthlyLimit) {
      riskReasons.push('邀请人本月邀请已达上限');
    }

    // 检查总奖励上限
    if ((inviter.invite_rewards_total || 0) >= totalLimit) {
      riskReasons.push('邀请人总奖励已达上限');
    }

    // 计算绑定期结束时间
    const bindingExpiresAt = new Date();
    bindingExpiresAt.setDate(bindingExpiresAt.getDate() + bindingDays);

    // 创建邀请记录
    const invitation = await base44.asServiceRole.entities.Invitation.create({
      inviter_email: inviter.email,
      invitee_email,
      invite_code,
      status: 'pending',
      inviter_reward: inviterReward,
      invitee_reward: inviteeReward,
      binding_expires_at: bindingExpiresAt.toISOString(),
      ip_address: ip_address || null,
      device_fingerprint: device_fingerprint || null,
      risk_level: riskLevel,
      risk_reasons: riskReasons.length > 0 ? riskReasons : null,
    });

    return Response.json({ 
      success: true, 
      invitation_id: invitation.id,
      risk_level: riskLevel,
      inviter_email: inviter.email,
    });

  } catch (error) {
    console.error('处理邀请奖励失败:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});