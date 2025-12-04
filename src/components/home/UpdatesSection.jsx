import React from 'react';
import { Sparkles, Volume2, Wrench } from 'lucide-react';

const updates = [
{
  tag: '新功能',
  tagColor: 'bg-blue-100 text-blue-700',
  title: 'AI视频生成功能上线',
  desc: '全新推出的AI视频生成工具，支持文本到视频的智能创作，快来体验吧！',
  date: '2024-03-15 发布',
  icon: Sparkles,
  iconBg: 'bg-blue-50 text-blue-600'
},
{
  tag: '系统公告',
  tagColor: 'bg-amber-100 text-amber-700',
  title: '系统维护通知',
  desc: '为提升服务质量，平台将于本周六凌晨2:00-4:00进行系统维护，期间服务暂停。',
  date: '2024-03-14 发布',
  icon: Wrench,
  iconBg: 'bg-amber-50 text-amber-600'
},
{
  tag: '限时优惠',
  tagColor: 'bg-green-100 text-green-700',
  title: '积分充值8折优惠',
  desc: '本月内充值任意金额积分可享8折优惠，充值越多优惠越多，机会有限！',
  date: '活动截止: 2024-03-31',
  icon: Volume2,
  iconBg: 'bg-green-50 text-green-600'
}];


export default function UpdatesSection() {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-4">平台公告</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {updates.map((item, index) =>
        <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${item.iconBg}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.tagColor}`}>
                {item.tag}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1 leading-relaxed">
              {item.desc}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <span className="text-xs text-slate-400">{item.date}</span>
            </div>
          </div>
        )}
      </div>
    </div>);

}