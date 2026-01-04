import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ProfileSidebar, SubscriptionCard, CreditStatsCard, OrderHistory, UsageHistoryCard, SecuritySettingsCard } from '@/components/profile/ProfileComponents';
import { UserProfileHeader, CreditsAndSubscriptionCards, UsageStatsCard, QuickActionsCard } from '@/components/profile/PersonalInfoCard';
import { Button } from "@/components/ui/button";
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from 'framer-motion';

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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#666666] mb-4">请先登录</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-amber-500 hover:bg-amber-600 text-black">
            登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Mobile Sidebar Trigger */}
          <div className="md:hidden mb-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 bg-[#0a0a0a] border-[#1a1a1a] text-white hover:bg-[#1a1a1a]">
                  <Menu className="h-4 w-4" />
                  菜单
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 pt-6 bg-[#0a0a0a] border-[#1a1a1a]">
                <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
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
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}