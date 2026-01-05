import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FeaturedModules() {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, featured: null });
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

  const getLink = (featured) => {
    if (featured.link_module_id) {
      return `${createPageUrl('Chat')}?module_id=${featured.link_module_id}&auto_start=true`;
    }
    if (featured.link_url) {
      return featured.link_url;
    }
    return createPageUrl('Chat');
  };

  const handleClick = (featured) => {
    const linkedModule = featured.link_module_id 
      ? promptModules.find(m => m.id === featured.link_module_id)
      : null;
    setConfirmDialog({ open: true, featured, linkedModule });
  };

  const handleConfirm = () => {
    const { featured } = confirmDialog;
    navigate(getLink(featured));
    setConfirmDialog({ open: false, featured: null });
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
    <div className="mb-10">
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="inline-flex items-center gap-2"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-sm) var(--space-md)'
          }}
        >
          <Star className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
          <span
            className="uppercase tracking-widest font-medium"
            style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}
          >
            FEATURED
          </span>
        </div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
          精选推荐
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {featuredModules.slice(0, 2).map((featured, index) => {
          const badgeStyle = getBadgeStyle(featured.badge_type);
          return (
            <div 
              key={featured.id} 
              className="group rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                animation: `fadeInUp 0.6s ease forwards`,
                animationDelay: `${index * 0.1}s`,
                opacity: 0
              }}
            >
              <style>{`
                @keyframes fadeInUp {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              
              {/* 顶部：图标 + 标题 + 标签 */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="p-3 rounded-xl shrink-0 transition-all duration-300 group-hover:scale-110"
                    style={{ 
                      background: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.2)'
                    }}
                  >
                    <span className="text-2xl">{featured.icon}</span>
                  </div>
                  <h3 
                    className="text-xl font-bold transition-colors duration-300"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {featured.title}
                  </h3>
                  {featured.badge_text && (
                    <span 
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: badgeStyle.bg,
                        color: badgeStyle.color,
                        border: `1px solid ${badgeStyle.border}30`
                      }}
                    >
                      {featured.badge_text}
                    </span>
                  )}
                </div>
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {featured.description}
                </p>
              </div>
              
              {/* 中间：横幅大图 */}
              {featured.image_url && (
                <div className="px-6">
                  <div className="rounded-xl overflow-hidden">
                    <img 
                      src={featured.image_url} 
                      alt={featured.title}
                      className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>
              )}
              
              {/* 底部：积分/使用人数 + 按钮 */}
              <div 
                className="p-6 pt-4 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--border-primary)', marginTop: '1rem' }}
              >
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {featured.credits_display && (
                    <span className="flex items-center gap-1">
                      💎 {featured.credits_display}
                    </span>
                  )}
                  {featured.usage_count != null && featured.usage_count > 0 && (
                    <span className="flex items-center gap-1">
                      👤 {featured.usage_count.toLocaleString()}人使用
                    </span>
                  )}
                </div>
                <Button 
                  onClick={() => handleClick(featured)}
                  className="rounded-xl px-5 h-10 font-medium transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                    color: 'var(--bg-primary)',
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.25)'
                  }}
                >
                  立即体验
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 确认弹窗 */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary)' }}>
              确认使用「{confirmDialog.featured?.title}」
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p style={{ color: 'var(--text-secondary)' }}>
                {confirmDialog.linkedModule?.description || confirmDialog.featured?.description}
              </p>
              <p className="font-medium" style={{ color: 'var(--warning)' }}>
                点击"确认"以后，将按实际Token消耗计费
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              style={{ 
                background: 'var(--bg-primary)', 
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)'
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                color: 'var(--bg-primary)'
              }}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}