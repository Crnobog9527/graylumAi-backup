import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Volume2, Wrench, Megaphone, Gift, Bell, AlertTriangle, Info, Star, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';

// 图标映射
const iconMap = {
  Sparkles,
  Volume2,
  Wrench,
  Megaphone,
  Gift,
  Bell,
  AlertTriangle,
  Info,
  Star,
};

// 标签颜色映射 - 深色主题
const tagColorMap = {
  blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  orange: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
};

export default function UpdatesSection() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const all = await base44.entities.Announcement.filter({ is_active: true }, 'sort_order');
      const now = new Date();
      return all.filter(a => !a.expire_date || new Date(a.expire_date) >= now);
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-[#111111] px-4 py-2 rounded-full border border-[#222222]">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888] font-medium">ANNOUNCEMENTS</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#111111] p-8 rounded-3xl border border-[#222222] animate-pulse">
              <div className="h-10 w-10 bg-[#1A1A1A] rounded-xl mb-6" />
              <div className="h-5 bg-[#1A1A1A] rounded mb-3 w-3/4" />
              <div className="h-4 bg-[#0A0A0A] rounded mb-2" />
              <div className="h-4 bg-[#0A0A0A] rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-8">
        <div className="inline-flex items-center gap-2 bg-[#111111] px-4 py-2 rounded-full border border-[#222222]">
          <Bell className="h-3 w-3 text-[#FFD02F]" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888] font-medium">ANNOUNCEMENTS</span>
        </div>
        
        <h2 className="text-xl font-semibold text-white tracking-tight">平台公告</h2>
      </div>
      
      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {announcements.slice(0, 3).map((item) => {
          const IconComponent = iconMap[item.icon] || Megaphone;
          const tagColor = tagColorMap[item.tag_color] || tagColorMap.blue;
          
          let dateDisplay = '';
          if (item.expire_date) {
            dateDisplay = `活动截止: ${format(new Date(item.expire_date), 'yyyy-MM-dd')}`;
          } else if (item.publish_date) {
            dateDisplay = `${format(new Date(item.publish_date), 'yyyy-MM-dd')}`;
          } else {
            dateDisplay = `${format(new Date(item.created_date), 'yyyy-MM-dd')}`;
          }

          return (
            <div 
              key={item.id} 
              className="group bg-[#111111] p-8 rounded-3xl border border-[#222222] flex flex-col h-full transition-all duration-300 hover:border-[#444444] hover:scale-[1.01] hover:bg-[#1A1A1A]"
            >
              {/* 头部 - 图标和标签 */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#0A0A0A] border border-[#222222] flex items-center justify-center group-hover:border-[#FFD02F] transition-colors">
                  <IconComponent className="h-5 w-5 text-[#FFD02F]" />
                </div>
                {item.tag && (
                  <span className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-medium ${tagColor}`}>
                    {item.tag}
                  </span>
                )}
              </div>
              
              {/* 标题 */}
              <h3 className="font-bold text-white text-lg mb-3 tracking-tight group-hover:text-[#FFD02F] transition-colors">
                {item.title}
              </h3>
              
              {/* 描述 */}
              <p className="text-sm text-[#888888] mb-6 flex-1 leading-relaxed font-light">
                {item.description}
              </p>
              
              {/* 底部 - 日期和箭头 */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1A1A1A]">
                <span className="text-xs text-[#666666]">{dateDisplay}</span>
                <ArrowUpRight className="h-4 w-4 text-[#444444] group-hover:text-[#FFD02F] transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}