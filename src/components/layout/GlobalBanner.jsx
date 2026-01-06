import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, Megaphone, Sparkles, Wrench, Gift, Bell, AlertTriangle, Info, Star } from 'lucide-react';

const iconMap = {
  Megaphone,
  Sparkles,
  Wrench,
  Gift,
  Bell,
  AlertTriangle,
  Info,
  Star,
};

const tagColorMap = {
  blue: 'bg-blue-500/20 text-blue-300',
  orange: 'bg-amber-500/20 text-amber-300',
  green: 'bg-green-500/20 text-green-300',
  red: 'bg-red-500/20 text-red-300',
  purple: 'bg-purple-500/20 text-purple-300',
};

export default function GlobalBanner() {
  const [dismissedBanners, setDismissedBanners] = useState(() => {
    try {
      const stored = localStorage.getItem('dismissed_banners');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { data: banners = [] } = useQuery({
    queryKey: ['global-banners'],
    queryFn: async () => {
      const all = await base44.entities.Announcement.filter({ 
        is_active: true, 
        is_global_banner: true 
      }, 'sort_order');
      
      // 过滤过期公告
      const now = new Date();
      return all.filter(b => {
        if (b.expire_date) {
          const expireDate = new Date(b.expire_date);
          return expireDate >= now;
        }
        return true;
      });
    },
    staleTime: 60000, // 1分钟缓存
  });

  // 过滤已关闭的横幅
  const activeBanners = banners.filter(b => !dismissedBanners.includes(b.id));

  const handleDismiss = (bannerId) => {
    const newDismissed = [...dismissedBanners, bannerId];
    setDismissedBanners(newDismissed);
    localStorage.setItem('dismissed_banners', JSON.stringify(newDismissed));
  };

  if (activeBanners.length === 0) return null;

  // 只显示第一个横幅
  const banner = activeBanners[0];
  const IconComp = iconMap[banner.icon] || Megaphone;
  const tagColorClass = tagColorMap[banner.tag_color] || tagColorMap.blue;

  return (
    <div 
      className="w-full px-4 py-2.5 flex items-center justify-center gap-3 relative"
      style={{
        background: 'linear-gradient(90deg, rgba(255,215,0,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(255,215,0,0.15) 100%)',
        borderBottom: '1px solid rgba(255,215,0,0.2)',
      }}
    >
      <div className="flex items-center gap-3 max-w-4xl">
        <div 
          className="p-1.5 rounded-lg shrink-0"
          style={{ background: 'rgba(255,215,0,0.2)' }}
        >
          <IconComp className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {banner.tag && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${tagColorClass}`}>
              {banner.tag}
            </span>
          )}
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {banner.title}
          </span>
          {banner.description && (
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
              {banner.description}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => handleDismiss(banner.id)}
        className="absolute right-4 p-1.5 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}