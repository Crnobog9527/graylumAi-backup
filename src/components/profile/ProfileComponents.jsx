import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  User, CreditCard, History, Shield, LogOut,
  Crown, Zap, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, RefreshCw, Settings, Wallet, Package, Mail, Lock, Loader2, Headphones, X, TrendingDown
} from 'lucide-react';
import CreditsDialog from './CreditsDialog';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subDays, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 每日积分消耗趋势图组件
function DailyUsageTrendChart({ transactions }) {
  // 获取最近14天的数据
  const chartData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({
      start: subDays(now, 13),
      end: now
    });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayUsage = transactions
        .filter(t => {
          const txDate = format(new Date(t.created_date), 'yyyy-MM-dd');
          return txDate === dayStr && t.type === 'usage';
        })
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      
      return {
        date: format(day, 'MM/dd', { locale: zhCN }),
        fullDate: format(day, 'M月d日', { locale: zhCN }),
        usage: Math.round(dayUsage)
      };
    });
  }, [transactions]);

  // 计算统计数据
  const stats = useMemo(() => {
    const totalUsage = chartData.reduce((sum, d) => sum + d.usage, 0);
    const avgUsage = Math.round(totalUsage / chartData.length);
    const maxUsage = Math.max(...chartData.map(d => d.usage));
    return { totalUsage, avgUsage, maxUsage };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg px-3 py-2 shadow-lg"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)'
          }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {payload[0]?.payload?.fullDate}
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            消耗 {payload[0]?.value?.toLocaleString()} 积分
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="rounded-2xl p-6 md:p-8 mt-6 transition-all duration-300"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}
          >
            <TrendingDown className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>每日消耗趋势</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <span style={{ color: 'var(--text-tertiary)' }}>14日总计</span>
            <span className="ml-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
              {stats.totalUsage.toLocaleString()}
            </span>
          </div>
          <div className="text-right hidden md:block">
            <span style={{ color: 'var(--text-tertiary)' }}>日均</span>
            <span className="ml-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
              {stats.avgUsage.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'var(--text-disabled)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-primary)' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'var(--text-disabled)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-primary)' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="usage"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#usageGradient)"
              dot={false}
              activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProfileSidebar({ activeTab, onTabChange, onLogout }) {
  const navigate = useNavigate();
  const menuItems = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'subscription', label: '订阅管理', icon: Crown },
    { id: 'credits', label: '积分记录', icon: Wallet },
    { id: 'history', label: '使用历史', icon: History },
    { id: 'security', label: '账户安全', icon: Shield },
    { id: 'tickets', label: '工单记录', icon: Headphones },
  ];

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Landing'));
  };

  return (
    <div
      className="w-56 shrink-0 hidden md:block rounded-2xl p-4 h-fit"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div className="mb-6">
        <h2
          className="text-base font-bold px-2 mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          个人中心
        </h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}

export function SubscriptionCard({ user }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  
  const { data: membershipPlans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => base44.entities.MembershipPlan.filter({ is_active: true }, 'sort_order'),
  });

  const subscriptionTier = user?.subscription_tier || 'free';
  const isFreeTier = subscriptionTier === 'free';

  // 会员等级配置
  const planConfigs = {
    free: {
      name: '免费会员',
      price: { monthly: 0, yearly: 0 },
      features: ['注册赠送100积分（一次性）', '对话历史保存5天'],
      recommended: false,
      highlight: false
    },
    pro: {
      name: '进阶会员',
      price: { monthly: 9.9, yearly: 95 },
      features: ['月度积分1500积分', '购买加油包享受95折', '对话历史保存1个月'],
      recommended: false,
      highlight: false
    },
    gold: {
      name: '黄金会员',
      price: { monthly: 29.9, yearly: 287 },
      features: ['月度积分5500积分', '购买加油包享受9折', '对话历史保存1个月'],
      recommended: true,
      highlight: true
    }
  };

  // 合并数据库中的会员计划
  const displayPlans = membershipPlans.length > 0 
    ? membershipPlans.map(plan => ({
        ...plan,
        ...planConfigs[plan.level] || {},
        price: {
          monthly: plan.monthly_price || planConfigs[plan.level]?.price?.monthly || 0,
          yearly: plan.yearly_price || planConfigs[plan.level]?.price?.yearly || 0
        },
        features: plan.features?.length > 0 ? plan.features : planConfigs[plan.level]?.features || []
      }))
    : Object.entries(planConfigs).map(([level, config]) => ({
        level,
        name: config.name,
        ...config
      }));

  const handleSelectPlan = (plan) => {
    // 这里可以跳转到支付页面或显示支付弹窗
    console.log('Selected plan:', plan);
  };

  return (
    <div
      className="rounded-2xl p-6 md:p-8 mb-6 transition-all duration-300"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}
          >
            <Crown className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>会员订阅</h3>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBillingCycle('monthly')}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: billingCycle === 'monthly' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--color-primary)' : 'var(--text-tertiary)',
              border: billingCycle === 'monthly' ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent'
            }}
          >
            按月
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: billingCycle === 'yearly' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
              color: billingCycle === 'yearly' ? 'var(--color-primary)' : 'var(--text-tertiary)',
              border: billingCycle === 'yearly' ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent'
            }}
          >
            按年
          </button>

        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayPlans.map((plan) => {
          const isCurrentPlan = plan.level === subscriptionTier || (plan.level === 'free' && isFreeTier);
          const isHighlight = plan.recommended || plan.highlight;
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
          
          return (
            <div
              key={plan.level || plan.id}
              className="relative rounded-xl p-5 transition-all duration-300"
              style={{
                background: isHighlight ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' : 'var(--bg-primary)',
                border: isHighlight ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid var(--border-primary)',
                boxShadow: isHighlight ? '0 0 30px rgba(139, 92, 246, 0.2)' : 'none'
              }}
            >
              {/* Recommended Badge */}
              {plan.recommended && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)', 
                    color: '#A78BFA', 
                    border: '1px solid rgba(139, 92, 246, 0.4)' 
                  }}
                >
                  ✨ 推荐
                </div>
              )}

              {/* Plan Name */}
              <h4 className="text-center font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                {plan.name}
              </h4>

              {/* Price */}
              <div className="text-center mb-4">
                {price === 0 ? (
                  <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>免费</span>
                ) : billingCycle === 'yearly' ? (
                  <div className="flex flex-col items-center gap-1">
                    {/* 原价划线（月价格） */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-through" style={{ color: 'var(--text-disabled)' }}>
                        ${plan.price.monthly.toFixed(1)}/月
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)' }}
                      >
                        省{Math.round((1 - price / (plan.price.monthly * 12)) * 100)}%
                      </span>
                    </div>
                    {/* 年付价格（每月均摊） */}
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>$</span>
                      <span
                        className="text-3xl font-bold"
                        style={{
                          background: isHighlight 
                            ? 'linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)' 
                            : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {(price / 12).toFixed(1)}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>/月</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      年付共 ${price.toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>$</span>
                    <span
                      className="text-3xl font-bold"
                      style={{
                        background: isHighlight 
                          ? 'linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)' 
                          : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {price.toFixed(1)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>/月</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 mb-5">
                {plan.features?.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <Button
                onClick={() => handleSelectPlan(plan)}
                className="w-full"
                disabled={isCurrentPlan}
                style={{
                  background: isCurrentPlan 
                    ? 'var(--bg-tertiary)' 
                    : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                  color: isCurrentPlan ? 'var(--text-tertiary)' : 'var(--bg-primary)',
                  cursor: isCurrentPlan ? 'default' : 'pointer'
                }}
              >
                {isCurrentPlan ? '当前套餐' : '选择'}
              </Button>
            </div>
          );
        })}
      </div>
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
    <>
      <div
        className="rounded-2xl p-6 md:p-8 mb-6 transition-all duration-300"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>积分概览</h3>
          <Zap className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>积分余额</div>
              <div
                className="text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {credits.toLocaleString()}
              </div>
            </div>

            <div className="pl-8 hidden md:block" style={{ borderLeft: '1px solid var(--border-primary)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>本月消耗</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(monthlyUsed).toLocaleString()}</div>
            </div>

            <div className="pl-8 hidden md:block" style={{ borderLeft: '1px solid var(--border-primary)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>累计消耗</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(user?.total_credits_used || 0).toLocaleString()}</div>
            </div>
          </div>

        </div>

      </div>

      {/* 每日消耗趋势图 */}
      <DailyUsageTrendChart transactions={transactions} />
    </>
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
    purchase: { icon: Package, color: 'var(--success)' },
    usage: { icon: Zap, color: 'var(--color-primary)' },
    bonus: { icon: Crown, color: 'var(--color-secondary)' },
    refund: { icon: RefreshCw, color: 'rgba(139, 92, 246, 1)' },
    admin_adjustment: { icon: Settings, color: 'var(--text-tertiary)' },
    membership: { icon: Crown, color: 'var(--color-primary)' },
    checkin: { icon: CheckCircle2, color: 'var(--success)' }
  };

  if (transactions.length === 0) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>交易记录</h3>
        <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
          暂无交易记录
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>交易记录</h3>
      </div>

      <div className="space-y-4">
        {transactions.map((tx) => {
          const typeConfig = typeIcons[tx.type] || typeIcons.usage;
          const Icon = typeConfig.icon;
          return (
            <div
              key={tx.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl transition-all duration-200"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start gap-4 mb-4 md:mb-0">
                <div
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}
                >
                  <Icon className="h-5 w-5" style={{ color: typeConfig.color }} />
                </div>
                <div>
                  <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {typeLabels[tx.type] || tx.type}
                  </div>
                  <div className="text-xs max-w-md truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {tx.description || '-'}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 md:justify-end items-center gap-4 md:gap-8">
                <div className="text-right">
                  <div
                    className="font-bold"
                    style={{ color: tx.amount > 0 ? 'var(--success)' : 'var(--error)' }}
                  >
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 积分
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-disabled)' }}>余额：{tx.balance_after}</div>
                </div>

                <div className="text-right min-w-[100px]">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{format(new Date(tx.created_date), 'yyyy-MM-dd')}</div>
                  <div className="text-xs" style={{ color: 'var(--text-disabled)' }}>{format(new Date(tx.created_date), 'HH:mm:ss')}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-8 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>共 {transactions.length} 条记录</span>
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
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>使用历史</h3>
        <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
          暂无使用记录
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>使用历史</h3>
        <Link to={createPageUrl('Chat')}>
          <Button
            variant="outline"
            size="sm"
            style={{
              background: 'transparent',
              borderColor: 'rgba(255, 215, 0, 0.3)',
              color: 'var(--color-primary)'
            }}
          >
            查看全部对话
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="flex items-center justify-between p-4 rounded-xl transition-all duration-200"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="p-2 rounded-lg"
                style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}
              >
                <History className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{conv.title || '新对话'}</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {conv.messages?.length || 0} 条消息 · 消耗 {conv.total_credits_used || 0} 积分
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleSendVerificationEmail = async () => {
    setVerifyLoading(true);
    try {
      const { data } = await base44.functions.invoke('sendVerificationEmail');
      if (data.success) {
        toast.success(data.message);
        setShowVerifyDialog(true);
      } else {
        toast.error(data.error || '发送失败');
      }
    } catch (error) {
      toast.error('发送失败，请稍后重试');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }

    setVerifyLoading(true);
    try {
      const { data } = await base44.functions.invoke('verifyEmail', {
        verification_code: verificationCode
      });
      if (data.success) {
        toast.success(data.message);
        setShowVerifyDialog(false);
        setVerificationCode('');
        window.location.reload();
      } else {
        toast.error(data.error || '验证失败');
      }
    } catch (error) {
      toast.error('验证失败，请稍后重试');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('请填写完整信息');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('新密码长度至少为8位');
      return;
    }

    setPasswordLoading(true);
    try {
      const { data } = await base44.functions.invoke('changePassword', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      if (data.success) {
        toast.success(data.message);
        setShowPasswordDialog(false);
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        toast.error(data.error || '修改失败');
      }
    } catch (error) {
      toast.error('修改失败，请稍后重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>账户安全</h3>

        <div className="space-y-6">
          {/* 登录方式 */}
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>登录方式</div>
              <span
                className="text-sm px-3 py-1 rounded-full"
                style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--color-primary)' }}
              >
                邮箱密码
              </span>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{user?.email}</div>
          </div>

          {/* 邮箱验证 */}
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>邮箱验证</div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {user?.email_verified ? '已验证' : '未验证'}
                </div>
              </div>
              {user?.email_verified ? (
                <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--success)' }} />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendVerificationEmail}
                  disabled={verifyLoading}
                  style={{
                    background: 'transparent',
                    borderColor: 'rgba(255, 215, 0, 0.3)',
                    color: 'var(--color-primary)'
                  }}
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
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>修改密码</div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>定期更新密码以保障账户安全</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
                style={{
                  background: 'transparent',
                  borderColor: 'rgba(255, 215, 0, 0.3)',
                  color: 'var(--color-primary)'
                }}
              >
                修改
              </Button>
            </div>
          </div>

          {/* 账户注册时间 */}
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>注册时间</div>
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {user?.created_date ? format(new Date(user.created_date), 'yyyy年MM月dd日') : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 邮箱验证对话框 */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)'
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>邮箱验证</DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
              验证码已发送至 {user?.email}，请查收邮箱
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code" style={{ color: 'var(--text-primary)' }}>验证码</Label>
              <Input
                id="code"
                placeholder="请输入6位验证码"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              验证码有效期30分钟，未收到邮件？
              <button
                onClick={handleSendVerificationEmail}
                className="ml-1 hover:underline"
                style={{ color: 'var(--color-primary)' }}
                disabled={verifyLoading}
              >
                重新发送
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowVerifyDialog(false)}
              style={{
                background: 'transparent',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)'
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleVerifyEmail}
              disabled={verifyLoading || verificationCode.length !== 6}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                color: 'var(--bg-primary)'
              }}
            >
              {verifyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                '确认验证'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)'
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>修改密码</DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
              请输入当前密码和新密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current" style={{ color: 'var(--text-primary)' }}>当前密码</Label>
              <Input
                id="current"
                type="password"
                placeholder="请输入当前密码"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new" style={{ color: 'var(--text-primary)' }}>新密码</Label>
              <Input
                id="new"
                type="password"
                placeholder="至少8位字符"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" style={{ color: 'var(--text-primary)' }}>确认新密码</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="再次输入新密码"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              style={{
                background: 'transparent',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)'
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                color: 'var(--bg-primary)'
              }}
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  修改中...
                </>
              ) : (
                '确认修改'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}