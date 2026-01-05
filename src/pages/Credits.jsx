import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Coins, History, TrendingUp, TrendingDown, Zap, Sparkles, Crown, Package, Check, Gift, Star, Rocket } from 'lucide-react';
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
    alert(`即将跳转支付页面购买 ${pkg.name}（${pkg.credits} 积分），价格 $${pkg.price}\n\n请联系管理员完成支付或接入支付系统。`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  const totalPurchased = user?.total_credits_purchased || 0;
  const totalUsed = user?.total_credits_used || 0;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* 动态背景系统 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 顶部主光晕 */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-50 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            animation: 'pulseGlow 12s ease-in-out infinite',
          }}
        />
        {/* 左侧紫色光晕 */}
        <div
          className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full opacity-30 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, transparent 70%)',
            animation: 'floatLeft 18s ease-in-out infinite',
          }}
        />
        {/* 右侧蓝色光晕 */}
        <div
          className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-25 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%)',
            animation: 'floatRight 20s ease-in-out infinite',
          }}
        />
        {/* 底部金色光晕 */}
        <div
          className="absolute -bottom-40 left-1/4 w-[600px] h-[400px] rounded-full opacity-30 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)',
            animation: 'pulseGlow 15s ease-in-out infinite reverse',
          }}
        />
        {/* 网格纹理 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* 星尘光点 */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              background: i % 3 === 0 ? 'var(--color-primary)' : i % 3 === 1 ? 'rgba(139,92,246,0.8)' : 'rgba(59,130,246,0.8)',
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.15); }
        }
        @keyframes floatLeft {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -40px); }
        }
        @keyframes floatRight {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-40px, 30px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3), 0 0 40px rgba(255,215,0,0.1); }
          50% { box-shadow: 0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(255,215,0,0.2); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease forwards;
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .btn-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .card-hover {
          transition: all 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
      `}</style>

      <div className="relative z-10 max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fadeInUp">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.1) 100%)',
              border: '1px solid rgba(255,215,0,0.3)',
              boxShadow: '0 0 40px rgba(255,215,0,0.2)',
            }}
          >
            <Coins className="h-10 w-10" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #FFF 50%, var(--color-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            充值中心
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            解锁无限 AI 创作潜能，选择适合您的方案
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {[
            { label: '当前积分', value: user?.credits || 0, icon: Coins, color: 'var(--color-primary)', gradient: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.05) 100%)' },
            { label: '累计购买', value: totalPurchased, icon: TrendingUp, color: 'var(--success)', gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)' },
            { label: '累计消耗', value: totalUsed, icon: Zap, color: 'rgba(59,130,246,1)', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)' },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="rounded-2xl p-6 card-hover animate-fadeInUp"
              style={{
                background: stat.gradient,
                border: '1px solid var(--border-primary)',
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
                >
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</span>
              </div>
              <div
                className="text-4xl font-bold"
                style={{
                  background: `linear-gradient(135deg, ${stat.color} 0%, var(--text-primary) 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Membership Plans */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}
              >
                <Crown className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>会员订阅</h2>
            </div>

            <div
              className="inline-flex items-center rounded-xl p-1"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
            >
              <button
                onClick={() => setBillingCycle('monthly')}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                style={{
                  background: billingCycle === 'monthly' ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' : 'transparent',
                  color: billingCycle === 'monthly' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  boxShadow: billingCycle === 'monthly' ? '0 4px 15px rgba(255,215,0,0.3)' : 'none',
                }}
              >
                按月支付
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2"
                style={{
                  background: billingCycle === 'yearly' ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' : 'transparent',
                  color: billingCycle === 'yearly' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  boxShadow: billingCycle === 'yearly' ? '0 4px 15px rgba(255,215,0,0.3)' : 'none',
                }}
              >
                按年支付
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {membershipPlans.map((plan, index) => {
              const isCurrentPlan = user?.subscription_tier === plan.level;
              const isRecommended = plan.level === 'gold';
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
                  className={cn("relative rounded-2xl p-6 card-hover animate-fadeInUp", isRecommended && "btn-glow")}
                  style={{
                    background: isRecommended
                      ? 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 100%)'
                      : 'var(--bg-secondary)',
                    border: isRecommended
                      ? '2px solid rgba(255,215,0,0.5)'
                      : '1px solid var(--border-primary)',
                    animationDelay: `${index * 0.15}s`,
                  }}
                >
                  {isRecommended && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        color: 'var(--bg-primary)',
                        boxShadow: '0 4px 15px rgba(255,215,0,0.4)',
                      }}
                    >
                      <Sparkles className="h-3 w-3" />
                      最受欢迎
                    </div>
                  )}

                  <div className="text-center mb-6 pt-2">
                    <div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                      style={{
                        background: isRecommended ? 'rgba(255,215,0,0.15)' : 'var(--bg-primary)',
                        border: `1px solid ${isRecommended ? 'rgba(255,215,0,0.3)' : 'var(--border-primary)'}`,
                      }}
                    >
                      <Crown className="h-7 w-7" style={{ color: isRecommended ? 'var(--color-primary)' : 'var(--text-secondary)' }} />
                    </div>
                    <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                  </div>

                  <div className="text-center mb-6">
                    {plan.level === 'free' ? (
                      <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>免费</div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>$</span>
                          <span
                            className="text-4xl font-bold"
                            style={{
                              background: isRecommended
                                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)'
                                : 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {displayPrice}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)' }}>/{displayPeriod}</span>
                        </div>
                        {billingCycle === 'yearly' && monthlyEquivalent && (
                          <div className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                            折合 ${monthlyEquivalent.toFixed(1)}/月
                          </div>
                        )}
                        {discount > 0 && (
                          <div
                            className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}
                          >
                            节省 {discount}%
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features?.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="h-5 w-5 shrink-0" style={{ color: 'var(--success)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold rounded-xl transition-all duration-300"
                    disabled={isCurrentPlan || purchasing}
                    style={{
                      background: isCurrentPlan
                        ? 'var(--bg-primary)'
                        : isRecommended
                          ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)'
                          : 'var(--bg-primary)',
                      color: isCurrentPlan
                        ? 'var(--text-disabled)'
                        : isRecommended
                          ? 'var(--bg-primary)'
                          : 'var(--text-primary)',
                      border: isCurrentPlan || isRecommended ? 'none' : '1px solid var(--border-primary)',
                      boxShadow: isRecommended && !isCurrentPlan ? '0 8px 25px rgba(255,215,0,0.4)' : 'none',
                    }}
                  >
                    {isCurrentPlan ? '当前套餐' : isRecommended ? '立即升级' : '选择此套餐'}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Credit Packages */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="p-2 rounded-lg"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <Package className="h-5 w-5" style={{ color: 'rgba(59,130,246,1)' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>积分加油包</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {packages.map((pkg, index) => {
              const totalCredits = pkg.credits + (pkg.bonus_credits || 0);
              const isPopular = pkg.is_popular;
              return (
                <div
                  key={pkg.id}
                  className={cn("relative rounded-2xl p-5 card-hover animate-fadeInUp", isPopular && "btn-glow")}
                  style={{
                    background: isPopular
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.1) 100%)'
                      : 'var(--bg-secondary)',
                    border: isPopular
                      ? '2px solid rgba(59,130,246,0.5)'
                      : '1px solid var(--border-primary)',
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(139,92,246,1) 100%)',
                        color: '#FFF',
                        boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                      }}
                    >
                      <Star className="h-3 w-3" />
                      热门
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Zap className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                      <span
                        className="text-3xl font-bold"
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
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3"
                        style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}
                      >
                        +{pkg.bonus_credits} 赠送
                      </div>
                    )}

                    <div
                      className="text-3xl font-bold mb-5"
                      style={{
                        background: isPopular
                          ? 'linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(139,92,246,1) 100%)'
                          : 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      ${pkg.price}
                    </div>

                    <Button
                      className="w-full h-11 font-semibold rounded-xl transition-all duration-300"
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing}
                      style={{
                        background: isPopular
                          ? 'linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(139,92,246,1) 100%)'
                          : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        color: isPopular ? '#FFF' : 'var(--bg-primary)',
                        boxShadow: isPopular
                          ? '0 8px 25px rgba(59,130,246,0.4)'
                          : '0 8px 25px rgba(255,215,0,0.3)',
                      }}
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      立即购买
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {packages.length === 0 && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
            >
              <Coins className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-disabled)' }} />
              <p style={{ color: 'var(--text-tertiary)' }}>暂无可用套餐</p>
            </div>
          )}
        </section>

        {/* Transaction History */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div
              className="p-2 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <Gift className="h-5 w-5" style={{ color: 'var(--success)' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>积分获取记录</h2>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
          >
            <ScrollArea className="h-[400px]">
              {incomeTransactions.length > 0 ? (
                <div>
                  {incomeTransactions.map((tx, index) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 transition-colors"
                      style={{
                        borderBottom: index < incomeTransactions.length - 1 ? '1px solid var(--border-primary)' : 'none',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,215,0,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="p-2.5 rounded-xl"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                        >
                          <TrendingUp className="h-4 w-4" style={{ color: 'var(--success)' }} />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{tx.description || tx.type}</p>
                          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                            {format(new Date(tx.created_date), 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: 'var(--success)' }}>
                          +{tx.amount} 积分
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                          余额: {tx.balance_after}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <Gift className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-disabled)' }} />
                  <p style={{ color: 'var(--text-tertiary)' }}>暂无获取记录</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  );
}
