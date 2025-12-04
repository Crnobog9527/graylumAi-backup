import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import WelcomeBanner from '@/components/home/WelcomeBanner';
import SixStepsGuide from '@/components/home/SixStepsGuide';
import UpdatesSection from '@/components/home/UpdatesSection';

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  if (!user) {
    // Assuming Layout handles redirect or waiting for auth, but for Home we might want to show something even if loading
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <WelcomeBanner user={user} />
      
      <SixStepsGuide />
      
      <UpdatesSection />
    </div>
  );
}