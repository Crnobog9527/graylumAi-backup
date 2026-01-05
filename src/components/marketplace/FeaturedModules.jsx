import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from 'lucide-react';
import ModuleDetailDialog from '../modules/ModuleDetailDialog';

export default function FeaturedModules() {
  const [detailDialog, setDetailDialog] = useState({ open: false, module: null });
  const navigate = useNavigate();

  const { data: featuredModules = [] } = useQuery({
    queryKey: ['featured-modules-active'],
    queryFn: () => base44.entities.FeaturedModule.filter({ is_active: true }, 'sort_order'),
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['prompt-modules-for-featured'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }),
  });

  if (featuredModules.length === 0) {
    return null;
  }

  const handleClick = (featured) => {
    // 如果有关联模块，显示关联模块的详情弹窗
    if (featured.link_module_id) {
      const linkedModule = promptModules.find(m => m.id === featured.link_module_id);
      if (linkedModule) {
        setDetailDialog({ open: true, module: linkedModule });
        return;
      }
    }
    // 如果没有关联模块，直接跳转
    if (featured.link_url) {
      navigate(featured.link_url);
    } else {
      navigate(createPageUrl('Chat'));
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'new':
        return { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success)' };
      case 'hot':
        return { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning)' };
      case 'recommend':
        return { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info)' };
      default:
        return { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: 'var(--border-primary)' };
    }
  };

  return (
    <div className="mb-12">
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="inline-flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,180,0,0.05) 100%)',
              border: '1px solid rgba(255,215,0,0.2)',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Star className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            <span
              className="uppercase tracking-widest font-semibold"
              style={{ fontSize: '11px', color: 'var(--color-primary)' }}
            >
              FEATURED
            </span>
          </div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 }}>
            精选推荐
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <span>✨ 编辑精选，品质保证</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {featuredModules.slice(0, 2).map((featured, index) => {
          const badgeStyle = getBadgeStyle(featured.badge_type);
          return (
            <div 
              key={featured.id} 
              className="group rounded-3xl overflow-hidden transition-all duration-500 hover:translate-y-[-4px]"
              style={{
                background: 'linear-gradient(135deg, rgba(30,30,35,0.9) 0%, rgba(20,20,25,0.95) 100%)',
                border: '1px solid rgba(255,215,0,0.15)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                animation: `slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                animationDelay: `${index * 0.15}s`,
                opacity: 0
              }}
            >
              <style>{`
                @keyframes slideUp {
                  from { opacity: 0; transform: translateY(30px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              
              {/* 顶部：图标 + 标题 + 标签 */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="p-4 rounded-2xl shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,180,0,0.08) 100%)',
                      border: '1px solid rgba(255, 215, 0, 0.25)',
                      boxShadow: '0 4px 20px rgba(255,215,0,0.1)'
                    }}
                  >
                    <span className="text-3xl">{featured.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 
                        className="text-xl font-bold transition-colors duration-300 group-hover:text-[var(--color-primary)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {featured.title}
                      </h3>
                      {featured.badge_text && (
                        <span 
                          className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}40`
                          }}
                        >
                          {featured.badge_text}
                        </span>
                      )}
                    </div>
                    <p 
                      className="text-sm leading-relaxed line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {featured.description}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 中间：横幅大图 */}
              {featured.image_url && (
                <div className="px-6">
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <img 
                      src={featured.image_url} 
                      alt={featured.title}
                      className="w-full h-40 object-cover transition-all duration-700 group-hover:scale-110"
                    />
                  </div>
                </div>
              )}
              
              {/* 底部：积分/使用人数 + 按钮 */}
              <div 
                className="p-6 pt-5 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem' }}
              >
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {featured.credits_display && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      💎 {featured.credits_display}
                    </span>
                  )}
                  {featured.usage_count != null && featured.usage_count > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      🔥 {featured.usage_count.toLocaleString()}人使用
                    </span>
                  )}
                </div>
                <Button 
                  onClick={() => handleClick(featured)}
                  className="rounded-xl px-6 h-11 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                    color: 'var(--bg-primary)',
                    boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  立即体验
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 模块详情弹窗 */}
      <ModuleDetailDialog 
        module={detailDialog.module} 
        open={detailDialog.open} 
        onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })} 
      />
    </div>
  );
}