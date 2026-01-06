import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Sparkles, AlertTriangle, CheckCircle, Info, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const bannerStyles = {
  info: {
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
    border: 'rgba(139, 92, 246, 0.3)',
    iconBg: 'rgba(139, 92, 246, 0.2)',
    iconColor: '#A78BFA',
    textColor: 'var(--text-primary)',
    icon: Info,
  },
  warning: {
    gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
    border: 'rgba(251, 191, 36, 0.3)',
    iconBg: 'rgba(251, 191, 36, 0.2)',
    iconColor: '#FBBF24',
    textColor: 'var(--text-primary)',
    icon: AlertTriangle,
  },
  success: {
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(74, 222, 128, 0.15) 100%)',
    border: 'rgba(34, 197, 94, 0.3)',
    iconBg: 'rgba(34, 197, 94, 0.2)',
    iconColor: '#22C55E',
    textColor: 'var(--text-primary)',
    icon: CheckCircle,
  },
  error: {
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(248, 113, 113, 0.15) 100%)',
    border: 'rgba(239, 68, 68, 0.3)',
    iconBg: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#EF4444',
    textColor: 'var(--text-primary)',
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
      return allAnnouncements.filter(a => {
        if (a.expire_date && a.expire_date < today) return false;
        return true;
      });
    },
    staleTime: 60000,
  });

  const visibleBanners = banners.filter(b => !dismissedBanners.includes(b.id));

  const handleDismiss = (bannerId) => {
    const newDismissed = [...dismissedBanners, bannerId];
    setDismissedBanners(newDismissed);
    localStorage.setItem('dismissedBanners', JSON.stringify(newDismissed));
  };

  if (visibleBanners.length === 0) return null;

  const banner = visibleBanners[0];
  const style = bannerStyles[banner.banner_style] || bannerStyles.info;
  const IconComponent = style.icon;

  const BannerContent = ({ clickable = false }) => (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div 
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: style.iconBg }}
      >
        <IconComponent className="h-4 w-4" style={{ color: style.iconColor }} />
      </div>
      
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {banner.tag && (
          <span 
            className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: style.iconBg, color: style.iconColor }}
          >
            {banner.tag}
          </span>
        )}
        <span 
          className="font-medium truncate"
          style={{ color: style.textColor }}
        >
          {banner.title}
        </span>
        {banner.description && (
          <span 
            className="hidden md:inline truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {banner.description}
          </span>
        )}
      </div>

      {clickable && (
        <ChevronRight 
          className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" 
          style={{ color: style.iconColor }} 
        />
      )}
    </div>
  );

  const wrapperClass = "group flex items-center gap-3 flex-1 min-w-0 transition-all duration-200";

  return (
    <div
      className="w-full px-4 py-2 relative z-40"
      style={{
        background: style.gradient,
        borderBottom: `1px solid ${style.border}`,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {banner.banner_link ? (
          banner.banner_link.startsWith('http') ? (
            <a
              href={banner.banner_link}
              target="_blank"
              rel="noopener noreferrer"
              className={wrapperClass}
            >
              <BannerContent clickable />
            </a>
          ) : (
            <Link to={banner.banner_link} className={wrapperClass}>
              <BannerContent clickable />
            </Link>
          )
        ) : (
          <BannerContent />
        )}
        
        <button
          onClick={() => handleDismiss(banner.id)}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{ 
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
          aria-label="关闭公告"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}