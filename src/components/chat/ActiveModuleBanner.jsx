import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Lock, Sparkles } from 'lucide-react';

export default function ActiveModuleBanner({ module, onClear }) {
  if (!module) return null;

  return (
    <div className={cn(
      "mx-4 lg:mx-6 mb-4 p-4 rounded-xl border-2",
      "bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200",
      "animate-in slide-in-from-top-2 duration-300"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100">
            <Lock className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-violet-800">{module.title}</span>
              <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                专用模式
              </Badge>
            </div>
            <p className="text-xs text-violet-600 mt-0.5">
              对话将严格遵循此模块的提示词约束，确保专业输出
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-violet-600 hover:text-violet-800 hover:bg-violet-100"
        >
          <X className="h-4 w-4 mr-1" />
          退出模式
        </Button>
      </div>
    </div>
  );
}