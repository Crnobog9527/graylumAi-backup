import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coins, Crown, Package, Check, Gift, Star, Rocket, Sparkles, Zap, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export default function CreditsDialog({ open, onOpenChange, user }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [purchasing, setPurchasing] = useState(false);
  const queryClient = useQueryClient();

  const { data: packages = [] } = useQuery({
    queryKey: ['creditPackages'],
    queryFn: () => base44.entities.CreditPackage.filter({ is_active: true }, 'sort_order'),
    enabled: open,
  });

  const { data: membershipPlans = [] } = useQuery({
    queryKey: ['membershipPlans'],
    queryFn: () => base44.entities.MembershipPlan.filter({ is_active: true }, 'sort_order'),
    enabled: open,
  });

  const handlePurchase = async (pkg) => {
    alert(`即将跳转支付页面购买 ${pkg.name}（${pkg.credits} 积分），价格 $${pkg.price}\n\n请联系管理员完成支付或接入支付系统。`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] p-0 overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div
              className="p-2 rounded-lg"
              style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}
            >
              <Coins className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            充值中心
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-100px)] px-6 pb-6">
          {/* Membership Plans */}
          <section className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>会员订阅</h3>
              </div>

              <div
                className="inline-flex items-center rounded-lg p-1"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-300"
                  style={{
                    background: billingCycle === 'monthly' ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' : 'transparent',
                    color: billingCycle === 'monthly' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  }}
                >
                  按月
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-1"
                  style={{
                    background: billingCycle === 'yearly' ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' : 'transparent',
                    color: billingCycle === 'yearly' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  }}
                >
                  按年
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: billingCycle === 'yearly' ? 'rgba(0,0,0,0.2)' : 'rgba(34,197,94,0.2)',
                      color: billingCycle === 'yearly' ? 'var(--bg-primary)' : 'var(--success)',
                    }}
                  >
                    省20%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {membershipPlans.map((plan, index) => {
                const isCurrentPlan = user?.subscription_tier === plan.level;
                const isRecommended = plan.level === 'gold';
                const displayPrice = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
                const displayPeriod = billingCycle === 'monthly' ? '月' : '年';

                return (
                  <div
                    key={plan.id}
                    className={cn("relative rounded-xl p-4 transition-all duration-300")}
                    style={{
                      background: isRecommended
                        ? 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 100%)'
                        : 'var(--bg-secondary)',
                      border: isRecommended
                        ? '2px solid rgba(255,215,0,0.5)'
                        : '1px solid var(--border-primary)',
                    }}
                  >
                    {isRecommended && (
                      <div
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                        style={{
                          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                          color: 'var(--bg-primary)',
                        }}
                      >
                        <Sparkles className="h-3 w-3" />
                        推荐
                      </div>
                    )}

                    <div className="text-center mb-3 pt-1">
                      <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{plan.name}</h4>
                    </div>

                    <div className="text-center mb-3">
                      {plan.level === 'free' ? (
                        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>免费</div>
                      ) : (
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>$</span>
                          <span
                            className="text-3xl font-bold"
                            style={{
                              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {displayPrice}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>/{displayPeriod}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      {plan.features?.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full h-9 text-sm font-semibold rounded-lg"
                      disabled={isCurrentPlan || purchasing}
                      style={{
                        background: isCurrentPlan
                          ? 'var(--bg-primary)'
                          : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        color: isCurrentPlan ? 'var(--text-disabled)' : 'var(--bg-primary)',
                        border: isCurrentPlan ? '1px solid var(--border-primary)' : 'none',
                      }}
                    >
                      {isCurrentPlan ? '当前套餐' : '选择'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Credit Packages */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5" style={{ color: 'rgba(59,130,246,1)' }} />
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>积分加油包</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {packages.map((pkg, index) => {
                const isPopular = pkg.is_popular;
                return (
                  <div
                    key={pkg.id}
                    className="relative rounded-xl p-4 transition-all duration-300"
                    style={{
                      background: isPopular
                        ? 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.1) 100%)'
                        : 'var(--bg-secondary)',
                      border: isPopular
                        ? '2px solid rgba(59,130,246,0.5)'
                        : '1px solid var(--border-primary)',
                    }}
                  >
                    {isPopular && (
                      <div
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(139,92,246,1) 100%)',
                          color: '#FFF',
                        }}
                      >
                        <Star className="h-3 w-3" />
                        热门
                      </div>
                    )}

                    <div className="text-center pt-1">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Zap className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                        <span
                          className="text-2xl font-bold"
                          style={{
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {pkg.credits.toLocaleString()}
                        </span>
                      </div>

                      {pkg.bonus_credits > 0 && (
                        <div
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
                          style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}
                        >
                          +{pkg.bonus_credits} 赠送
                        </div>
                      )}

                      <div
                        className="text-xl font-bold mb-3"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        ${pkg.price}
                      </div>

                      <Button
                        className="w-full h-9 text-sm font-semibold rounded-lg"
                        onClick={() => handlePurchase(pkg)}
                        disabled={purchasing}
                        style={{
                          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                          color: 'var(--bg-primary)',
                        }}
                      >
                        <Rocket className="h-4 w-4 mr-1" />
                        购买
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {packages.length === 0 && (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                <Coins className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--text-disabled)' }} />
                <p style={{ color: 'var(--text-tertiary)' }}>暂无可用套餐</p>
              </div>
            )}
          </section>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}