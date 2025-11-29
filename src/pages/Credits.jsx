import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Coins, CreditCard, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Clock, Sparkles,
  Check, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const creditPackages = [
  { id: 1, credits: 100, price: 9.99, popular: false },
  { id: 2, credits: 500, price: 39.99, popular: true, savings: '20%' },
  { id: 3, credits: 1000, price: 69.99, popular: false, savings: '30%' },
  { id: 4, credits: 5000, price: 299.99, popular: false, savings: '40%' },
];

export default function Credits() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => base44.entities.CreditTransaction.filter(
      { user_email: user?.email },
      '-created_date',
      50
    ),
    enabled: !!user?.email,
  });

  const handlePurchase = async (pkg) => {
    // In a real app, this would integrate with a payment provider
    toast.info('Payment integration coming soon!');
  };

  const totalUsed = transactions
    .filter(t => t.type === 'usage')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalPurchased = transactions
    .filter(t => t.type === 'purchase' || t.type === 'bonus')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 mb-4">
              <Coins className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">
              Credits & Billing
            </h1>
            <p className="text-slate-500 max-w-lg mx-auto">
              Manage your credits and view transaction history
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200">
                  <Coins className="h-5 w-5 text-white" />
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0">Current</Badge>
              </div>
              <p className="text-sm text-amber-600 font-medium">Available Credits</p>
              <p className="text-3xl font-bold text-amber-800">{(user?.credits || 0).toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-200">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-green-600 font-medium">Total Purchased</p>
              <p className="text-3xl font-bold text-green-800">{totalPurchased.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 shadow-lg shadow-indigo-200">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-indigo-600 font-medium">Total Used</p>
              <p className="text-3xl font-bold text-indigo-800">{totalUsed.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Packages */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-slate-600" />
            Purchase Credits
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPackages.map((pkg) => (
              <Card
                key={pkg.id}
                className={cn(
                  "relative overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer",
                  pkg.popular
                    ? "border-indigo-300 shadow-xl shadow-indigo-100"
                    : "border-slate-200 hover:border-indigo-200 hover:shadow-lg"
                )}
                onClick={() => handlePurchase(pkg)}
              >
                {pkg.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}
                {pkg.savings && (
                  <Badge className="absolute top-3 left-3 bg-green-100 text-green-700 border-0">
                    Save {pkg.savings}
                  </Badge>
                )}
                <CardContent className="p-6 pt-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className={cn(
                      "h-5 w-5",
                      pkg.popular ? "text-indigo-500" : "text-amber-500"
                    )} />
                    <span className="text-2xl font-bold text-slate-800">
                      {pkg.credits.toLocaleString()}
                    </span>
                    <span className="text-slate-500">credits</span>
                  </div>
                  
                  <p className="text-3xl font-bold text-slate-800 mb-4">
                    ${pkg.price}
                  </p>
                  
                  <Button
                    className={cn(
                      "w-full",
                      pkg.popular
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        : "bg-slate-800 hover:bg-slate-900"
                    )}
                  >
                    Purchase
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-slate-600" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-slate-100 mb-4">
                    <Clock className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          tx.amount > 0
                            ? "bg-green-100"
                            : "bg-red-100"
                        )}>
                          {tx.amount > 0 
                            ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                            : <ArrowDownRight className="h-4 w-4 text-red-600" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{tx.description}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(tx.created_date), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          tx.amount > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          Balance: {tx.balance_after?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}