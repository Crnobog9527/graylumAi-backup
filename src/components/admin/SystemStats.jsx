import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, Coins, FileText, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SystemStats() {
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => base44.entities.Conversation.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => base44.entities.CreditTransaction.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => base44.entities.PromptTemplate.list(),
  });

  const totalCreditsInCirculation = users.reduce((sum, u) => sum + (u.credits || 0), 0);
  const totalCreditsUsed = transactions
    .filter(t => t.type === 'usage')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const stats = [
    {
      title: 'Total Users',
      value: users.length.toLocaleString(),
      icon: Users,
      gradient: 'from-indigo-500 to-purple-600',
      bgGradient: 'from-indigo-50 to-purple-50',
    },
    {
      title: 'Conversations',
      value: conversations.length.toLocaleString(),
      icon: MessageSquare,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Credits in Circulation',
      value: totalCreditsInCirculation.toLocaleString(),
      icon: Coins,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
    },
    {
      title: 'Credits Used',
      value: totalCreditsUsed.toLocaleString(),
      icon: TrendingUp,
      gradient: 'from-rose-500 to-pink-600',
      bgGradient: 'from-rose-50 to-pink-50',
    },
    {
      title: 'Active Templates',
      value: templates.filter(t => t.is_active).length.toLocaleString(),
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Transactions',
      value: transactions.length.toLocaleString(),
      icon: Activity,
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-50 to-purple-50',
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className={cn("border-0 bg-gradient-to-br", stat.bgGradient)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-lg", stat.gradient)}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}