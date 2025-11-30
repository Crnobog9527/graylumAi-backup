import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MessageSquare, LayoutGrid, History, ArrowRight } from 'lucide-react';

const items = [
  {
    title: '开始对话',
    desc: '进入自由对话模式，与AI助手进行智能交流',
    icon: MessageSquare,
    link: 'Chat',
    linkText: '立即开始',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: '浏览功能广场',
    desc: '查看预设提示词模板，快速完成各种任务',
    icon: LayoutGrid,
    link: 'Marketplace',
    linkText: '前往广场',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    title: '查看使用记录',
    desc: '查看历史对话和积分消费详情',
    icon: History,
    link: 'Chat', // Or a History page if we had one, for now Chat
    linkText: '查看记录',
    color: 'bg-violet-50 text-violet-600',
  },
];

export default function QuickStart() {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-slate-900 mb-4">快速开始</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-300 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
              <item.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{item.desc}</p>
            <Link 
              to={createPageUrl(item.link)} 
              className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 group-hover:translate-x-1 transition-transform"
            >
              {item.linkText}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}