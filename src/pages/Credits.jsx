import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coins, TrendingUp, TrendingDown, Zap, Sparkles, Crown, Package, Check, Gift } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

  const incomeTransactions = allTransactions.filter(tx => tx.amount > 0);

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => setUser(prev => ({ ...prev, ...data })),
  });

  const handlePurchase = async (pkg) => {
    alert(`即将跳转支付页面购买 ${pkg.name}（${pkg.credits} 积分），价格 $${pkg.price}\n\n请联系管理员完成支付或接入支付系统。`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const totalPurchased = user?.total_credits_purchased || 0;
  const totalUsed = user?.total_credits_used || 0;

  return (
    <div className="min-h-screen bg-[#050505] py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4">
            <Coins className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">充值中心</h1>
          <p className="text-[#666666] mt-2">购买积分，畅享AI功能</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-sm text-[#666666]">当前积分</span>
            </div>
            <div className="text-3xl font-bold text-amber-500">{(user?.credits || 0).toLocaleString()}</div>
          </div>
          
          <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm text-[#666666]">累计购买</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalPurchased.toLocaleString()}</div>
          </div>
          
          <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#1a1a1a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm text-[#666666]">累计消耗</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalUsed.toLocaleString()}</div>
          </div>
        </motion.div>

        {/* Membership Plans */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-semibold text-white">会员订阅</h2>
            </div>
            
            <div className="inline-flex items-center rounded-lg bg-[#1a1a1a] p-1 border border-[#2a2a2a]">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  billingCycle === 'monthly'
                    ? "bg-amber-500 text-black"
                    : "text-[#a3a3a3] hover:text-white"
                )}
              >
                按月支付
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  billingCycle === 'yearly'
                    ? "bg-amber-500 text-black"
                    : "text-[#a3a3a3] hover:text-white"
                )}
              >
                按年支付
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    "relative bg-[#0a0a0a] rounded-xl border p-6 transition-all hover:border-[#2a2a2a]",
                    plan.level === 'gold' 
                      ? "border-amber-500/30" 
                      : "border-[#1a1a1a]"
                  )}
                >
                  {plan.level === 'gold' && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs px-3">
                      <Sparkles className="h-3 w-3 mr-1" />
                      推荐
                    </Badge>
                  )}
                  
                  <div className="text-center mb-4">
                    <div className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 border",
                      plan.level === 'gold' 
                        ? "bg-amber-500/10 border-amber-500/20" 
                        : "bg-[#1a1a1a] border-[#2a2a2a]"
                    )}>
                      <Crown className={cn(
                        "h-6 w-6",
                        plan.level === 'gold' ? "text-amber-500" : "text-[#a3a3a3]"
                      )} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  </div>
                  
                  <div className="text-center mb-4">
                    {plan.level === 'free' ? (
                      <div className="text-2xl font-bold text-white">免费</div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold text-white">${displayPrice}</span>
                          <span className="text-[#666666]">/{displayPeriod}</span>
                        </div>
                        {billingCycle === 'yearly' && monthlyEquivalent && (
                          <div className="text-sm text-[#666666] mt-1">
                            年付 ${monthlyEquivalent.toFixed(1)}/月
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="mt-2">
                            <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
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
                        <span className="text-[#a3a3a3]">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    className={cn(
                      "w-full",
                      isCurrentPlan
                        ? "bg-[#1a1a1a] text-[#666666] cursor-default border border-[#2a2a2a]"
                        : plan.level === 'gold' 
                          ? "bg-amber-500 hover:bg-amber-600 text-black" 
                          : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a]"
                    )}
                    disabled={isCurrentPlan || purchasing}
                  >
                    {isCurrentPlan ? '当前套餐' : '立即订阅'}
                  </Button>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Credit Packages */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-white">积分加油包</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <div 
                key={pkg.id}
                className={cn(
                  "relative bg-[#0a0a0a] rounded-xl border p-5 transition-all hover:border-[#2a2a2a]",
                  pkg.is_popular 
                    ? "border-amber-500/30" 
                    : "border-[#1a1a1a]"
                )}
              >
                {pkg.is_popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs px-3">
                    推荐
                  </Badge>
                )}
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold text-white">{pkg.credits.toLocaleString()}</span>
                    <span className="text-sm text-[#666666]">积分</span>
                  </div>
                  
                  {pkg.bonus_credits > 0 && (
                    <div className="text-sm text-green-400 mb-2">
                      +{pkg.bonus_credits} 赠送积分
                    </div>
                  )}
                  
                  <div className="text-2xl font-bold text-amber-500 mb-4">
                    ${pkg.price}
                  </div>
                  
                  <Button
                    className={cn(
                      "w-full",
                      pkg.is_popular 
                        ? "bg-amber-500 hover:bg-amber-600 text-black" 
                        : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a]"
                    )}
                    onClick={() => handlePurchase(pkg)}
                    disabled={purchasing}
                  >
                    立即购买
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {packages.length === 0 && (
            <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-12 text-center">
              <Coins className="h-12 w-12 text-[#333333] mx-auto mb-4" />
              <p className="text-[#666666]">暂无可用套餐</p>
            </div>
          )}
        </motion.section>

        {/* Transaction History */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Gift className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-white">积分获取记录</h2>
          </div>
          
          <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] overflow-hidden">
            <ScrollArea className="h-[400px]">
              {incomeTransactions.length > 0 ? (
                <div className="divide-y divide-[#1a1a1a]">
                  {incomeTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-[#111111] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{tx.description || tx.type}</p>
                          <p className="text-sm text-[#666666]">
                            {format(new Date(tx.created_date), 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400">
                          +{tx.amount} 积分
                        </p>
                        <p className="text-xs text-[#444444]">
                          余额: {tx.balance_after}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Gift className="h-12 w-12 text-[#333333] mx-auto mb-4" />
                  <p className="text-[#666666]">暂无获取记录</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </motion.section>
      </div>
    </div>
  );
}