import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
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
import { iconComponents, getIconColor } from './moduleIcons';
import { Bot } from 'lucide-react';

export default function ModuleCard({ module, models = [], className, onShowDetail }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const Icon = iconMap[module.icon] || Bot;

  const targetUrl = `${createPageUrl('Chat')}?module_id=${module.id}&auto_start=true`;

  const getCreditsPerUse = () => {
    if (module.model_id) {
      const assignedModel = models.find(m => m.id === module.model_id);
      if (assignedModel) {
        return assignedModel.credits_per_message * (module.credits_multiplier || 1);
      }
    }
    const defaultModel = models[0];
    const baseCredits = defaultModel?.credits_per_message || 1;
    return baseCredits * (module.credits_multiplier || 1);
  };

  const creditsPerUse = getCreditsPerUse();

  return (
    <div 
      className={cn(
        "relative rounded-2xl p-5 flex flex-col h-full group transition-all duration-500 hover:translate-y-[-6px] cursor-pointer",
        className
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,35,0.8) 0%, rgba(20,20,25,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)'
      }}
      onClick={() => onShowDetail && onShowDetail()}
    >
      {/* 悬停时的发光边框效果 */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, transparent 50%, rgba(255,180,0,0.1) 100%)',
          border: '1px solid rgba(255,215,0,0.2)'
        }}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="p-3 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,180,0,0.06) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              boxShadow: '0 4px 12px rgba(255,215,0,0.08)'
            }}
          >
            <Icon className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
          </div>
          {module.category === 'video' && (
            <span 
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              新功能
            </span>
          )}
        </div>
        
        <h3 
          className="text-base font-bold mb-2 transition-colors duration-300 group-hover:text-[var(--color-primary)]"
          style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}
        >
          {module.title}
        </h3>
        
        <p 
          className="text-sm leading-relaxed mb-4 line-clamp-2 flex-1"
          style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
        >
          {module.description}
        </p>
        
        <div 
          className="flex items-center justify-between mt-auto pt-3 mb-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span 
            className="text-xs font-medium px-2.5 py-1 rounded-md"
            style={{ 
              background: 'rgba(255,215,0,0.08)', 
              color: 'var(--color-primary)',
              border: '1px solid rgba(255,215,0,0.15)'
            }}
          >
            {module.platform || '通用'}
          </span>
          
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-disabled)' }}>
            <span>🔥</span>
            {(module.usage_count || 0).toLocaleString()}次
          </span>
        </div>

        <Button 
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          className="w-full font-semibold h-10 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-lg relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            color: 'var(--bg-primary)',
            boxShadow: '0 4px 20px rgba(255, 215, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
        >
          <span className="relative z-10">立即使用</span>
        </Button>
      </div>

      {/* 确认弹窗 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary)' }}>
              确认使用「{module.title}」
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p style={{ color: 'var(--text-secondary)' }}>{module.description}</p>
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
              onClick={async () => {
                try {
                  await base44.entities.PromptModule.update(module.id, {
                    usage_count: (module.usage_count || 0) + 1
                  });
                } catch (e) {
                  console.error('Failed to update usage count:', e);
                }
                navigate(targetUrl);
              }}
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