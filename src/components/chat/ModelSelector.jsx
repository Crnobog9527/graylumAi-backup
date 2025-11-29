import React from 'react';
import { Check, Sparkles, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const providerIcons = {
  anthropic: Sparkles,
  google: Brain,
  openai: Zap,
  custom: Sparkles
};

export default function ModelSelector({ models, selectedModel, onSelect, disabled }) {
  const selectedModelData = models.find(m => m.id === selectedModel);
  
  return (
    <Select value={selectedModel} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger className="w-full bg-white/80 backdrop-blur-sm border-slate-200 hover:border-slate-300 transition-colors h-11">
        <SelectValue placeholder="Select AI Model">
          {selectedModelData && (
            <div className="flex items-center gap-2">
              {React.createElement(providerIcons[selectedModelData.provider] || Sparkles, {
                className: "h-4 w-4 text-violet-500"
              })}
              <span className="font-medium">{selectedModelData.name}</span>
              <Badge variant="secondary" className="ml-auto text-xs bg-violet-50 text-violet-600">
                {selectedModelData.credits_per_message} credits
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white/95 backdrop-blur-xl border-slate-200">
        {models.filter(m => m.is_active).map((model) => {
          const Icon = providerIcons[model.provider] || Sparkles;
          return (
            <SelectItem 
              key={model.id} 
              value={model.id}
              className="cursor-pointer hover:bg-slate-50 py-3"
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  "p-2 rounded-lg",
                  model.provider === 'anthropic' && "bg-orange-50",
                  model.provider === 'google' && "bg-blue-50",
                  model.provider === 'openai' && "bg-emerald-50",
                  model.provider === 'custom' && "bg-violet-50"
                )}>
                  <Icon className={cn(
                    "h-4 w-4",
                    model.provider === 'anthropic' && "text-orange-500",
                    model.provider === 'google' && "text-blue-500",
                    model.provider === 'openai' && "text-emerald-500",
                    model.provider === 'custom' && "text-violet-500"
                  )} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{model.name}</div>
                  {model.description && (
                    <div className="text-xs text-slate-500 mt-0.5">{model.description}</div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {model.credits_per_message} credits
                </Badge>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}