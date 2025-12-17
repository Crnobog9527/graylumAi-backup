import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Crown, Coins, Plus, RefreshCw, Key, Link2, Users, Headphones, MessageCircle, Code, PenTool } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

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
    <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-slate-100">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-medium">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{user?.full_name || '用户'}</h2>
            </div>
            <p className="text-slate-500 text-sm mb-2">{user?.email}</p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>注册时间：{registerDate}</span>
              <div className="flex items-center gap-1 text-blue-600">
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
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">积分余额</h3>
          <Coins className="h-5 w-5 text-amber-500" />
        </div>
        <div className="text-4xl font-bold text-blue-600 mb-2">{credits.toLocaleString()}</div>
        <div className="text-sm text-slate-500 mb-4">本月已消耗 {Math.round(monthlyUsed).toLocaleString()} 积分</div>
        <Link to={createPageUrl('Credits')}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            购买加油包
          </Button>
        </Link>
      </div>

      {/* Subscription Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">订阅状态</h3>
          <Crown className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mb-1">{tierLabels[subscriptionTier]}</div>
        <div className="text-sm text-slate-500 mb-4">
          {isFreeTier ? '升级会员享受更多权益' : '感谢您的支持'}
        </div>
        <Link to={createPageUrl('Credits')}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
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
    <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
      <h3 className="font-semibold text-slate-900 mb-6">使用统计</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-sm text-slate-500 mb-1">{stat.label}</div>
            <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
          </div>
        ))}
      </div>

      {topModules.length > 0 && (
        <>
          <h4 className="font-medium text-slate-900 mb-4">最常使用功能 Top 3</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topModules.map((module, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <MessageCircle className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{module.name}</div>
                  <div className="text-sm text-slate-500">{module.count}次</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function QuickActionsCard() {
  const actions = [
    {
      icon: Key,
      title: '账户安全',
      description: '管理登录方式和密码设置',
      linkText: '前往设置',
      linkUrl: '#security',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Users,
      title: '邀请好友',
      description: '邀请好友注册，获得积分奖励',
      linkText: '生成邀请码',
      linkUrl: '#',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      showBadge: '+50积分',
    },
    {
      icon: Headphones,
      title: '联系客服',
      description: '遇到问题？我们随时为您提供帮助',
      linkText: '立即咨询',
      linkUrl: createPageUrl('CreateTicket'),
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      showOnline: true,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-6">快捷操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div key={index} className="p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
              <div className={`w-10 h-10 rounded-lg ${action.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <h4 className="font-medium text-slate-900 mb-1">{action.title}</h4>
              <p className="text-sm text-slate-500 mb-3 min-h-[40px]">{action.description}</p>
              
              {action.showBadge && (
                <div className="inline-block bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded mb-3">
                  {action.showBadge}
                </div>
              )}
              
              {action.showOnline && (
                <div className="flex items-center gap-1 text-xs text-green-600 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  在线客服
                </div>
              )}
              
              <a href={action.linkUrl} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                {action.linkText}
                <span>→</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}