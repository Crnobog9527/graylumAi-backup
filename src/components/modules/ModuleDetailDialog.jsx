import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb, 
  Target, Image as ImageIcon, Languages, Code, Megaphone, 
  BookOpen, Music, Bot, CheckCircle2, HelpCircle, Monitor, ArrowRight, Copy, Check
} from 'lucide-react';
import { useState } from 'react';

const iconMap = {
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb,
  Target, Image: ImageIcon, Languages, Code, Megaphone,
  BookOpen, Music, Bot
};

export default function ModuleDetailDialog({ module, open, onOpenChange }) {
  const navigate = useNavigate();
  const Icon = iconMap[module?.icon] || Bot;
  const [copied, setCopied] = useState(false);

  const handleCopyInputs = () => {
    if (module?.required_inputs?.length > 0) {
      const text = module.required_inputs.join('\n');
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!module) return null;

  const targetUrl = `${createPageUrl('Chat')}?module_id=${module.id}&auto_start=true`;

  const handleUse = async () => {
    try {
      await base44.entities.PromptModule.update(module.id, {
        usage_count: (module.usage_count || 0) + 1
      });
    } catch (e) {
      console.error('Failed to update usage count:', e);
    }
    navigate(targetUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[85vh] overflow-y-auto p-0"
        style={{ 
          background: 'linear-gradient(135deg, rgba(25,25,30,0.98) 0%, rgba(15,15,20,0.99) 100%)',
          border: '1px solid rgba(255,215,0,0.15)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(255,215,0,0.1)'
        }}
      >
        {/* 头部区域 */}
        <div 
          className="p-6 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-start gap-4">
            <div 
              className="p-4 rounded-2xl shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,180,0,0.08) 100%)',
                border: '1px solid rgba(255, 215, 0, 0.25)',
                boxShadow: '0 8px 24px rgba(255,215,0,0.15)'
              }}
            >
              <Icon className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="p-0 space-y-1">
                <DialogTitle 
                  className="text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {module.title}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-3 mt-2">
                <span 
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ 
                    background: 'rgba(255,215,0,0.1)', 
                    color: 'var(--color-primary)',
                    border: '1px solid rgba(255,215,0,0.2)'
                  }}
                >
                  {module.platform || '通用'}
                </span>
                <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                  🔥 {(module.usage_count || 0).toLocaleString()} 次使用
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6">
          {/* 描述 */}
          <div>
            <h3 
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              功能介绍
            </h3>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {module.description}
            </p>
          </div>

          {/* 特点 */}
          {module.features && module.features.length > 0 && (
            <div>
              <h3 
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />
                功能特点
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {module.features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ 
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)'
                    }}
                  >
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        color: 'var(--bg-primary)'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 需要准备的问题 */}
          {module.required_inputs && module.required_inputs.length > 0 && (
            <div>
              <h3 
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <HelpCircle className="h-4 w-4" style={{ color: 'var(--info)' }} />
                使用前请准备
              </h3>
              <div 
                className="p-4 rounded-xl space-y-3"
                style={{ 
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.15)'
                }}
              >
                {module.required_inputs.map((input, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0 mt-2"
                      style={{ background: 'var(--info)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {input}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 适用平台 */}
          <div>
            <h3 
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Monitor className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              适用平台
            </h3>
            <div className="flex flex-wrap gap-2">
              {(module.platform || '通用').split(/[,，、]/).map((p, idx) => (
                <span 
                  key={idx}
                  className="text-sm px-4 py-2 rounded-xl font-medium"
                  style={{ 
                    background: 'rgba(255,215,0,0.08)',
                    color: 'var(--color-primary)',
                    border: '1px solid rgba(255,215,0,0.15)'
                  }}
                >
                  {p.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div 
          className="p-6 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
              💡 点击使用后，将按实际Token消耗计费
            </p>
            <Button 
              onClick={handleUse}
              className="px-8 h-11 font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                color: 'var(--bg-primary)',
                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
            >
              立即使用
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}