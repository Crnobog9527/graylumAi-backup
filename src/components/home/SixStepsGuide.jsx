import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { PlayCircle, Target, Search, Compass, FileText, Settings, TrendingUp } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: '账号定位分析',
    desc: '分析目标受众，确定账号定位和差异化策略',
    icon: Target
  },
  {
    num: '02',
    title: '竞品账号研究',
    desc: '分析同领域优秀账号的内容风格、发布频率、爆款特征，找到可借鉴的成功经验。',
    icon: Search
  },
  {
    num: '03',
    title: '账号定位分析',
    desc: '确定你的内容领域、目标受众和个人特色，明确"我是谁"、"为谁服务"、"提供什么价值"',
    icon: Compass
  },
  {
    num: '04',
    title: '制定内容策略',
    desc: '规划内容方向和选题库，确定内容形式，制定差异化路线。让你的内容既有持续性，又有独特记忆点。',
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
    <div className="mb-16">
      {/* Header */}
      <div className="text-center mb-12">
        {/* 微标签 */}
        <div className="inline-flex items-center gap-2 mb-6 bg-[#111111] px-4 py-2 rounded-full border border-[#222222]">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888] font-medium">GROWTH STRATEGY</span>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4 tracking-tight leading-[1.1]">
          从零到百万粉丝
          <br />
          <span className="text-[#FFD02F]">6步打造爆款账号</span>
        </h2>
        
        <p className="text-[#888888] mx-auto max-w-2xl text-base leading-relaxed font-light">
          深度学习全网超过1000万粉丝不同赛道账号的商业策略，只需 10 分钟，立即适配最佳赛道以及差异化内容！
        </p>
      </div>
      
      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <div
              key={index}
              className="group bg-[#111111] p-8 rounded-3xl border border-[#222222] transition-all duration-300 hover:border-[#444444] hover:scale-[1.01] hover:bg-[#1A1A1A]"
            >
              {/* 步骤编号和图标 */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-full bg-[#0A0A0A] border border-[#222222] flex items-center justify-center text-[#FFD02F] font-bold text-sm group-hover:border-[#FFD02F] transition-colors">
                  {step.num}
                </div>
                <IconComponent className="h-5 w-5 text-[#444444] group-hover:text-[#FFD02F] transition-colors" />
              </div>
              
              <h3 className="text-white font-bold text-lg mb-3 tracking-tight">{step.title}</h3>
              <p className="text-[#888888] text-sm leading-relaxed font-light">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
      
      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to={getButtonLink()}>
          <Button
            className="bg-[#FFD02F] hover:bg-[#F0C000] text-black font-bold h-14 px-10 text-base rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(255,208,47,0.3)] hover:shadow-[0_0_40px_rgba(255,208,47,0.4)]"
          >
            <PlayCircle className="h-5 w-5 mr-2" />
            开始分析
          </Button>
        </Link>
        
        <Link to={createPageUrl('Chat')}>
          <Button
            variant="outline"
            className="bg-[#1A1A1A] hover:bg-[#252525] border-[#333333] text-white font-medium h-14 px-10 text-base rounded-full transition-all duration-300"
          >
            自由对话
          </Button>
        </Link>
      </div>
    </div>
  );
}