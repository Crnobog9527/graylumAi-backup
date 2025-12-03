import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, Bot, Wand2, CreditCard, Coins, TrendingUp, MessageSquare, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';

import AdminSidebar from '../components/admin/AdminSidebar';
import StatsCard from '../components/admin/StatsCard';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

function AdminDashboardContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: models = [] } = useQuery({
    queryKey: ['admin-models'],
    queryFn: () => base44.entities.AIModel.list(),
    enabled: !!user,
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['admin-prompts'],
    queryFn: () => base44.entities.PromptModule.list(),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => base44.entities.CreditTransaction.list('-created_date', 50),
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => base44.entities.Conversation.list('-created_date', 50),
    enabled: !!user,
  });

  const totalCreditsUsed = transactions
    .filter(t => t.type === 'usage')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalRevenue = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminDashboard" />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t('dashboardTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('dashboardSubtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title={t('totalUsers')}
            value={users.length}
            icon={Users}
            color="violet"
            trend="up"
            trendValue="+12%"
          />
          <StatsCard
            title={t('totalModels')}
            value={models.length}
            subtitle={`${models.filter(m => m.is_active).length} ${t('active').toLowerCase()}`}
            icon={Bot}
            color="blue"
          />
          <StatsCard
            title={t('totalModules')}
            value={promptModules.length}
            subtitle={`${promptModules.filter(m => m.is_active).length} ${t('active').toLowerCase()}`}
            icon={Wand2}
            color="emerald"
          />
          <StatsCard
            title={t('recentConversations')}
            value={conversations.length}
            icon={MessageSquare}
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StatsCard
            title={t('totalCreditsUsed')}
            value={totalCreditsUsed.toLocaleString()}
            icon={Coins}
            color="rose"
          />
          <StatsCard
            title={t('totalPurchased')}
            value={totalRevenue.toLocaleString()}
            icon={TrendingUp}
            color="emerald"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-500" />
                {t('recentTransactions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{tx.user_email}</p>
                      <p className="text-xs text-slate-500">{tx.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(tx.created_date), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No transactions yet</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-violet-500" />
                {t('recentConversations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {conversations.slice(0, 10).map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{conv.title || 'Untitled'}</p>
                      <p className="text-xs text-slate-500">{conv.created_by}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">{conv.messages?.length || 0} messages</p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(conv.created_date), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No conversations yet</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <LanguageProvider>
      <AdminDashboardContent />
    </LanguageProvider>
  );
}