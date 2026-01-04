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
    return <div className="min-h-screen bg-[#050505]" />;
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <WelcomeBanner user={user} />
        <SixStepsGuide />
        <UpdatesSection />
      </div>
    </div>
  );
}