import React from 'react';
import { Crown, Zap, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * 欢迎横幅组件 - Premium Tech Editorial 版本
 *
 * 使用设计系统:
 * - user-header, user-info, user-status, status-indicator
 * - user-greeting, user-badge, points-button
 */
export default function WelcomeBanner({ user }) {
  if (!user) return null;

  // 会员级别映射
  const membershipLevelMap = {
    'free': '普通会员',
    'pro': 'Pro会员',
    'gold': 'Gold会员'
  };

  const membershipLevel = membershipLevelMap[user.membership_level] || '普通会员';
  const membershipExpiry = user.membership_expiry_date
    ? new Date(user.membership_expiry_date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : null;

  const isPremium = user.membership_level === 'pro' || user.membership_level === 'gold';

  return (
    <div
      className="relative overflow-hidden mb-8"
      style={{
        background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(30, 30, 30, 0.6) 100%)',
        borderRadius: 'var(--radius-2xl)',
        border: isPremium ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        animation: 'fadeInUp 0.6s ease forwards'
      }}
    >
      {/* 背景装饰 */}
      {isPremium && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 100% 0%, rgba(255, 215, 0, 0.08) 0%, transparent 50%)',
          }}
        />
      )}

      <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="user-info flex-col items-start gap-4">
          {/* 在线状态 */}
          <div className="user-status">
            <span className="status-indicator" />
            <span>Online</span>
          </div>

          {/* 欢迎标题 */}
          <h1 className="user-greeting">
            欢迎回来，
            <span>{user.full_name || user.email?.split('@')[0] || '用户'}</span>
          </h1>

          {/* 会员信息行 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 会员徽章 */}
            <div className="user-badge">
              <Crown className="w-3.5 h-3.5" />
              <span>{membershipLevel}</span>
            </div>

            {/* 有效期 */}
            {membershipExpiry && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                有效期至 {membershipExpiry}
              </span>
            )}

            {/* Premium 闪光标识 */}
            {isPremium && (
              <div className="flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <Sparkles className="w-3.5 h-3.5" />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
                  Premium
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 充值按钮 */}
        <Link to={createPageUrl('Credits')}>
          <button className="points-button flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>充值积分</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
