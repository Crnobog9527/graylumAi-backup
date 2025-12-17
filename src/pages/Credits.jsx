import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Coins, History, TrendingUp, TrendingDown, Zap, Sparkles, Crown, Package, Check, Gift } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Credits() {
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: packages = [] } = useQuery({
    queryKey: ['creditPackages'],
    queryFn: () => base44.entities.CreditPackage.filter({ is_active: true }, 'sort_order'),
  });

  const { data: membershipPlans = [] } = useQuery({
    queryKey: ['membershipPlans'],
    queryFn: () => base44.entities.MembershipPlan.filter({ is_active: true }, 'sort_order'),
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.CreditTransaction.filter(
        { user_email: user?.email },
        '-created_date',
        50
      );
    },
    enabled: !!user?.email,
  });

  // 只显示积分获取记录（正数金额）
  const incomeTransactions = allTransactions.filter(tx => tx.amount > 0);

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => setUser(prev => ({ ...prev, ...data })),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create(data),
    onSuccess: () => queryClient.invalidateQueries(['transactions']),
  });

  const handlePurchase = async (pkg) => {
    // 显示支付提示，实际项目需接入支付系统
    alert(`即将跳转支付页面购买 ${pkg.name}（${pkg.credits} 积分），价格 $${pkg.price}\n\n请联系管理员完成支付或接入支付系统。`);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'purchase':
      case 'bonus':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'usage':
        return <TrendingDown className="h-4 w-4 text-rose-500" />;
      default:
        return <Coins className="h-4 w-4 text-slate-500" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  // 计算统计数据
  const totalPurchased = user?.total_credits_purchased || 0;
  const totalUsed = user?.total_credits_used || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
            <Coins className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">充值中心</h1>
          <p className="text-slate-500 mt-2">购买积分，畅享AI功能</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Coins className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">当前积分</span>
            </div>
            <div className="text-3xl font-bold text-amber-600">{(user?.credits || 0).toLocaleString()}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-slate-500">累计购买</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalPurchased.toLocaleString()}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-slate-500">累计消耗</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalUsed.toLocaleString()}</div>
          </div>
        </div>

        {/* Membership Plans */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-slate-600" />
              <h2 className="text-xl font-semibold text-slate-800">会员订阅</h2>
            </div>
            
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  billingCycle === 'monthly'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                按月支付
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  billingCycle === 'yearly'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                按年支付
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {membershipPlans.map((plan) => {
              const isCurrentPlan = user?.subscription_tier === plan.level;
              
              const displayPrice = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
              const displayPeriod = billingCycle === 'monthly' ? '月' : '年';
              const monthlyEquivalent = billingCycle === 'yearly' ? plan.yearly_price / 12 : null;
              const expectedYearlyPrice = plan.monthly_price * 12;
              const discount = billingCycle === 'yearly' && expectedYearlyPrice > plan.yearly_price
                ? Math.round((1 - plan.yearly_price / expectedYearlyPrice) * 100)
                : 0;
              
              return (
                <div 
                  key={plan.id}
                  className={cn(
                    "relative bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-lg",
                    plan.level === 'gold' 
                      ? "border-amber-400 shadow-amber-100 shadow-lg" 
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {plan.level === 'gold' && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs px-3">
                      <Sparkles className="h-3 w-3 mr-1" />
                      推荐
                    </Badge>
                  )}
                  
                  <div className="text-center mb-4">
                    <div className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3",
                      plan.level === 'gold' ? "bg-amber-100" : "bg-indigo-100"
                    )}>
                      <Crown className={cn(
                        "h-6 w-6",
                        plan.level === 'gold' ? "text-amber-600" : "text-indigo-600"
                      )} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  </div>
                  
                  <div className="text-center mb-4">
                    {plan.level === 'free' ? (
                      <div className="text-2xl font-bold text-slate-900">免费</div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold text-slate-900">${displayPrice}</span>
                          <span className="text-slate-500">/{displayPeriod}</span>
                        </div>
                        {billingCycle === 'yearly' && monthlyEquivalent && (
                          <div className="text-sm text-slate-500 mt-1">
                            年付 ${monthlyEquivalent.toFixed(1)}/月
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="mt-2">
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              节省{discount}%
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    {plan.features?.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    className={cn(
                      "w-full",
                      isCurrentPlan
                        ? "bg-slate-200 text-slate-600 cursor-default"
                        : plan.level === 'gold' 
                          ? "bg-amber-500 hover:bg-amber-600" 
                          : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                    disabled={isCurrentPlan || purchasing}
                  >
                    {isCurrentPlan ? '当前套餐' : '立即订阅'}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Credit Packages */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-800">积分加油包</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => {
              const totalCredits = pkg.credits + (pkg.bonus_credits || 0);
              return (
                <div 
                  key={pkg.id}
                  className={cn(
                    "relative bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-lg",
                    pkg.is_popular 
                      ? "border-blue-400 shadow-blue-100 shadow-lg" 
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {pkg.is_popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3">
                      推荐
                    </Badge>
                  )}
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      <span className="text-2xl font-bold text-slate-900">{pkg.credits.toLocaleString()}</span>
                      <span className="text-sm text-slate-500">积分</span>
                    </div>
                    
                    {pkg.bonus_credits > 0 && (
                      <div className="text-sm text-green-600 mb-2">
                        +{pkg.bonus_credits} 赠送积分
                      </div>
                    )}
                    
                    <div className="text-2xl font-bold text-blue-600 mb-4">
                      ${pkg.price}
                    </div>
                    
                    <Button
                      className={cn(
                        "w-full",
                        pkg.is_popular 
                          ? "bg-blue-600 hover:bg-blue-700" 
                          : "bg-slate-800 hover:bg-slate-900"
                      )}
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing}
                    >
                      立即购买
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {packages.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Coins className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无可用套餐</p>
            </div>
          )}
        </section>

        {/* Transaction History - Only Income */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Gift className="h-5 w-5 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-800">积分获取记录</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <ScrollArea className="h-[400px]">
              {incomeTransactions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {incomeTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-green-100">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{tx.description || tx.type}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(tx.created_date), 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          +{tx.amount} 积分
                        </p>
                        <p className="text-xs text-slate-400">
                          余额: {tx.balance_after}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Gift className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无获取记录</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  );
}