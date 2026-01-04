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
  BookOpen, Music, Bot, ArrowRight
} from 'lucide-react';

const iconMap = {
  Video, PenTool, Sparkles, Briefcase, BarChart3, Lightbulb,
  Target, Image: ImageIcon, Languages, Code, Megaphone,
  BookOpen, Music, Bot
};

const colorConfig = {
  violet: { icon: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  blue: { icon: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  emerald: { icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  orange: { icon: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  pink: { icon: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  amber: { icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  cyan: { icon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  indigo: { icon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  sky: { icon: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  slate: { icon: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export default function ModuleCard({ module, models = [], className }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const Icon = iconMap[module.icon] || Bot;
  const color = colorConfig[module.color] || colorConfig.amber;

  const targetUrl = `${createPageUrl('Chat')}?module_id=${module.id}&auto_start=true`;

  return (
    <div className={cn(
      "group bg-[#0a0a0a] rounded-xl p-5 border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300 flex flex-col h-full",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl border transition-all duration-300 group-hover:scale-105", color.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {module.category === 'video' && (
          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
            新功能
          </span>
        )}
      </div>
      
      <h3 className="text-base font-semibold text-white mb-2 group-hover:text-amber-500 transition-colors">
        {module.title}
      </h3>
      
      <p className="text-[#666666] text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
        {module.description}
      </p>
      
      <div className="flex items-center justify-between pt-4 border-t border-[#1a1a1a] mb-4">
        <span className="text-xs text-amber-500 font-medium">
          {module.platform || '通用'}
        </span>
        <span className="text-xs text-[#444444]">
          {(module.usage_count || 0).toLocaleString()} 次使用
        </span>
      </div>

      <Button 
        onClick={() => setShowConfirm(true)}
        className="w-full bg-[#1a1a1a] hover:bg-amber-500 text-[#a3a3a3] hover:text-black border border-[#2a2a2a] hover:border-amber-500 font-medium h-10 transition-all duration-300"
      >
        立即使用
        <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Button>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-[#0a0a0a] border-[#1a1a1a]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认使用「{module.title}」</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-[#a3a3a3]">
              <p>{module.description}</p>
              <p className="text-amber-500 font-medium">
                点击"确认"以后，将按实际Token消耗计费
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">取消</AlertDialogCancel>
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
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}