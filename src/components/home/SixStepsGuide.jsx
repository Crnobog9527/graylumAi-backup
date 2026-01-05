import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  PlayCircle,
  Target,
  Search,
  Compass,
  FileText,
  Settings,
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react';

/**
 * 六步指南组件 - Premium Tech Editorial 版本
 *
 * 使用设计系统:
 * - hero-section, hero-badge, hero-title, hero-title-highlight
 * - steps-grid (非对称12列网格)
 * - step-card, step-card-featured, step-number, step-title, step-description
 * - primary-cta, secondary-cta
 */

const steps = [
  {
    num: '01',
    title: '账号定位分析',
    desc: '分析目标受众，确定账号定位和差异化策略。明确"我是谁"、"为谁服务"、"提供什么价值"，为后续内容规划奠定基础。',
    icon: Target,
    featured: true  // 第一个卡片为特色卡片
  },
  {
    num: '02',
    title: '竞品账号研究',
    desc: '分析同领域优秀账号的内容风格、发布频率、爆款特征，找到可借鉴的成功经验。',
    icon: Search
  },
  {
    num: '03',
    title: '内容差异化',
    desc: '确定你的内容领域、目标受众和个人特色，打造独特记忆点。',
    icon: Compass
  },
  {
    num: '04',
    title: '制定内容策略',
    desc: '规划内容方向和选题库，确定内容形式，制定差异化路线。',
    icon: FileText
  },
  {
    num: '05',
    title: '日常运营建议',
    desc: '制定以商业为导向的运营策略，让每一步都朝着目标前进。',
    icon: Settings
  },
  {
    num: '06',
    title: '商业变现规划',
    desc: '提前规划账号未来的变现渠道和方式，避免努力白费。',
    icon: TrendingUp
  }
];

export default function SixStepsGuide() {
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings-guide'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  const guideModuleId = systemSettings.find(s => s.setting_key === 'home_guide_button_module_id')?.setting_value;

  const getButtonLink = () => {
    if (guideModuleId) {
      return createPageUrl('Chat') + `?module_id=${guideModuleId}&auto_start=true`;
    }
    return createPageUrl('Chat');
  };

  return (
    <section className="relative py-8 md:py-12">
      {/* Hero Section - 标题区域 */}
      <div className="hero-section">
        {/* 顶部徽章 */}
        <div className="hero-badge">
          <Sparkles className="w-4 h-4" />
          <span>Growth Strategy</span>
        </div>

        {/* 主标题 */}
        <h2 className="hero-title">
          从零到百万粉丝
          <br />
          <span className="hero-title-highlight">6步打造爆款账号</span>
        </h2>

        {/* 副标题 */}
        <p className="hero-subtitle">
          深度学习全网超过1000万粉丝不同赛道账号的商业策略，
          只需 10 分钟，立即适配最佳赛道以及差异化内容！
        </p>
      </div>

      {/* Steps Grid - 非对称网格布局 */}
      <div className="steps-grid">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isFeatured = step.featured;

          return (
            <div
              key={index}
              className={`step-card ${isFeatured ? 'step-card-featured' : ''}`}
            >
              {/* 步骤编号 */}
              <div className="step-number">
                {step.num}
              </div>

              {/* 右上角图标 */}
              <IconComponent className="step-icon" />

              {/* 步骤标题 */}
              <h3 className="step-title">
                {step.title}
              </h3>

              {/* 步骤描述 */}
              <p className="step-description">
                {step.desc}
              </p>

              {/* 特色卡片额外内容 */}
              {isFeatured && (
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255, 215, 0, 0.1)' }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-primary)' }}>
                    <span>这是最关键的第一步</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA Buttons - 行动按钮组 */}
      <div className="hero-cta-group" style={{ paddingBottom: '2rem' }}>
        <Link to={getButtonLink()} className="primary-cta animate-pulse">
          <PlayCircle className="w-5 h-5" />
          <span>开始分析</span>
        </Link>

        <Link to={createPageUrl('Chat')} className="secondary-cta">
          <span>自由对话</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
