import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 默认配额配置
const TIER_QUOTAS = {
  free: { hourly: 10, daily: 50 },
  premium: { hourly: 50, daily: 200 },
  vip: { hourly: -1, daily: -1 } // -1 表示无限制
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action = 'check', consume = false } = await req.json();

    // 获取或创建用户配额记录
    let quotaRecords = await base44.asServiceRole.entities.UserSearchQuota.filter({
      user_email: user.email
    });

    let quota;
    if (quotaRecords.length === 0) {
      // 创建新配额记录
      const userTier = user.membership_level || 'free';
      quota = await base44.asServiceRole.entities.UserSearchQuota.create({
        user_email: user.email,
        hourly_limit: TIER_QUOTAS[userTier]?.hourly || 10,
        daily_limit: TIER_QUOTAS[userTier]?.daily || 50,
        used_hourly: 0,
        used_daily: 0,
        last_reset_hour: new Date().toISOString(),
        last_reset_day: new Date().toISOString(),
        user_tier: userTier
      });
    } else {
      quota = quotaRecords[0];
    }

    const now = new Date();
    const lastResetHour = new Date(quota.last_reset_hour);
    const lastResetDay = new Date(quota.last_reset_day);

    // 检查是否需要重置小时计数
    const hourDiff = Math.floor((now - lastResetHour) / (1000 * 60 * 60));
    if (hourDiff >= 1) {
      await base44.asServiceRole.entities.UserSearchQuota.update(quota.id, {
        used_hourly: 0,
        last_reset_hour: now.toISOString()
      });
      quota.used_hourly = 0;
    }

    // 检查是否需要重置日计数
    const dayDiff = Math.floor((now - lastResetDay) / (1000 * 60 * 60 * 24));
    if (dayDiff >= 1) {
      await base44.asServiceRole.entities.UserSearchQuota.update(quota.id, {
        used_daily: 0,
        last_reset_day: now.toISOString()
      });
      quota.used_daily = 0;
    }

    // VIP 用户无限制
    if (quota.user_tier === 'vip') {
      return Response.json({
        allowed: true,
        remaining_hourly: -1,
        remaining_daily: -1,
        user_tier: 'vip',
        message: 'VIP user - unlimited searches'
      });
    }

    // 检查配额
    const hourlyRemaining = quota.hourly_limit - quota.used_hourly;
    const dailyRemaining = quota.daily_limit - quota.used_daily;
    const allowed = hourlyRemaining > 0 && dailyRemaining > 0;

    // 如果需要消耗配额
    if (consume && allowed) {
      await base44.asServiceRole.entities.UserSearchQuota.update(quota.id, {
        used_hourly: quota.used_hourly + 1,
        used_daily: quota.used_daily + 1
      });
    }

    return Response.json({
      allowed,
      remaining_hourly: Math.max(0, hourlyRemaining - (consume && allowed ? 1 : 0)),
      remaining_daily: Math.max(0, dailyRemaining - (consume && allowed ? 1 : 0)),
      user_tier: quota.user_tier,
      hourly_limit: quota.hourly_limit,
      daily_limit: quota.daily_limit,
      message: allowed 
        ? 'Quota available' 
        : `Search quota exceeded. Hourly: ${hourlyRemaining}, Daily: ${dailyRemaining}`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});