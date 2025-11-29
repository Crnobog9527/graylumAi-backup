import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Coins, History, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

import CreditBalance from '../components/credits/CreditBalance';
import CreditPackageCard from '../components/credits/CreditPackageCard';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Chat')}>
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Credits</h1>
          <p className="text-slate-500 mt-1">Purchase credits to use AI features</p>
        </div>

        {/* Balance Card */}
        <div className="mb-10">
          <CreditBalance credits={user.credits} onBuyClick={() => {}} />
        </div>

        {/* Credit Packages */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Buy Credits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <CreditPackageCard
                key={pkg.id}
                package={pkg}
                onPurchase={handlePurchase}
                isLoading={purchasing}
              />
            ))}
          </div>
          {packages.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Coins className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No credit packages available yet.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Transaction History */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transactions
          </h2>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {transactions.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-slate-100">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{tx.description}</p>
                            <p className="text-sm text-slate-500">
                              {format(new Date(tx.created_date), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount}
                          </p>
                          <p className="text-xs text-slate-400">
                            Balance: {tx.balance_after}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No transactions yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}