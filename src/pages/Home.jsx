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
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      {/* 光晕层 - 底部氛围光 */}
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-radial from-white/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full bg-gradient-radial from-[#FFD02F]/5 to-transparent blur-[100px] pointer-events-none" />
      
      {/* 噪点层 */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* 内容层 */}
      <div className="relative z-10 container mx-auto px-6 py-10 max-w-7xl">
        <WelcomeBanner user={user} />
        <SixStepsGuide />
        <UpdatesSection />
      </div>
    </div>
  );
}