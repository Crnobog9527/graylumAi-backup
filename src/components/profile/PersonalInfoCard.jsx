import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Crown, Coins, Plus, RefreshCw, Key, Link2, Users, Headphones, MessageCircle, Code, PenTool } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import InviteDialog from '../invite/InviteDialog';

export function UserProfileHeader({ user }) {
  const registerDate = user?.created_date ? format(new Date(user.created_date), 'yyyy年M月d日') : '-';

  const tierLabels = {
    free: '免费用户',
    basic: '基础会员',
    pro: '专业会员',
    enterprise: '企业会员'
  };
  const subscriptionTier = user?.subscription_tier || 'free';

  return (
    <div
      className="rounded-2xl p-6 mb-6 transition-all duration-300"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar
            className="h-20 w-20"
            style={{ border: '2px solid rgba(255, 215, 0, 0.3)' }}
          >
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback
              className="text-2xl font-medium"
              style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--color-primary)' }}
            >
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user?.full_name || '用户'}</h2>
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>{user?.email}</p>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <span>注册时间：{registerDate}</span>
              <div className="flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <Crown className="h-4 w-4" />
                <span>{tierLabels[subscriptionTier]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreditsAndSubscriptionCards({ user }) {
  const credits = user?.credits || 0;
  const totalUsed = user?.total_credits_used || 0;
  const totalPurchased = user?.total_credits_purchased || 0;
  const userEmail = user?.email;

  // 获取本月消耗数据
  const { data: transactions = [] } = useQuery({
    queryKey: ['monthly-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter(
        { user_email: userEmail, type: 'usage' },
        '-created_date',
        100
      );
    },
    enabled: !!userEmail,
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthlyUsed = transactions
    .filter(t => {
      const date = new Date(t.created_date);
      return date >= monthStart && date <= monthEnd;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const tierLabels = {
    free: '免费用户',
    basic: '基础会员',
    pro: '专业会员',
    enterprise: '企业会员'
  };
  const subscriptionTier = user?.subscription_tier || 'free';
  const isFreeTier = subscriptionTier === 'free';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Credits Card */}
      <div
        className="rounded-2xl p-6 transition-all duration-300"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>积分余额</h3>
          <Coins className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div
          className="text-4xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {credits.toLocaleString()}
        </div>
        <div className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>本月已消耗 {Math.round(monthlyUsed).toLocaleString()} 积分</div>
        <Link to={createPageUrl('Credits')}>
          <Button
            className="w-full gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'var(--bg-primary)',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
            }}
          >
            <Plus className="h-4 w-4" />
            购买加油包
          </Button>
        </Link>
      </div>

      {/* Subscription Card */}
      <div
        className="rounded-2xl p-6 transition-all duration-300"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>订阅状态</h3>
          <Crown className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{tierLabels[subscriptionTier]}</div>
        <div className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
          {isFreeTier ? '升级会员享受更多权益' : '感谢您的支持'}
        </div>
        <Link to={createPageUrl('Credits')}>
          <Button
            className="w-full gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'var(--bg-primary)',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
            }}
          >
            {isFreeTier ? (
              <>
                <Crown className="h-4 w-4" />
                升级会员
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                续费订阅
              </>
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function UsageStatsCard({ user }) {
  const userEmail = user?.email;

  // 获取对话和交易数据
  const { data: conversations = [] } = useQuery({
    queryKey: ['all-conversations', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.Conversation.filter(
        { created_by: userEmail },
        '-created_date',
        1000
      );
    },
    enabled: !!userEmail,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['all-usage-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter(
        { user_email: userEmail, type: 'usage' },
        '-created_date',
        1000
      );
    },
    enabled: !!userEmail,
  });

  // 计算统计数据
  const totalConversations = conversations.length;
  const totalMessages = conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthlyCreditsUsed = transactions
    .filter(t => {
      const date = new Date(t.created_date);
      return date >= monthStart && date <= monthEnd;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  // 计算使用天数
  const usageDates = new Set(
    conversations.map(c => format(new Date(c.created_date), 'yyyy-MM-dd'))
  );
  const usageDays = usageDates.size;

  // 统计最常使用的功能模块
  const moduleUsage = {};
  transactions.forEach(t => {
    if (t.prompt_module_used) {
      moduleUsage[t.prompt_module_used] = (moduleUsage[t.prompt_module_used] || 0) + 1;
    }
  });

  const topModules = Object.entries(moduleUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const stats = [
    { label: '累计对话次数', value: totalConversations.toLocaleString() },
    { label: '累计消息数', value: totalMessages.toLocaleString() },
    { label: '本月消耗积分', value: Math.round(monthlyCreditsUsed).toLocaleString() },
    { label: '使用天数', value: usageDays.toString() },
  ];

  return (
    <div
      className="rounded-2xl p-6 mb-6 transition-all duration-300"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <h3 className="font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>使用统计</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</div>
            <div
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {topModules.length > 0 && (
        <>
          <h4 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>最常使用功能 Top 3</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topModules.map((module, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <div
                  className="p-2 rounded-lg"
                  style={{
                    background: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid rgba(255, 215, 0, 0.2)'
                  }}
                >
                  <MessageCircle className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{module.name}</div>
                  <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{module.count}次</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function QuickActionsCard({ user, onNavigateToTickets, onNavigateToSecurity }) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-300"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <h3 className="font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>快捷操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 账户安全 */}
        <div
          className="p-4 rounded-xl transition-all duration-300 cursor-pointer"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)'
          }}
          onClick={() => onNavigateToSecurity && onNavigateToSecurity()}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-primary)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
            style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}
          >
            <Key className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>账户安全</h4>
          <p className="text-sm mb-3 min-h-[40px]" style={{ color: 'var(--text-tertiary)' }}>管理登录方式和密码设置</p>
          <div className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
            前往设置
            <span>→</span>
          </div>
        </div>

        {/* 邀请好友 - 弹窗触发 */}
        <div
          className="p-4 rounded-xl transition-all duration-300 cursor-pointer"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)'
          }}
          onClick={() => setInviteDialogOpen(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-primary)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
            style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
          >
            <Users className="h-5 w-5" style={{ color: 'var(--success)' }} />
          </div>
          <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>邀请好友</h4>
          <p className="text-sm mb-3 min-h-[40px]" style={{ color: 'var(--text-tertiary)' }}>邀请好友注册，获得积分奖励</p>
          <div
            className="inline-block text-xs px-2 py-0.5 rounded mb-3"
            style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}
          >
            +50积分
          </div>
          <div className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
            生成邀请码
            <span>→</span>
          </div>
        </div>

        {/* 提交工单 */}
        <div
          className="p-4 rounded-xl transition-all duration-300 cursor-pointer"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)'
          }}
          onClick={() => onNavigateToTickets && onNavigateToTickets()}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-primary)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
            style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
          >
            <Headphones className="h-5 w-5" style={{ color: 'rgba(139, 92, 246, 1)' }} />
          </div>
          <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>提交工单</h4>
          <p className="text-sm mb-3 min-h-[40px]" style={{ color: 'var(--text-tertiary)' }}>遇到问题？我们随时为您提供帮助</p>
          <div className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--success)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }}></span>
            在线反馈
          </div>
          <div className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
            立即咨询
            <span>→</span>
          </div>
        </div>
      </div>

      {/* 邀请弹窗 */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        user={user}
      />
    </div>
  );
}