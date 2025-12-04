import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
  return (
    <div className="bg-gray-50 text-white mb-10 px-8 py-10 rounded-2xl from-slate-800 to-slate-900">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-[#ff8214] mb-3 text-2xl font-bold">从零到百万粉丝：6步打造爆款账号</h2>
        <p className="text-slate-500 mx-auto max-w-3xl">深度学习全网超过1000万粉丝不同赛道账号的商业策略，只需 10 分钟，立即适配最佳赛道以及差异化内容！

        </p>
      </div>
      
      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {steps.map((step, index) =>
        <div
          key={index}
          className={`rounded-xl p-5 ${
          index === 1 || index === 4 ?
          'bg-blue-600' :
          'bg-white/10 backdrop-blur-sm'}`
          }>

            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold mb-3 ${
          index === 1 || index === 4 ?
          'bg-white/20 text-white' :
          'bg-blue-600 text-white'}`
          }>
              {step.num}
            </div>
            <h3 className="text-slate-900 mb-2 font-bold">{step.title}</h3>
            <p className={`text-sm leading-relaxed ${
          index === 1 || index === 4 ?
          'text-blue-100' :
          'text-slate-400'}`
          }>
              {step.desc}
            </p>
          </div>
        )}
      </div>
      
      {/* CTA Button */}
      <div className="text-center">
        <Link to={createPageUrl('Marketplace')}>
          <Button
            size="lg"
            className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-8 h-12 font-semibold">

            <PlayCircle className="h-5 w-5 mr-2" />
            开始分析
          </Button>
        </Link>
      </div>
    </div>);

}