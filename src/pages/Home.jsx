import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import WelcomeBanner from '@/components/home/WelcomeBanner';
import SixStepsGuide from '@/components/home/SixStepsGuide';
import UpdatesSection from '@/components/home/UpdatesSection';

/**
 * 首页组件
 * 使用设计系统: 背景色、容器布局、动画效果
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
          动态背景系统 - 多层叠加效果
          ============================================ */}

      {/* 1. 基础渐变层 */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)`
        }}
      />

      {/* 2. 右上角金色/橙色光晕 - 品牌色呼应 */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-60 blur-[120px] animate-pulse"
        style={{
          background: `linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 50%, var(--success) 100%)`,
          animationDuration: '8s'
        }}
      />

      {/* 3. 左侧蓝紫色光晕 */}
      <div
        className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
        style={{
          background: `linear-gradient(90deg, rgba(139, 92, 246, 0.5) 0%, var(--info) 100%)`
        }}
      />

      {/* 4. 底部暖色光晕 */}
      <div
        className="absolute -bottom-32 left-1/3 w-[700px] h-[400px] rounded-full opacity-40 blur-[120px]"
        style={{
          background: `linear-gradient(0deg, var(--color-secondary) 0%, transparent 100%)`
        }}
      />

      {/* 5. 中心微光效果 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 blur-[150px]"
        style={{
          background: `linear-gradient(90deg, var(--success) 0%, transparent 50%, var(--info) 100%)`
        }}
      />

      {/* 6. 网格纹理层 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* 7. 噪点纹理层 */}
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
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: 'var(--color-primary)',
              opacity: 0.2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* ============================================
          动画样式定义
          ============================================ */}
      <style>{`
        /* 浮动光点动画 */
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

        /* 入场动画 - 从下往上淡入 */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 卡片悬停时图标和边框变金色 */
        .card-clickable:hover {
          border-color: var(--color-primary) !important;
        }
        .card-clickable:hover .heading-4 {
          color: var(--color-primary) !important;
        }
        .card-clickable:hover svg {
          color: var(--color-primary) !important;
        }
        .card-clickable:hover > div:first-child > div:first-child {
          border-color: var(--color-primary) !important;
        }
      `}</style>

      {/* ============================================
          内容层
          ============================================ */}
      <div
        className="relative container mx-auto max-w-7xl"
        style={{
          zIndex: 'var(--z-base)',
          padding: 'var(--space-xl) var(--space-lg)'
        }}
      >
        <WelcomeBanner user={user} />
        <SixStepsGuide />
        <UpdatesSection />
      </div>
    </div>
  );
}