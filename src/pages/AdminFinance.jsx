import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Coins, Bot, Sparkles, Brain, Zap, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import AdminSidebar from '../components/admin/AdminSidebar';
import StatsCard from '../components/admin/StatsCard';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

const providerIcons = {
  anthropic: Sparkles,
  google: Brain,
  openai: Zap,
  custom: Bot,
  builtin: Zap
};

function AdminFinanceContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: models = [] } = useQuery({
    queryKey: ['admin-models'],
    queryFn: () => base44.entities.AIModel.list(),
    enabled: !!user,
  });

  const { data: usageStats = [] } = useQuery({
    queryKey: ['admin-usage-stats'],
    queryFn: () => base44.entities.ModelUsageStats.list(),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => base44.entities.CreditTransaction.filter({ type: 'purchase' }),
    enabled: !!user,
  });

  // 计算各模型的统计数据
  const modelStats = models.map(model => {
    const stats = usageStats.filter(s => s.model_id === model.id);
    const totalInputTokens = stats.reduce((sum, s) => sum + (s.input_tokens || 0), 0);
    const totalOutputTokens = stats.reduce((sum, s) => sum + (s.output_tokens || 0), 0);
    const totalRequests = stats.reduce((sum, s) => sum + (s.total_requests || 0), 0);
    const creditsEarned = stats.reduce((sum, s) => sum + (s.credits_earned || 0), 0);

    // 计算成本 (每百万tokens的价格)
    const inputCost = (totalInputTokens / 1000000) * (model.input_token_cost || 0);
    const outputCost = (totalOutputTokens / 1000000) * (model.output_token_cost || 0);
    const totalCost = inputCost + outputCost;

    // 假设每积分对应的收入（可从设置中获取，这里假设1积分=0.01美元）
    const creditsToUSD = 0.01;
    const revenue = creditsEarned * creditsToUSD;
    const profit = revenue - totalCost;

    return {
      ...model,
      totalInputTokens,
      totalOutputTokens,
      totalRequests,
      creditsEarned,
      inputCost,
      outputCost,
      totalCost,
      revenue,
      profit
    };
  });

  // 计算全站总计
  const totalStats = {
    inputTokens: modelStats.reduce((sum, m) => sum + m.totalInputTokens, 0),
    outputTokens: modelStats.reduce((sum, m) => sum + m.totalOutputTokens, 0),
    totalRequests: modelStats.reduce((sum, m) => sum + m.totalRequests, 0),
    totalCost: modelStats.reduce((sum, m) => sum + m.totalCost, 0),
    totalRevenue: modelStats.reduce((sum, m) => sum + m.revenue, 0),
    totalProfit: modelStats.reduce((sum, m) => sum + m.profit, 0),
    creditsEarned: modelStats.reduce((sum, m) => sum + m.creditsEarned, 0),
  };

  // 从购买交易计算实际收入
  const actualPurchaseRevenue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatUSD = (num) => {
    return '$' + num.toFixed(4);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminFinance" />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t('financeTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('financeSubtitle')}</p>
        </div>

        {/* 全站总览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title={t('totalCost')}
            value={formatUSD(totalStats.totalCost)}
            icon={TrendingDown}
            color="rose"
          />
          <StatsCard
            title={t('totalRevenue')}
            value={formatUSD(totalStats.totalRevenue)}
            subtitle={`${totalStats.creditsEarned.toLocaleString()} ${t('creditsEarned')}`}
            icon={TrendingUp}
            color="emerald"
          />
          <StatsCard
            title={t('totalProfit')}
            value={formatUSD(totalStats.totalProfit)}
            icon={DollarSign}
            color={totalStats.totalProfit >= 0 ? 'emerald' : 'rose'}
          />
          <StatsCard
            title={t('totalApiRequests')}
            value={totalStats.totalRequests.toLocaleString()}
            icon={BarChart3}
            color="violet"
          />
        </div>

        {/* Token 消耗统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Coins className="h-5 w-5 text-blue-500" />
                {t('totalInputTokens')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{formatNumber(totalStats.inputTokens)}</p>
              <p className="text-sm text-slate-500 mt-1">{t('inputTokensCost')}: {formatUSD(modelStats.reduce((sum, m) => sum + m.inputCost, 0))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Coins className="h-5 w-5 text-purple-500" />
                {t('totalOutputTokens')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{formatNumber(totalStats.outputTokens)}</p>
              <p className="text-sm text-slate-500 mt-1">{t('outputTokensCost')}: {formatUSD(modelStats.reduce((sum, m) => sum + m.outputCost, 0))}</p>
            </CardContent>
          </Card>
        </div>

        {/* 各模型渠道详情 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-500" />
              {t('modelChannelStats')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('modelName')}</TableHead>
                  <TableHead className="text-right">{t('inputTokens')}</TableHead>
                  <TableHead className="text-right">{t('outputTokens')}</TableHead>
                  <TableHead className="text-right">{t('requests')}</TableHead>
                  <TableHead className="text-right">{t('cost')}</TableHead>
                  <TableHead className="text-right">{t('revenue')}</TableHead>
                  <TableHead className="text-right">{t('profit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelStats.map((model) => {
                  const Icon = providerIcons[model.provider] || Bot;
                  return (
                    <TableRow key={model.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-100">
                            <Icon className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-xs text-slate-500">
                              入: ${model.input_token_cost || 0}/M | 出: ${model.output_token_cost || 0}/M
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(model.totalInputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(model.totalOutputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {model.totalRequests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-rose-600">
                        {formatUSD(model.totalCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">
                        {formatUSD(model.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={model.profit >= 0 ? "default" : "destructive"} className={model.profit >= 0 ? "bg-emerald-100 text-emerald-700" : ""}>
                          {formatUSD(model.profit)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {modelStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      {t('noModelStats')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">
            <strong>{t('note')}:</strong> {t('financeNote')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminFinance() {
  return (
    <LanguageProvider>
      <AdminFinanceContent />
    </LanguageProvider>
  );
}