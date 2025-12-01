import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ProfileSidebar, SubscriptionCard, CreditStatsCard, OrderHistory } from '@/components/profile/ProfileComponents';
import { UserProfileHeader, CreditsAndSubscriptionCards, UsageStatsCard, QuickActionsCard } from '@/components/profile/PersonalInfoCard';
import { Button } from "@/components/ui/button";
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (!user) {
     return <div className="min-h-screen bg-slate-50" />;
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
                    <QuickActionsCard />
                  </>
                )}

                {activeTab === 'subscription' && (
                  <>
                    <SubscriptionCard />
                    <CreditStatsCard credits={user.credits} />
                    <OrderHistory />
                  </>
                )}
                
                {activeTab === 'credits' && <CreditStatsCard credits={user.credits} />}
                
                {activeTab === 'history' && <OrderHistory />}
                
                {activeTab === 'security' && (
                   <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center py-20 text-slate-500">
                     安全设置功能开发中...
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}