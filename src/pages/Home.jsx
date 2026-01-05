import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import WelcomeBanner from '@/components/home/WelcomeBanner';
import SixStepsGuide from '@/components/home/SixStepsGuide';
import UpdatesSection from '@/components/home/UpdatesSection';

/**
 * 首页组件 - Premium Tech Editorial 版本
 *
 * 使用设计系统:
 * - 背景层: bg-glow, bg-grid, bg-noise
 * - 动画: fadeInUp, float, pulse
 * - 布局: container, 设计系统间距变量
 */
export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  if (!user) {
    return <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />;
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ============================================
          动态背景系统 - Premium Tech Editorial
          ============================================ */}

      {/* 1. 基础发光渐变层 (使用 CSS 类) */}
      <div className="bg-glow" />

      {/* 2. 网格图案层 (使用 CSS 类) */}
      <div className="bg-grid" />

      {/* 3. 噪点纹理层 (使用 CSS 类) */}
      <div className="bg-noise" />

      {/* 4. 右上角金色光晕 - 品牌色强化 */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.08) 50%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite'
        }}
      />

      {/* 5. 左下角蓝紫色光晕 - 对比色 */}
      <div
        className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%)',
        }}
      />

      {/* 6. 中心微光效果 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full blur-[150px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(255, 215, 0, 0.03) 0%, transparent 70%)',
        }}
      />

      {/* 7. 浮动金色光点动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: 'var(--color-primary)',
              opacity: 0.15 + Math.random() * 0.2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${10 + Math.random() * 15}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* ============================================
          内容层
          ============================================ */}
      <div
        className="relative z-10 container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6 md:py-8"
      >
        {/* 欢迎横幅 */}
        <WelcomeBanner user={user} />

        {/* 六步指南 */}
        <SixStepsGuide />

        {/* 更新公告 */}
        <UpdatesSection />
      </div>
    </div>
  );
}
