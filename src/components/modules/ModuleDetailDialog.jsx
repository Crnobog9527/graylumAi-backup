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
  BookOpen, Music, Bot, CheckCircle2, HelpCircle, Layers, X
} from 'lucide-react';

const iconMap = {
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb,
  Target, Image: ImageIcon, Languages, Code, Megaphone,
  BookOpen, Music, Bot
};

export default function ModuleDetailDialog({ module, open, onOpenChange }) {
  const navigate = useNavigate();
  const Icon = iconMap[module?.icon] || Bot;

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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-lg max-h-[85vh] overflow-y-auto p-0"
        style={{ 
          background: 'linear-gradient(135deg, rgba(25,25,30,0.98) 0%, rgba(15,15,20,0.99) 100%)',
          border: '1px solid rgba(255,215,0,0.15)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,215,0,0.1)'
        }}
      >
        {/* 头部 */}
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
                boxShadow: '0 8px 24px rgba(255,215,0,0.12)'
              }}
            >
              <Icon className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle 
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {module.title}
              </DialogTitle>
              <div className="flex items-center gap-3">
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
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-disabled)' }}>
                  🔥 {(module.usage_count || 0).toLocaleString()}次使用
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-6">
          {/* 描述 */}
          <div>
            <h4 
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Layers className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              功能描述
            </h4>
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
              <h4 
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />
                功能特点
              </h4>
              <ul className="space-y-2">
                {module.features.map((feature, idx) => (
                  <li 
                    key={idx}
                    className="flex items-start gap-3 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                      style={{ background: 'var(--color-primary)' }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 用户需要准备的问题 */}
          {module.user_questions && module.user_questions.length > 0 && (
            <div>
              <h4 
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <HelpCircle className="h-4 w-4" style={{ color: 'var(--info)' }} />
                使用前请准备
              </h4>
              <div 
                className="rounded-xl p-4 space-y-2"
                style={{ 
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.15)'
                }}
              >
                {module.user_questions.map((question, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span 
                      className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
                      style={{ 
                        background: 'rgba(59,130,246,0.2)',
                        color: 'var(--info)'
                      }}
                    >
                      {idx + 1}
                    </span>
                    {question}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 适用平台 */}
          {module.platform && (
            <div>
              <h4 
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <Target className="h-4 w-4" style={{ color: 'var(--color-secondary)' }} />
                适用平台
              </h4>
              <div className="flex flex-wrap gap-2">
                {module.platform.split(/[,、，]/).map((p, idx) => (
                  <span 
                    key={idx}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ 
                      background: 'rgba(255,180,0,0.1)',
                      color: 'var(--color-secondary)',
                      border: '1px solid rgba(255,180,0,0.2)'
                    }}
                  >
                    {p.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div 
          className="p-6 pt-4 flex gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-xl font-medium"
            style={{ 
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)'
            }}
          >
            关闭
          </Button>
          <Button 
            onClick={handleUse}
            className="flex-1 h-11 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'var(--bg-primary)',
              boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
            }}
          >
            立即使用
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}