import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

export default function FeaturedModules() {
  const { data: featuredModules = [] } = useQuery({
    queryKey: ['featured-modules-active'],
    queryFn: () => base44.entities.FeaturedModule.filter({ is_active: true }, 'sort_order'),
  });

  if (featuredModules.length === 0) {
    return null;
  }

  const getLink = (featured) => {
    if (featured.link_module_id) {
      return `${createPageUrl('Chat')}?module_id=${featured.link_module_id}&auto_start=true`;
    }
    if (featured.link_url) {
      return featured.link_url;
    }
    return createPageUrl('Chat');
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'new':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'hot':
        return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'recommend':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {featuredModules.slice(0, 2).map((featured, index) => (
        featured.card_style === 'dark' ? (
          <div key={featured.id} className="bg-slate-900 rounded-2xl overflow-hidden relative min-h-[240px] flex flex-col justify-between p-8 group">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black z-0"></div>
            <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-indigo-900/50 to-transparent z-0"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg backdrop-blur-sm">
                  <span className="text-2xl">{featured.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{featured.title}</h3>
                {featured.badge_text && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${getBadgeStyle(featured.badge_type)}`}>
                    {featured.badge_text}
                  </span>
                )}
              </div>
              <p className="text-slate-400 mb-6 max-w-md text-sm leading-relaxed">
                {featured.description}
              </p>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex gap-4 text-xs text-slate-400">
                {featured.credits_display && <span>💎 {featured.credits_display}</span>}
                {featured.usage_count > 0 && <span>👤 已有{featured.usage_count.toLocaleString()}人使用</span>}
              </div>
              <Link to={getLink(featured)}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                  立即体验
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div key={featured.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden relative min-h-[240px] flex flex-col justify-between p-8 group">
            <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-orange-50 to-transparent opacity-50"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <span className="text-2xl">{featured.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{featured.title}</h3>
                {featured.badge_text && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${getBadgeStyle(featured.badge_type)}`}>
                    {featured.badge_text}
                  </span>
                )}
              </div>
              <p className="text-slate-500 mb-6 max-w-md text-sm leading-relaxed">
                {featured.description}
              </p>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex gap-4 text-xs text-slate-500">
                {featured.credits_display && <span>💎 {featured.credits_display}</span>}
                {featured.usage_count > 0 && <span>👤 已有{featured.usage_count.toLocaleString()}人使用</span>}
              </div>
              <Link to={getLink(featured)}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                  立即体验
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )
      ))}
    </div>
  );
}