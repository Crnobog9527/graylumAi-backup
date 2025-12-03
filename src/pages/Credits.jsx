import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Coins, History, TrendingUp, TrendingDown, Zap, Sparkles, Crown, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Credits() {
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
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

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => base44.entities.CreditTransaction.filter(
      { user_email: user?.email },
      '-created_date',
      20
    ),
    enabled: !!user?.email,
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => setUser(prev => ({ ...prev, ...data })),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create(data),
    onSuccess: () => queryClient.invalidateQueries(['transactions']),
  });

  const handlePurchase = async (pkg) => {
    setPurchasing(true);
    try {
      // In a real implementation, this would integrate with a payment provider
      // For now, we'll simulate a successful purchase
      const totalCredits = pkg.credits + (pkg.bonus_credits || 0);
      const newBalance = (user.credits || 0) + totalCredits;
      
      await updateUserMutation.mutateAsync({
        credits: newBalance,
        total_credits_purchased: (user.total_credits_purchased || 0) + totalCredits,
      });

      await createTransactionMutation.mutateAsync({
        user_email: user.email,
        type: 'purchase',
        amount: totalCredits,
        balance_after: newBalance,
        description: `Purchased ${pkg.name} - ${totalCredits} credits`,
      });

      alert(`Successfully purchased ${totalCredits} credits!`);
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
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
                      ¥{pkg.price}
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

        {/* Transaction History */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-800">交易记录</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <ScrollArea className="h-[400px]">
              {transactions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          tx.amount >= 0 ? "bg-green-100" : "bg-red-100"
                        )}>
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{tx.description || tx.type}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(tx.created_date), 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount} 积分
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
                  <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无交易记录</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  );
}