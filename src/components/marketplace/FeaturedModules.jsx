import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

export default function FeaturedModules() {
  // Hardcoded for visual matching of the design, linking to Marketplace or specific modules
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {/* Left Card */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden relative min-h-[240px] flex flex-col justify-between p-8 group">
        {/* Background Gradient/Image simulation */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black z-0"></div>
        <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-indigo-900/50 to-transparent z-0"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg backdrop-blur-sm">
              <span className="text-2xl">📹</span>
            </div>
            <h3 className="text-2xl font-bold text-white">AI视频生成器</h3>
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded border border-green-500/30">
              新功能
            </span>
          </div>
          <p className="text-slate-400 mb-6 max-w-md text-sm leading-relaxed">
            输入文本描述，AI将为您生成精美的视频内容。支持多种风格和时长，让创意变为现实。
          </p>
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex gap-4 text-xs text-slate-400">
            <span>💎 25积分/次</span>
            <span>👤 已有1,234人使用</span>
          </div>
          <Link to={`${createPageUrl('Chat')}?category=video`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
              立即体验
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Right Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden relative min-h-[240px] flex flex-col justify-between p-8 group">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-orange-50 to-transparent opacity-50"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">智能商业策划</h3>
            <span className="bg-amber-100 text-amber-600 text-xs px-2 py-0.5 rounded border border-amber-200">
              热门
            </span>
          </div>
          <p className="text-slate-500 mb-6 max-w-md text-sm leading-relaxed">
            AI助手帮您制定完整的商业计划书、市场分析和营销策略，让您的创业想法更具说服力。
          </p>
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex gap-4 text-xs text-slate-500">
            <span>💎 20积分/次</span>
            <span>👤 已有5,678人使用</span>
          </div>
          <Link to={`${createPageUrl('Chat')}?category=business`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
              立即体验
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}