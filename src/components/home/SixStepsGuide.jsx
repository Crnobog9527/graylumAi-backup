import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { PlayCircle } from 'lucide-react';

const steps = [
{
  num: '01',
  title: '账号定位分析',
  desc: '分析目标受众，确定账号定位和差异化策略'
},
{
  num: '02',
  title: '竞品账号研究',
  desc: '分析同领域优秀账号的内容风格、发布频率、爆款特征，找到可借鉴的成功经验。'
},
{
  num: '03',
  title: '账号定位分析',
  desc: '确定你的内容领域、目标受众和个人特色，明确"我是谁"、"为谁服务"、"提供什么价值"'
},
{
  num: '04',
  title: '制定内容策略',
  desc: '规划内容方向和选题库，确定内容形式，制定差异化路线。让你的内容既有持续性，又有独特记忆点。'
},
{
  num: '05',
  title: '日常运营建议',
  desc: '制定以商业为导向的运营策略，让每一步都朝着目标前进。'
},
{
  num: '06',
  title: '商业变现规划',
  desc: '提前规划账号未来的变现渠道和方式，避免努力白费。'
}];


export default function SixStepsGuide() {
  // 获取系统设置中的关联模块ID
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings-guide'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  const guideModuleId = systemSettings.find(s => s.setting_key === 'home_guide_button_module_id')?.setting_value;

  // 生成跳转链接
  const getButtonLink = () => {
    if (guideModuleId) {
      return createPageUrl('Chat') + `?module_id=${guideModuleId}&auto_start=true`;
    }
    return createPageUrl('Marketplace');
  };

  return (
    <div className="bg-gray-50 text-white mb-10 px-8 py-10 rounded-2xl from-slate-800 to-slate-900">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-[#ff8214] mb-3 text-2xl font-bold">🔥从零到百万粉丝：6步打造爆款账号</h2>
        <p className="text-slate-500 mx-auto max-w-3xl">深度学习全网超过1000万粉丝不同赛道账号的商业策略，只需 10 分钟，立即适配最佳赛道以及差异化内容！

        </p>
      </div>
      
      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {steps.map((step, index) =>
        <div
          key={index} className="bg-slate-100 p-5 rounded-xl backdrop-blur-sm">






            <div className="bg-indigo-500 text-white mb-3 text-sm font-bold rounded-full inline-flex items-center justify-center w-10 h-10">




              {step.num}
            </div>
            <h3 className="text-slate-900 mb-2 font-bold">{step.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">




              {step.desc}
            </p>
          </div>
        )}
      </div>
      
      {/* CTA Button */}
      <div className="text-center">
        <Link to={getButtonLink()}>
          <Button
            size="lg" className="bg-indigo-500 text-slate-50 mx-10 px-8 text-sm font-semibold opacity-100 rounded-full inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-indigo-600 h-12">
            <PlayCircle className="h-5 w-5 mr-2" />
            开始分析
          </Button>
        </Link>
      </div>
    </div>);

}