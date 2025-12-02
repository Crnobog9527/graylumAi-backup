import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
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

const colorConfig = {
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-600' },
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-600' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-600' },
  pink: { bg: 'bg-pink-50', icon: 'bg-pink-100 text-pink-600', text: 'text-pink-600' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
  cyan: { bg: 'bg-cyan-50', icon: 'bg-cyan-100 text-cyan-600', text: 'text-cyan-600' },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-600' },
  sky: { bg: 'bg-sky-50', icon: 'bg-sky-100 text-sky-600', text: 'text-sky-600' },
  slate: { bg: 'bg-slate-50', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
};

export default function ModuleCard({ module, models = [], className }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const Icon = iconMap[module.icon] || Bot;
  const color = colorConfig[module.color] || colorConfig.blue;

  // Assuming we navigate to Chat page with module_id parameter
  const targetUrl = `${createPageUrl('Chat')}?module_id=${module.id}&auto_start=true`;

  // 计算真实积分消耗
  const getCreditsPerUse = () => {
    // 如果模块指定了专用模型，使用该模型的积分
    if (module.model_id) {
      const assignedModel = models.find(m => m.id === module.model_id);
      if (assignedModel) {
        return assignedModel.credits_per_message * (module.credits_multiplier || 1);
      }
    }
    // 否则使用第一个可用模型的积分作为基准
    const defaultModel = models[0];
    const baseCredits = defaultModel?.credits_per_message || 1;
    return baseCredits * (module.credits_multiplier || 1);
  };

  const creditsPerUse = getCreditsPerUse();

  return (
    <div className={cn(
      "bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl transition-colors group-hover:scale-105 duration-300", color.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        {module.category === 'video' && (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
            新功能
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
        {module.title}
      </h3>
      
      <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
        {module.description}
      </p>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <span className={cn("font-medium", color.text)}>
            {creditsPerUse > 0 ? `${creditsPerUse}积分/次` : '免费'}
          </span>
        </div>
        
        {/* Fake usage count for demo */}
        <span className="text-xs text-slate-400">
          {Math.floor(Math.random() * 5000) + 1000}次使用
        </span>
      </div>

      <Button 
        onClick={() => setShowConfirm(true)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-10 mt-4"
      >
        立即使用
      </Button>

      {/* 确认弹窗 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认使用「{module.title}」</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{module.description}</p>
              <p className="text-amber-600 font-medium">
                点击"确认"以后，将开始消耗积分（{creditsPerUse}积分/次）
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate(targetUrl)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}