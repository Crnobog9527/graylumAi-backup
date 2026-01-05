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
import { 
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb, 
  Target, Image as ImageIcon, Languages, Code, Megaphone, 
  BookOpen, Music, Bot
} from 'lucide-react';

const iconMap = {
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb,
  Target, Image: ImageIcon, Languages, Code, Megaphone,
  BookOpen, Music, Bot
};

export default function ModuleCard({ module, models = [], className }) {
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
        "rounded-2xl p-6 flex flex-col h-full group transition-all duration-300 hover:translate-y-[-4px]",
        className
      )}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110"
          style={{ 
            background: 'rgba(255, 215, 0, 0.1)',
            border: '1px solid rgba(255, 215, 0, 0.2)'
          }}
        >
          <Icon className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
        </div>
        {module.category === 'video' && (
          <span 
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
          >
            新功能
          </span>
        )}
      </div>
      
      <h3 
        className="text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-[var(--color-primary)]"
        style={{ color: 'var(--text-primary)' }}
      >
        {module.title}
      </h3>
      
      <p 
        className="text-sm leading-relaxed mb-4 line-clamp-2 flex-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        {module.description}
      </p>
      
      <div 
        className="flex items-center justify-between mt-auto pt-4"
        style={{ borderTop: '1px solid var(--border-primary)' }}
      >
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
            {module.platform || '通用'}
          </span>
        </div>
        
        <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
          {(module.usage_count || 0).toLocaleString()}次使用
        </span>
      </div>

      <Button 
        onClick={() => setShowConfirm(true)}
        className="w-full font-medium h-10 mt-4 rounded-xl transition-all duration-300 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
          color: 'var(--bg-primary)',
          boxShadow: '0 4px 15px rgba(255, 215, 0, 0.25)'
        }}
      >
        立即使用
      </Button>

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