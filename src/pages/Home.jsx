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
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* 动态背景系统 */}
      
      {/* 1. 基础渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111111] to-[#0A0A0A]" />
      
      {/* 2. 彩色光晕 - 右上角橙色/绿色渐变 */}
      <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-60 blur-[120px] bg-gradient-to-br from-orange-500/40 via-yellow-400/30 to-green-400/40 animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* 3. 左侧蓝紫色光晕 */}
      <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px] bg-gradient-to-r from-purple-600/50 to-blue-500/40" />
      
      {/* 4. 底部暖色光晕 */}
      <div className="absolute -bottom-32 left-1/3 w-[700px] h-[400px] rounded-full opacity-40 blur-[120px] bg-gradient-to-t from-amber-600/30 via-orange-500/20 to-transparent" />
      
      {/* 5. 中心微光 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 blur-[150px] bg-gradient-to-r from-emerald-500/20 via-transparent to-cyan-500/20" />
      
      {/* 6. 网格纹理 */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* 7. 噪点层 */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      
      {/* 8. 浮动光点动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      
      {/* 动画样式 */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-40px) translateX(-10px);
            opacity: 0.3;
          }
          75% {
            transform: translateY(-20px) translateX(5px);
            opacity: 0.6;
          }
        }
      `}</style>
      
      {/* 内容层 */}
      <div className="relative z-10 container mx-auto px-6 py-10 max-w-7xl">
        <WelcomeBanner user={user} />
        <SixStepsGuide />
        <UpdatesSection />
      </div>
    </div>
  );
}