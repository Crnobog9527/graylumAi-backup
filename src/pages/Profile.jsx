import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ProfileSidebar, SubscriptionCard, CreditStatsCard, OrderHistory, UsageHistoryCard, SecuritySettingsCard } from '@/components/profile/ProfileComponents';
import { UserProfileHeader, CreditsAndSubscriptionCards, UsageStatsCard, QuickActionsCard } from '@/components/profile/PersonalInfoCard';
import { Button } from "@/components/ui/button";
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">请先登录</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Mobile Sidebar Trigger */}
          <div className="md:hidden mb-4">
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="outline" className="w-full justify-start gap-2">
                   <Menu className="h-4 w-4" />
                   菜单
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-72 p-0 pt-6">
                 <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
               </SheetContent>
             </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'profile' && (
                  <>
                    <UserProfileHeader user={user} />
                    <CreditsAndSubscriptionCards user={user} />
                    <UsageStatsCard user={user} />
                    <QuickActionsCard user={user} />
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
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}