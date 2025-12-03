import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  User, CreditCard, History, Shield, LogOut, 
  Crown, Zap, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, RefreshCw, Settings, Wallet, Package, Mail, Lock, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export function ProfileSidebar({ activeTab, onTabChange, onLogout }) {
  const menuItems = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'subscription', label: '订阅管理', icon: Crown },
    { id: 'credits', label: '积分记录', icon: Wallet },
    { id: 'history', label: '使用历史', icon: History },
    { id: 'security', label: '账户安全', icon: Shield },
  ];

  return (
    <div className="w-56 shrink-0 hidden md:block bg-white rounded-2xl p-4 border border-slate-200 h-fit">
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-900 px-2 mb-4">个人中心</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="pt-4 border-t border-slate-100">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}

export function SubscriptionCard({ user }) {
  const { data: membershipPlans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => base44.entities.MembershipPlan.filter({ is_active: true }, 'sort_order'),
  });

  const subscriptionTier = user?.subscription_tier || 'free';
  const tierLabels = {
    free: '免费用户',
    basic: '基础会员',
    pro: '专业会员',
    enterprise: '企业会员'
  };
  const tierBadges = {
    free: '',
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise'
  };

  const isFreeTier = subscriptionTier === 'free';

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Crown className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">当前订阅</h3>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
          isFreeTier ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700"
        )}>
          <span className={cn("w-2 h-2 rounded-full", isFreeTier ? "bg-slate-400" : "bg-green-500")}></span>
          {isFreeTier ? '未订阅' : '订阅中'}
        </div>
      </div>

      {isFreeTier ? (
        <div className="text-center py-8">
          <div className="text-slate-500 mb-6">您当前是免费用户，升级会员享受更多权益</div>
          <Link to={createPageUrl('Credits')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Crown className="h-4 w-4 mr-2" />
              升级会员
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">{tierLabels[subscriptionTier]}</h2>
              {tierBadges[subscriptionTier] && (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-medium">
                  {tierBadges[subscriptionTier]}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mb-6">
              感谢您的支持！
            </p>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-900 mb-2">套餐权益</div>
              {[
                "更多积分配额",
                "所有核心功能",
                "优先响应速度",
                "专属客服"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-80 flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-slate-900">自动续费</div>
                <div className="text-xs text-slate-500">开启后，到期前自动扣费续订</div>
              </div>
              <Switch />
            </div>

            <Link to={createPageUrl('Credits')}>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base">
                <RefreshCw className="h-4 w-4 mr-2" />
                立即续费
              </Button>
            </Link>
            
            <Link to={createPageUrl('Credits')}>
              <Button variant="outline" className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-11">
                ↑ 升级套餐
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreditStatsCard({ user }) {
  const credits = user?.credits || 0;
  const userEmail = user?.email;
  
  // 获取本月积分消耗
  const { data: transactions = [] } = useQuery({
    queryKey: ['user-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter(
        { user_email: userEmail },
        '-created_date',
        100
      );
    },
    enabled: !!userEmail,
  });

  // 计算本月消耗
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const monthlyUsed = transactions
    .filter(t => {
      const date = new Date(t.created_date);
      return date >= monthStart && date <= monthEnd && t.type === 'usage';
    })
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">积分概览</h3>
        <Zap className="h-5 w-5 text-amber-500" />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">积分余额</div>
            <div className="text-3xl font-bold text-indigo-600">
              {credits.toLocaleString()}
            </div>
          </div>
          
          <div className="border-l border-slate-100 pl-8 hidden md:block">
            <div className="text-sm font-medium text-slate-500 mb-1">本月消耗</div>
            <div className="text-2xl font-bold text-slate-900">{Math.round(monthlyUsed).toLocaleString()}</div>
          </div>
          
          <div className="border-l border-slate-100 pl-8 hidden md:block">
            <div className="text-sm font-medium text-slate-500 mb-1">累计消耗</div>
            <div className="text-2xl font-bold text-slate-900">{(user?.total_credits_used || 0).toLocaleString()}</div>
          </div>
        </div>

        <Link to={createPageUrl('Credits')}>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-6">
            <Zap className="h-4 w-4 mr-2" />
            购买加油包
          </Button>
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <h4 className="text-sm font-medium text-slate-900 mb-4">最近积分变动</h4>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  tx.amount > 0 ? "bg-green-100" : "bg-red-100"
                )}>
                  {tx.amount > 0 ? (
                    <Zap className="h-4 w-4 text-green-600" />
                  ) : (
                    <Zap className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <div className="text-slate-900">{tx.description?.slice(0, 30) || tx.type}</div>
                  <div className="text-xs text-slate-400">
                    {format(new Date(tx.created_date), 'MM-dd HH:mm')}
                  </div>
                </div>
              </div>
              <div className={cn(
                "font-medium",
                tx.amount > 0 ? "text-green-600" : "text-red-600"
              )}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderHistory({ user }) {
  const userEmail = user?.email;
  
  const { data: transactions = [] } = useQuery({
    queryKey: ['all-transactions', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.CreditTransaction.filter(
        { user_email: userEmail },
        '-created_date',
        50
      );
    },
    enabled: !!userEmail,
  });

  const typeLabels = {
    purchase: '购买积分',
    usage: '积分消耗',
    bonus: '积分奖励',
    refund: '积分退款',
    admin_adjustment: '管理员调整',
    membership: '会员权益',
    checkin: '签到奖励'
  };

  const typeIcons = {
    purchase: { icon: Package, bg: 'bg-green-100', color: 'text-green-600' },
    usage: { icon: Zap, bg: 'bg-blue-100', color: 'text-blue-600' },
    bonus: { icon: Crown, bg: 'bg-amber-100', color: 'text-amber-600' },
    refund: { icon: RefreshCw, bg: 'bg-purple-100', color: 'text-purple-600' },
    admin_adjustment: { icon: Settings, bg: 'bg-slate-100', color: 'text-slate-600' },
    membership: { icon: Crown, bg: 'bg-indigo-100', color: 'text-indigo-600' },
    checkin: { icon: CheckCircle2, bg: 'bg-green-100', color: 'text-green-600' }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">交易记录</h3>
        <div className="text-center py-12 text-slate-500">
          暂无交易记录
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">交易记录</h3>
      </div>

      <div className="space-y-4">
        {transactions.map((tx) => {
          const typeConfig = typeIcons[tx.type] || typeIcons.usage;
          const Icon = typeConfig.icon;
          return (
            <div key={tx.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className="flex items-start gap-4 mb-4 md:mb-0">
                <div className={`p-3 rounded-xl ${typeConfig.bg}`}>
                  <Icon className={`h-5 w-5 ${typeConfig.color}`} />
                </div>
                <div>
                  <div className="font-medium text-slate-900 mb-1">
                    {typeLabels[tx.type] || tx.type}
                  </div>
                  <div className="text-xs text-slate-500 max-w-md truncate">
                    {tx.description || '-'}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 md:justify-end items-center gap-4 md:gap-8">
                <div className="text-right">
                  <div className={cn(
                    "font-bold",
                    tx.amount > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 积分
                  </div>
                  <div className="text-xs text-slate-400">余额：{tx.balance_after}</div>
                </div>

                <div className="text-right min-w-[100px]">
                  <div className="text-xs text-slate-900">{format(new Date(tx.created_date), 'yyyy-MM-dd')}</div>
                  <div className="text-xs text-slate-400">{format(new Date(tx.created_date), 'HH:mm:ss')}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-50">
        <span className="text-sm text-slate-500">共 {transactions.length} 条记录</span>
      </div>
    </div>
  );
}

export function UsageHistoryCard({ user }) {
  const userEmail = user?.email;
  
  const { data: conversations = [] } = useQuery({
    queryKey: ['user-conversations', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.Conversation.filter(
        { created_by: userEmail },
        '-created_date',
        20
      );
    },
    enabled: !!userEmail,
  });

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">使用历史</h3>
        <div className="text-center py-12 text-slate-500">
          暂无使用记录
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">使用历史</h3>
        <Link to={createPageUrl('Chat')}>
          <Button variant="outline" size="sm">查看全部对话</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {conversations.map((conv) => (
          <div key={conv.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg">
                <History className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 truncate">{conv.title || '新对话'}</div>
                <div className="text-xs text-slate-500">
                  {conv.messages?.length || 0} 条消息 · 消耗 {conv.total_credits_used || 0} 积分
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-xs text-slate-500">
                {format(new Date(conv.created_date), 'MM-dd HH:mm')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecuritySettingsCard({ user }) {
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleVerifyEmail = async () => {
    setVerifyLoading(true);
    try {
      // 发送验证邮件
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '邮箱验证',
        body: `您好 ${user.full_name || '用户'}，\n\n感谢您使用我们的服务！您的邮箱已确认为：${user.email}\n\n如果这不是您的操作，请忽略此邮件。\n\n祝好！`
      });
      toast.success('验证邮件已发送，请查收邮箱');
    } catch (error) {
      toast.error('发送失败，请稍后重试');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangePassword = () => {
    toast.info('如需修改密码，请联系管理员或通过忘记密码功能重置');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-6">账户安全</h3>
      
      <div className="space-y-6">
        {/* 登录方式 */}
        <div className="p-4 border border-slate-100 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-slate-900">登录方式</div>
            <span className="text-sm text-slate-500">
              {user?.login_provider === 'google' ? 'Google 账号' : 
               user?.login_provider === 'wechat' ? '微信' : '邮箱密码'}
            </span>
          </div>
          <div className="text-sm text-slate-500">{user?.email}</div>
        </div>

        {/* 邮箱验证 */}
        <div className="p-4 border border-slate-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">邮箱验证</div>
              <div className="text-sm text-slate-500 mt-1">
                {user?.email_verified ? '已验证' : '未验证'}
              </div>
            </div>
            {user?.email_verified ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleVerifyEmail}
                disabled={verifyLoading}
              >
                {verifyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '验证邮箱'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 修改密码 */}
        <div className="p-4 border border-slate-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">修改密码</div>
              <div className="text-sm text-slate-500 mt-1">定期更新密码以保障账户安全</div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleChangePassword}
            >
              修改
            </Button>
          </div>
        </div>

        {/* 账户注册时间 */}
        <div className="p-4 border border-slate-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="font-medium text-slate-900">注册时间</div>
            <span className="text-sm text-slate-500">
              {user?.created_date ? format(new Date(user.created_date), 'yyyy年MM月dd日') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}