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

  // 计算积分消耗（新规则）
  const calculateCredits = (inputTokens, outputTokens) => {
    const inputCredits = inputTokens / 1000;  // 1积分 = 1000 tokens
    const outputCredits = outputTokens / 200;  // 1积分 = 200 tokens
    return inputCredits + outputCredits;
  };

  const lastCredits = calculateCredits(lastInputTokens, lastOutputTokens);
  const totalCredits = calculateCredits(totalInputTokens, totalOutputTokens);

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
            <div className="text-xs text-slate-400">
              tokens ≈ {(lastInputTokens / 1000).toFixed(3)}积分
            </div>
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
            <div className="text-xs text-slate-400">
              tokens ≈ {(lastOutputTokens / 200).toFixed(3)}积分
            </div>
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

          {/* 积分消耗 */}
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 text-xs text-green-600 mb-1">
              <DollarSign className="h-3 w-3" />
              <span>积分消耗</span>
            </div>
            <div className="text-lg font-semibold text-green-700">
              {totalCredits.toFixed(3)}
            </div>
            <div className="text-xs text-green-500">
              本次: {lastCredits.toFixed(3)}积分
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}