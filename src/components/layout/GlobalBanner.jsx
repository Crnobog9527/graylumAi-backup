import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Megaphone, AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const bannerStyles = {
  info: {
    bg: 'linear-gradient(90deg, rgba(59, 130, 246, 0.95) 0%, rgba(99, 102, 241, 0.95) 100%)',
    text: '#ffffff',
    icon: Info,
  },
  warning: {
    bg: 'linear-gradient(90deg, rgba(245, 158, 11, 0.95) 0%, rgba(251, 191, 36, 0.95) 100%)',
    text: '#1f2937',
    icon: AlertTriangle,
  },
  success: {
    bg: 'linear-gradient(90deg, rgba(34, 197, 94, 0.95) 0%, rgba(74, 222, 128, 0.95) 100%)',
    text: '#ffffff',
    icon: CheckCircle,
  },
  error: {
    bg: 'linear-gradient(90deg, rgba(239, 68, 68, 0.95) 0%, rgba(248, 113, 113, 0.95) 100%)',
    text: '#ffffff',
    icon: AlertTriangle,
  },
};

export default function GlobalBanner() {
  const [dismissedBanners, setDismissedBanners] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissedBanners');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { data: banners = [] } = useQuery({
    queryKey: ['global-banners'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const allAnnouncements = await base44.entities.Announcement.filter(
        { is_active: true, announcement_type: 'banner' },
        'sort_order'
      );
      // 过滤过期的公告
      return allAnnouncements.filter(a => {
        if (a.expire_date && a.expire_date < today) return false;
        return true;
      });
    },
    staleTime: 60000, // 1分钟缓存
  });

  // 过滤已关闭的横幅
  const visibleBanners = banners.filter(b => !dismissedBanners.includes(b.id));

  const handleDismiss = (bannerId) => {
    const newDismissed = [...dismissedBanners, bannerId];
    setDismissedBanners(newDismissed);
    localStorage.setItem('dismissedBanners', JSON.stringify(newDismissed));
  };

  if (visibleBanners.length === 0) return null;

  // 只显示第一个横幅
  const banner = visibleBanners[0];
  const style = bannerStyles[banner.banner_style] || bannerStyles.info;
  const IconComponent = style.icon;

  const content = (
    <div className="flex items-center justify-center gap-3 flex-1 min-w-0">
      <IconComponent className="h-4 w-4 shrink-0" />
      <span className="font-medium truncate">{banner.title}</span>
      {banner.description && (
        <span className="hidden sm:inline opacity-90 truncate">— {banner.description}</span>
      )}
      {banner.banner_link && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
      )}
    </div>
  );

  return (
    <div
      className="w-full py-2.5 px-4 text-sm relative z-40"
      style={{
        background: style.bg,
        color: style.text,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {banner.banner_link ? (
          banner.banner_link.startsWith('http') ? (
            <a
              href={banner.banner_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              {content}
            </a>
          ) : (
            <Link
              to={banner.banner_link}
              className="flex items-center justify-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              {content}
            </Link>
          )
        ) : (
          content
        )}
        
        <button
          onClick={() => handleDismiss(banner.id)}
          className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="关闭公告"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}