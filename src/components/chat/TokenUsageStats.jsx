import React from 'react';
import { Activity, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TokenUsageStats({ messages, currentModel }) {
  // 计算最后一次请求的 tokens
  const lastAssistantMessage = messages
    .slice()
    .reverse()
    .find(m => m.role === 'assistant');
  
  const lastInputTokens = lastAssistantMessage?.input_tokens || 0;
  const lastOutputTokens = lastAssistantMessage?.output_tokens || 0;

  // 计算会话累计 tokens
  const totalInputTokens = messages
    .filter(m => m.role === 'assistant')
    .reduce((sum, m) => sum + (m.input_tokens || 0), 0);
  
  const totalOutputTokens = messages
    .filter(m => m.role === 'assistant')
    .reduce((sum, m) => sum + (m.output_tokens || 0), 0);

  // 计算预估成本（美元）
  const calculateCost = (inputTokens, outputTokens) => {
    if (!currentModel) return 0;
    
    // 新的积分计算规则
    const inputCost = inputTokens / 1000;  // 1积分/1000tokens
    const outputCost = outputTokens / 200;  // 1积分/200tokens
    
    return inputCost + outputCost;
  };

  const lastCost = calculateCost(lastInputTokens, lastOutputTokens);
  const totalCost = calculateCost(totalInputTokens, totalOutputTokens);

  if (messages.length === 0) return null;

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 本次输入 */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Activity className="h-3 w-3" />
              <span>本次输入</span>
            </div>
            <div className="text-lg font-semibold text-slate-800">
              {lastInputTokens.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">tokens</div>
          </div>

          {/* 本次输出 */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Activity className="h-3 w-3" />
              <span>本次输出</span>
            </div>
            <div className="text-lg font-semibold text-slate-800">
              {lastOutputTokens.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">tokens</div>
          </div>

          {/* 累计使用 */}
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>会话累计</span>
            </div>
            <div className="text-lg font-semibold text-blue-700">
              {(totalInputTokens + totalOutputTokens).toLocaleString()}
            </div>
            <div className="text-xs text-blue-500">
              {totalInputTokens.toLocaleString()} + {totalOutputTokens.toLocaleString()}
            </div>
          </div>

          {/* 预估积分 */}
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 text-xs text-green-600 mb-1">
              <DollarSign className="h-3 w-3" />
              <span>预估积分</span>
            </div>
            <div className="text-lg font-semibold text-green-700">
              {totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-green-500">
              本次: {lastCost.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}