import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Volume2, Wrench, Megaphone, Gift, Bell, AlertTriangle, Info, Star } from 'lucide-react';
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

// 标签颜色映射
const tagColorMap = {
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};

// 图标背景色映射
const iconBgMap = {
  blue: 'bg-blue-50 text-blue-600',
  orange: 'bg-amber-50 text-amber-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export default function UpdatesSection() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const all = await base44.entities.Announcement.filter({ is_active: true }, 'sort_order');
      // 过滤掉已过期的公告
      const now = new Date();
      return all.filter(a => !a.expire_date || new Date(a.expire_date) >= now);
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">平台公告</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse">
              <div className="h-10 w-10 bg-slate-200 rounded-lg mb-4" />
              <div className="h-5 bg-slate-200 rounded mb-2 w-3/4" />
              <div className="h-4 bg-slate-100 rounded mb-1" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
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
      <h2 className="text-lg font-bold text-slate-900 mb-4">平台公告</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {announcements.slice(0, 3).map((item) => {
          const IconComponent = iconMap[item.icon] || Megaphone;
          const tagColor = tagColorMap[item.tag_color] || tagColorMap.blue;
          const iconBg = iconBgMap[item.tag_color] || iconBgMap.blue;
          
          // 格式化日期显示
          let dateDisplay = '';
          if (item.expire_date) {
            dateDisplay = `活动截止: ${format(new Date(item.expire_date), 'yyyy-MM-dd')}`;
          } else if (item.publish_date) {
            dateDisplay = `${format(new Date(item.publish_date), 'yyyy-MM-dd')} 发布`;
          } else {
            dateDisplay = `${format(new Date(item.created_date), 'yyyy-MM-dd')} 发布`;
          }

          return (
            <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${iconBg}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                {item.tag && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${tagColor}`}>
                    {item.tag}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 mb-4 flex-1 leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-xs text-slate-400">{dateDisplay}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}