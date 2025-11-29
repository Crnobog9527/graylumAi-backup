import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Pen, Video, Copy, Code, BarChart3, Lightbulb, Briefcase, Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from "@/lib/utils";

const iconMap = {
  Pen,
  Video,
  Copy,
  Code,
  BarChart3,
  Lightbulb,
  Briefcase,
  Sparkles
};

const colorMap = {
  indigo: 'from-indigo-500 to-indigo-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-emerald-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-rose-500 to-rose-600',
  cyan: 'from-cyan-500 to-cyan-600'
};

export default function TemplateCard({ template, onClick, compact }) {
  const Icon = iconMap[template.icon] || Sparkles;
  const gradient = colorMap[template.color] || colorMap.indigo;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm",
          "hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all duration-300",
          "text-left w-full group"
        )}
      >
        <div className={cn(
          "p-2 rounded-lg bg-gradient-to-br text-white shadow-sm",
          gradient
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{template.title}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
      </button>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer group",
        "border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50",
        "transition-all duration-500 hover:-translate-y-1"
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-br text-white shadow-lg",
            gradient
          )}>
            <Icon className="h-5 w-5" />
          </div>
          {template.credits_cost > 0 && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
              +{template.credits_cost} credits
            </Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-lg text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
          {template.title}
        </h3>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
          {template.description}
        </p>
        
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs capitalize border-slate-200 text-slate-500">
            {template.category?.replace('_', ' ')}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Start <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
      
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br pointer-events-none",
        gradient
      )} />
    </Card>
  );
}