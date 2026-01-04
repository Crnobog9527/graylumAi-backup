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
          {/* --- Background System --- */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        {/* 1. Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#000000] via-[#050505] to-[#0A0A0A]" />

        {/* 2. Silver Accretion Disk / Event Horizon Effect */}
        {/* We use z-[2] to ensure it sits above the base background but behind content */}
        <div className="absolute bottom-0 left-0 right-0 h-[100%] z-[2] overflow-hidden flex items-end justify-center">
            
             {/* Wide Atmospheric Glow (The Halo) */}
             <div className="absolute bottom-[-100px] w-[180%] h-[600px] rounded-[100%] bg-gradient-to-t from-gray-800/20 via-slate-900/10 to-transparent blur-[100px]" />

             {/* The Silver Arc (Main Visual) */}
             {/* Increased opacity and size to be visible behind the grid */}
             <div className="absolute bottom-[-350px] w-[120%] h-[700px] rounded-[100%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-gray-400/10 to-transparent blur-[70px]" />
             
             {/* The Bright Core (Accretion Disk) */}
             <div className="absolute bottom-[-120px] w-[80%] h-[300px] rounded-[100%] bg-gradient-to-t from-white/30 via-gray-200/5 to-transparent blur-[40px] mix-blend-overlay" />

             {/* Sharp Horizon Line (Event Horizon) */}
             <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent shadow-[0_0_30px_rgba(255,255,255,0.4)]" />
        </div>

        {/* 3. Noise Texture */}
        <div className="absolute inset-0 z-[3] opacity-[0.12] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* 4. Falling Rain Particles */}
        <ParticleBackground />
        
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