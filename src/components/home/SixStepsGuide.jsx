import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { PlayCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: '账号定位分析',
    desc: '分析目标受众，确定账号定位和差异化策略'
  },
  {
    num: '02',
    title: '竞品账号研究',
    desc: '分析同领域优秀账号的内容风格、发布频率、爆款特征'
  },
  {
    num: '03',
    title: '人设打造',
    desc: '确定你的内容领域、目标受众和个人特色'
  },
  {
    num: '04',
    title: '制定内容策略',
    desc: '规划内容方向和选题库，确定内容形式'
  },
  {
    num: '05',
    title: '日常运营建议',
    desc: '制定以商业为导向的运营策略'
  },
  {
    num: '06',
    title: '商业变现规划',
    desc: '提前规划账号未来的变现渠道和方式'
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-8 mb-10"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          热门功能
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          从零到百万粉丝：6步打造爆款账号
        </h2>
        <p className="text-[#666666] max-w-2xl mx-auto">
          深度学习全网超过1000万粉丝不同赛道账号的商业策略，只需 10 分钟，立即适配最佳赛道
        </p>
      </div>
      
      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
            className="group bg-[#111111] hover:bg-[#161616] border border-[#1a1a1a] hover:border-[#2a2a2a] p-5 rounded-xl transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0">
                {step.num}
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1.5 group-hover:text-amber-500 transition-colors">
                  {step.title}
                </h3>
                <p className="text-[#666666] text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* CTA Button */}
      <div className="text-center">
        <Link to={getButtonLink()}>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-12 px-8 text-base rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-105">
            <PlayCircle className="h-5 w-5 mr-2" />
            开始分析
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}