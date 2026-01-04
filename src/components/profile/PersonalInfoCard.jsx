import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Crown, Coins, Plus, RefreshCw, Key, Users, Headphones, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import InviteDialog from '../invite/InviteDialog';

export function UserProfileHeader({ user }) {
  const registerDate = user?.created_date ? format(new Date(user.created_date), 'yyyy年M月d日') : '-';
  const tierLabels = { free: '免费用户', basic: '基础会员', pro: '专业会员', enterprise: '企业会员' };
  const subscriptionTier = user?.subscription_tier || 'free';
  
  return (
    <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a] mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-[#1a1a1a]">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-amber-500/20 text-amber-500 text-2xl font-medium">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{user?.full_name || '用户'}</h2>
            <p className="text-[#666666] text-sm mb-2">{user?.email}</p>
            <div className="flex items-center gap-4 text-sm text-[#666666]">
              <span>注册时间：{registerDate}</span>
              <div className="flex items-center gap-1 text-amber-500">
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
  const userEmail = user?.email;
  
  const { data: transactions = [] } = useQuery({
    queryKey: ['monthly-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter({ user_email: userEmail, type: 'usage' }, '-created_date', 100);
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

  const tierLabels = { free: '免费用户', basic: '基础会员', pro: '专业会员', enterprise: '企业会员' };
  const subscriptionTier = user?.subscription_tier || 'free';
  const isFreeTier = subscriptionTier === 'free';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">积分余额</h3>
          <Coins className="h-5 w-5 text-amber-500" />
        </div>
        <div className="text-4xl font-bold text-amber-500 mb-2">{credits.toLocaleString()}</div>
        <div className="text-sm text-[#666666] mb-4">本月已消耗 {Math.round(monthlyUsed).toLocaleString()} 积分</div>
        <Link to={createPageUrl('Credits')}>
          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black gap-2">
            <Plus className="h-4 w-4" />
            购买加油包
          </Button>
        </Link>
      </div>

      <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">订阅状态</h3>
          <Crown className="h-5 w-5 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-white mb-1">{tierLabels[subscriptionTier]}</div>
        <div className="text-sm text-[#666666] mb-4">{isFreeTier ? '升级会员享受更多权益' : '感谢您的支持'}</div>
        <Link to={createPageUrl('Credits')}>
          <Button className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a] gap-2">
            {isFreeTier ? <><Crown className="h-4 w-4" />升级会员</> : <><RefreshCw className="h-4 w-4" />续费订阅</>}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function UsageStatsCard({ user }) {
  const userEmail = user?.email;
  
  const { data: conversations = [] } = useQuery({
    queryKey: ['all-conversations', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.Conversation.filter({ created_by: userEmail }, '-created_date', 1000);
    },
    enabled: !!userEmail,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['all-usage-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter({ user_email: userEmail, type: 'usage' }, '-created_date', 1000);
    },
    enabled: !!userEmail,
  });

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

  const usageDates = new Set(conversations.map(c => format(new Date(c.created_date), 'yyyy-MM-dd')));
  const usageDays = usageDates.size;

  const moduleUsage = {};
  transactions.forEach(t => {
    if (t.prompt_module_used) {
      moduleUsage[t.prompt_module_used] = (moduleUsage[t.prompt_module_used] || 0) + 1;
    }
  });
  
  const topModules = Object.entries(moduleUsage).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));

  const stats = [
    { label: '累计对话次数', value: totalConversations.toLocaleString() },
    { label: '累计消息数', value: totalMessages.toLocaleString() },
    { label: '本月消耗积分', value: Math.round(monthlyCreditsUsed).toLocaleString() },
    { label: '使用天数', value: usageDays.toString() },
  ];

  return (
    <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a] mb-6">
      <h3 className="font-semibold text-white mb-6">使用统计</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-sm text-[#666666] mb-1">{stat.label}</div>
            <div className="text-2xl font-bold text-amber-500">{stat.value}</div>
          </div>
        ))}
      </div>

      {topModules.length > 0 && (
        <>
          <h4 className="font-medium text-white mb-4">最常使用功能 Top 3</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topModules.map((module, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-[#111111] border border-[#1a1a1a] rounded-xl">
                <div className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                  <MessageCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium text-white">{module.name}</div>
                  <div className="text-sm text-[#666666]">{module.count}次</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function QuickActionsCard({ user }) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a]">
      <h3 className="font-semibold text-white mb-6">快捷操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border border-[#1a1a1a] rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
            <Key className="h-5 w-5 text-blue-400" />
          </div>
          <h4 className="font-medium text-white mb-1">账户安全</h4>
          <p className="text-sm text-[#666666] mb-3 min-h-[40px]">管理登录方式和密码设置</p>
          <a href="#security" className="text-sm text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1">
            前往设置 <span>→</span>
          </a>
        </div>

        <div 
          className="p-4 border border-[#1a1a1a] rounded-xl hover:border-green-500/30 hover:bg-green-500/5 transition-all cursor-pointer"
          onClick={() => setInviteDialogOpen(true)}
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-green-400" />
          </div>
          <h4 className="font-medium text-white mb-1">邀请好友</h4>
          <p className="text-sm text-[#666666] mb-3 min-h-[40px]">邀请好友注册，获得积分奖励</p>
          <div className="inline-block bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded border border-green-500/20 mb-3">+50积分</div>
          <div className="text-sm text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1">
            生成邀请码 <span>→</span>
          </div>
        </div>

        <div className="p-4 border border-[#1a1a1a] rounded-xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
            <Headphones className="h-5 w-5 text-purple-400" />
          </div>
          <h4 className="font-medium text-white mb-1">提交工单</h4>
          <p className="text-sm text-[#666666] mb-3 min-h-[40px]">遇到问题？我们随时为您提供帮助</p>
          <div className="flex items-center gap-1 text-xs text-green-400 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            在线反馈
          </div>
          <Link to={createPageUrl('CreateTicket')} className="text-sm text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1">
            立即咨询 <span>→</span>
          </Link>
        </div>
      </div>

      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} user={user} />
    </div>
  );
}