import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import * as LucideIcons from 'lucide-react';

const colorClasses = {
  violet: 'bg-violet-50 border-violet-200 hover:border-violet-300 hover:bg-violet-100/50',
  blue: 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:bg-blue-100/50',
  emerald: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100/50',
  orange: 'bg-orange-50 border-orange-200 hover:border-orange-300 hover:bg-orange-100/50',
  pink: 'bg-pink-50 border-pink-200 hover:border-pink-300 hover:bg-pink-100/50',
  amber: 'bg-amber-50 border-amber-200 hover:border-amber-300 hover:bg-amber-100/50',
  cyan: 'bg-cyan-50 border-cyan-200 hover:border-cyan-300 hover:bg-cyan-100/50',
  rose: 'bg-rose-50 border-rose-200 hover:border-rose-300 hover:bg-rose-100/50',
};

const iconColorClasses = {
  violet: 'text-violet-500 bg-violet-100',
  blue: 'text-blue-500 bg-blue-100',
  emerald: 'text-emerald-500 bg-emerald-100',
  orange: 'text-orange-500 bg-orange-100',
  pink: 'text-pink-500 bg-pink-100',
  amber: 'text-amber-500 bg-amber-100',
  cyan: 'text-cyan-500 bg-cyan-100',
  rose: 'text-rose-500 bg-rose-100',
};

export default function PromptModuleCard({ module, onClick, isSelected }) {
  const IconComponent = LucideIcons[module.icon] || LucideIcons.Sparkles;
  const color = module.color || 'violet';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
        colorClasses[color] || colorClasses.violet,
        isSelected && "ring-2 ring-offset-2 ring-violet-400"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2.5 rounded-lg shrink-0",
          iconColorClasses[color] || iconColorClasses.violet
        )}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 truncate">{module.title}</h3>
            {module.credits_multiplier > 1 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {module.credits_multiplier}x
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{module.description}</p>
        </div>
      </div>
    </button>
  );
}