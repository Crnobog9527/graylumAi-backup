import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, PenTool, Video, Megaphone, Code, BarChart3, 
  Lightbulb, Briefcase, FileText, Palette, Rocket, Target,
  ChevronRight, Wand2, Zap
} from 'lucide-react';

const iconMap = {
  Sparkles, PenTool, Video, Megaphone, Code, BarChart3,
  Lightbulb, Briefcase, FileText, Palette, Rocket, Target, Wand2, Zap
};

const colorConfig = {
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', hover: 'hover:border-violet-400 hover:shadow-violet-100', icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:border-blue-400 hover:shadow-blue-100', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:border-emerald-400 hover:shadow-emerald-100', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:border-orange-400 hover:shadow-orange-100', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', hover: 'hover:border-pink-400 hover:shadow-pink-100', icon: 'bg-pink-100 text-pink-600', badge: 'bg-pink-100 text-pink-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:border-amber-400 hover:shadow-amber-100', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:border-cyan-400 hover:shadow-cyan-100', icon: 'bg-cyan-100 text-cyan-600', badge: 'bg-cyan-100 text-cyan-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', hover: 'hover:border-rose-400 hover:shadow-rose-100', icon: 'bg-rose-100 text-rose-600', badge: 'bg-rose-100 text-rose-700' },
};

const categoryLabels = {
  writing: '写作',
  marketing: '营销',
  coding: '编程',
  analysis: '分析',
  creative: '创意',
  business: '商务',
  other: '其他',
  all: '全部'
};

export default function PromptModuleGrid({ modules, onSelect, selectedModule }) {
  const [activeCategory, setActiveCategory] = useState('all');
  
  const categories = ['all', ...new Set(modules.map(m => m.category).filter(Boolean))];
  
  const filteredModules = activeCategory === 'all' 
    ? modules 
    : modules.filter(m => m.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full transition-all",
              activeCategory === cat 
                ? "bg-violet-600 hover:bg-violet-700 text-white" 
                : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
            )}
          >
            {categoryLabels[cat] || cat}
          </Button>
        ))}
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((module) => {
          const IconComponent = iconMap[module.icon] || Sparkles;
          const color = colorConfig[module.color] || colorConfig.violet;
          const isSelected = selectedModule?.id === module.id;
          
          return (
            <button
              key={module.id}
              onClick={() => onSelect(module)}
              className={cn(
                "group relative p-5 rounded-2xl border-2 text-left transition-all duration-300",
                "hover:shadow-lg hover:-translate-y-1",
                color.bg, color.border, color.hover,
                isSelected && "ring-2 ring-violet-500 ring-offset-2"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-3 rounded-xl", color.icon)}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  {module.credits_multiplier > 1 && (
                    <Badge className={cn("text-xs", color.badge)}>
                      {module.credits_multiplier}x积分
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>

              {/* Content */}
              <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-violet-700 transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                {module.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs capitalize border-slate-200 text-slate-500">
                  {categoryLabels[module.category] || module.category}
                </Badge>
                <span className="text-xs text-violet-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  点击使用 →
                </span>
              </div>

              {/* Glow effect on hover */}
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                "bg-gradient-to-br from-violet-500/5 to-purple-500/5"
              )} />
            </button>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <Wand2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">该分类下暂无模块</p>
        </div>
      )}
    </div>
  );
}