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

      {/* 2. 右上角金色/橙色光晕 - 漂移动画 */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-60 blur-[120px]"
        style={{
          background: `linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 50%, var(--success) 100%)`,
          animation: 'driftTopRight 25s ease-in-out infinite, breathe 8s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* 3. 左侧蓝紫色光晕 - 漂移动画 */}
      <div
        className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
        style={{
          background: `linear-gradient(90deg, rgba(139, 92, 246, 0.5) 0%, var(--info) 100%)`,
          animation: 'driftLeft 30s ease-in-out infinite, breathe 12s ease-in-out infinite 2s',
          willChange: 'transform, opacity',
        }}
      />

      {/* 4. 底部暖色光晕 - 漂移动画 */}
      <div
        className="absolute -bottom-32 left-1/3 w-[700px] h-[400px] rounded-full opacity-40 blur-[120px]"
        style={{
          background: `linear-gradient(0deg, var(--color-secondary) 0%, transparent 100%)`,
          animation: 'driftBottom 22s ease-in-out infinite, breathe 10s ease-in-out infinite 4s',
          willChange: 'transform, opacity',
        }}
      />

      {/* 5. 中心微光效果 - 脉冲扩散 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 blur-[150px]"
        style={{
          background: `linear-gradient(90deg, var(--success) 0%, transparent 50%, var(--info) 100%)`,
          animation: 'pulse 15s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* 6. 网格纹理层 - 缓慢平移 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 60s linear infinite',
        }}
      />

      {/* 6.5 光线扫描效果 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.03) 50%, transparent 60%)',
          animation: 'lightSweep 15s ease-in-out infinite',
        }}
      />

      {/* 8. 噪点纹理层 */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* 8. 浮动光点动画 - 带尾迹和远近感 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => {
          const size = 1 + Math.random() * 2;
          const hasTrail = i < 5;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                background: hasTrail 
                  ? 'linear-gradient(180deg, var(--color-primary), transparent)'
                  : 'var(--color-primary)',
                boxShadow: hasTrail ? `0 0 ${size * 3}px var(--color-primary)` : 'none',
                opacity: 0.15 + Math.random() * 0.25,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `floatAdvanced ${12 + Math.random() * 18}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 8}s`,
              }}
            />
          );
        })}
      </div>

      {/* 9. 暗角遮罩 - 模拟光线被吸入效果 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 20%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.7) 100%)',
        }}
      />



      {/* ============================================
          动画样式定义
          ============================================ */}
      <style>{`
        /* 光晕漂移动画 - 右上角 */
        @keyframes driftTopRight {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-30px, 20px); }
          50% { transform: translate(-50px, 40px); }
          75% { transform: translate(-20px, 25px); }
        }

        /* 光晕漂移动画 - 左侧 */
        @keyframes driftLeft {
          0%, 100% { transform: translate(-48px, 33%); }
          33% { transform: translate(-30px, 38%); }
          66% { transform: translate(-60px, 28%); }
        }

        /* 光晕漂移动画 - 底部 */
        @keyframes driftBottom {
          0%, 100% { transform: translate(33%, 100%); }
          50% { transform: translate(40%, 100%) scale(1.1); }
        }

        /* 呼吸效果 */
        @keyframes breathe {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }

        /* 脉冲效果 */
        @keyframes pulse {
          0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.25; transform: translate(-50%, -50%) scale(1.1); }
        }

        /* 网格平移 */
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }

        /* 光线扫描 */
        @keyframes lightSweep {
          0%, 90%, 100% { transform: translateX(-100%); opacity: 0; }
          45% { transform: translateX(100%); opacity: 1; }
          50% { transform: translateX(100%); opacity: 0; }
        }

        /* 高级浮动光点 - 带远近感 */
        @keyframes floatAdvanced {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-30px) translateX(15px) scale(1.2);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-60px) translateX(-10px) scale(0.8);
            opacity: 0.3;
          }
          75% {
            transform: translateY(-30px) translateX(8px) scale(1.1);
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