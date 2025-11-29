import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain, Bot } from 'lucide-react';

const iconMap = {
  Sparkles,
  Zap,
  Brain,
  Bot
};

export default function ModelSelector({ models, selectedModel, onSelectModel, disabled }) {
  const getIcon = (iconName) => {
    const Icon = iconMap[iconName] || Bot;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Select value={selectedModel} onValueChange={onSelectModel} disabled={disabled}>
      <SelectTrigger className="w-[220px] bg-white/80 backdrop-blur-sm border-slate-200 hover:border-indigo-300 transition-colors">
        <SelectValue placeholder="Select AI Model" />
      </SelectTrigger>
      <SelectContent className="bg-white/95 backdrop-blur-xl border-slate-200">
        {models.filter(m => m.is_active).map((model) => (
          <SelectItem 
            key={model.id} 
            value={model.model_id}
            className="cursor-pointer hover:bg-indigo-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100">
                {getIcon(model.icon)}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-slate-800">{model.name}</span>
                <span className="text-xs text-slate-500">{model.credits_per_message} credits/msg</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}