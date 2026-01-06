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

      {/* 2. 右上角金色光晕 - 简化动画 */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-40 blur-[100px]"
        style={{
          background: `linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)`,
          willChange: 'transform',
          contain: 'layout paint',
        }}
      />

      {/* 3. 左侧紫色光晕 - 静态 */}
      <div
        className="absolute top-1/4 -left-32 w-[400px] h-[400px] rounded-full opacity-20 blur-[80px]"
        style={{
          background: `rgba(139, 92, 246, 0.5)`,
          contain: 'layout paint',
        }}
      />

      {/* 4. 底部暖色光晕 - 静态 */}
      <div
        className="absolute -bottom-32 left-1/4 w-[500px] h-[300px] rounded-full opacity-30 blur-[100px]"
        style={{
          background: `var(--color-secondary)`,
          contain: 'layout paint',
        }}
      />

      {/* 5. 网格纹理层 - 静态 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          contain: 'layout paint',
        }}
      />

      {/* 6. 暗角遮罩 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%)',
          contain: 'layout paint',
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