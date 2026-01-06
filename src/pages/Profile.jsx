import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ProfileSidebar, SubscriptionCard, CreditStatsCard, OrderHistory, UsageHistoryCard, SecuritySettingsCard } from '@/components/profile/ProfileComponents';
import { UserProfileHeader, CreditsAndSubscriptionCards, UsageStatsCard, QuickActionsCard } from '@/components/profile/PersonalInfoCard';
import TicketsPanel from '@/components/profile/TicketsPanel';
import { Button } from "@/components/ui/button";
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const [ticketInitialView, setTicketInitialView] = useState('list');
  const [localUser, setLocalUser] = useState(null);

  const handleNavigateToCreateTicket = () => {
    setTicketInitialView('create');
    setActiveTab('tickets');
  };

  const handleNavigateToSecurity = () => {
    setActiveTab('security');
  };

  const { data: fetchedUser, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const user = localUser || fetchedUser;

  const handleUserUpdate = (updatedUser) => {
    setLocalUser(updatedUser);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>请先登录</p>
          <Button
            onClick={() => base44.auth.redirectToLogin()}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'var(--bg-primary)'
            }}
          >
            登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* 动态背景 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 顶部金色光晕 */}
        <div
          className="absolute -top-32 left-1/3 w-[600px] h-[400px] rounded-full opacity-40 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            animation: 'pulseGlow 15s ease-in-out infinite',
          }}
        />
        {/* 右下紫色光晕 */}
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-30 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
            animation: 'floatSoft 20s ease-in-out infinite',
          }}
        />
        {/* 网格纹理 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes floatSoft {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, -20px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease forwards;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease forwards;
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative" style={{ zIndex: 1 }}>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Mobile Sidebar Trigger */}
          <div className="md:hidden mb-4">
             <Sheet>
               <SheetTrigger asChild>
                 <Button
                   variant="outline"
                   className="w-full justify-start gap-2"
                   style={{
                     background: 'var(--bg-secondary)',
                     borderColor: 'var(--border-primary)',
                     color: 'var(--text-secondary)'
                   }}
                 >
                   <Menu className="h-4 w-4" />
                   菜单
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-72 p-0 pt-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                 <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
               </SheetContent>
             </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <div className="animate-slideInLeft">
            <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
             <div className="animate-fadeInUp">
                {activeTab === 'profile' && (
                    <>
                      <UserProfileHeader user={user} onUserUpdate={handleUserUpdate} />
                      <CreditsAndSubscriptionCards user={user} onNavigateToSubscription={() => setActiveTab('subscription')} />
                      <UsageStatsCard user={user} />
                      <QuickActionsCard user={user} onNavigateToTickets={handleNavigateToCreateTicket} onNavigateToSecurity={handleNavigateToSecurity} />
                    </>
                  )}

                {activeTab === 'subscription' && (
                  <>
                    <SubscriptionCard user={user} />
                    <CreditStatsCard user={user} />
                  </>
                )}

                {activeTab === 'credits' && <CreditStatsCard user={user} />}

                {activeTab === 'history' && <UsageHistoryCard user={user} />}

                {activeTab === 'security' && <SecuritySettingsCard user={user} />}

                {activeTab === 'tickets' && (
                  <TicketsPanel 
                    user={user} 
                    key={`${activeTab}-${ticketInitialView}`}
                    initialView={ticketInitialView}
                    onViewChange={(v) => setTicketInitialView(v)}
                  />
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}