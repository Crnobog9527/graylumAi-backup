import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Volume2, Wrench, Megaphone, Gift, Bell, AlertTriangle, Info, Star } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

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

const tagColorMap = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  orange: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const iconBgMap = {
  blue: 'bg-blue-500/10 text-blue-400',
  orange: 'bg-amber-500/10 text-amber-400',
  green: 'bg-green-500/10 text-green-400',
  red: 'bg-red-500/10 text-red-400',
  purple: 'bg-purple-500/10 text-purple-400',
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
        <h2 className="text-lg font-bold text-white mb-4">平台公告</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0a0a0a] p-6 rounded-xl border border-[#1a1a1a] animate-pulse">
              <div className="h-10 w-10 bg-[#1a1a1a] rounded-lg mb-4" />
              <div className="h-5 bg-[#1a1a1a] rounded mb-2 w-3/4" />
              <div className="h-4 bg-[#111111] rounded mb-1" />
              <div className="h-4 bg-[#111111] rounded w-2/3" />
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">平台公告</h2>
        <span className="text-[#666666] text-sm">最新动态</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {announcements.slice(0, 3).map((item, index) => {
          const IconComponent = iconMap[item.icon] || Megaphone;
          const tagColor = tagColorMap[item.tag_color] || tagColorMap.blue;
          const iconBg = iconBgMap[item.tag_color] || iconBgMap.blue;
          
          let dateDisplay = '';
          if (item.expire_date) {
            dateDisplay = `截止: ${format(new Date(item.expire_date), 'yyyy-MM-dd')}`;
          } else if (item.publish_date) {
            dateDisplay = `${format(new Date(item.publish_date), 'yyyy-MM-dd')}`;
          } else {
            dateDisplay = `${format(new Date(item.created_date), 'yyyy-MM-dd')}`;
          }

          return (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              className="group bg-[#0a0a0a] hover:bg-[#111111] p-6 rounded-xl border border-[#1a1a1a] hover:border-[#2a2a2a] flex flex-col h-full transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${iconBg}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                {item.tag && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${tagColor}`}>
                    {item.tag}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-amber-500 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-[#666666] mb-4 flex-1 leading-relaxed">
                {item.description}
              </p>
              <div className="pt-4 border-t border-[#1a1a1a]">
                <span className="text-xs text-[#444444]">{dateDisplay}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}