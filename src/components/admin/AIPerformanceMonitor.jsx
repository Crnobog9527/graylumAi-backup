import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, Clock, Zap, AlertTriangle, CheckCircle2, 
  TrendingUp, Database, DollarSign, RefreshCw, Bot
} from 'lucide-react';

// 性能监控配置
const TIMEOUT_THRESHOLD_MS = 30000;
const SLOW_RESPONSE_THRESHOLD_MS = 10000;
const CACHE_HIT_TARGET_RATE = 50;

export default function AIPerformanceMonitor() {
  const [timeRange, setTimeRange] = useState('24h');

  // 直接从前端读取 TokenStats 数据（类似财务统计的方式）
  const { data: tokenStats = [], isLoading, refetch, error } = useQuery({
    queryKey: ['token-stats'],
    queryFn: async () => {
      console.log('[AIPerformanceMonitor] Fetching TokenStats directly...');
      const stats = await base44.entities.TokenStats.list('-created_date', 1000);
      console.log('[AIPerformanceMonitor] Fetched', stats.length, 'records');
      console.log('[AIPerformanceMonitor] Sample record:', stats[0]);
      return stats;
    },
    refetchInterval: 30000
  });

  // 根据时间范围过滤并计算仪表板数据
  const dashboard = useMemo(() => {
    if (!tokenStats.length) return null;

    // 计算时间范围
    let startDate = new Date();
    if (timeRange === '1h') {
      startDate = new Date(Date.now() - 60 * 60 * 1000);
    } else if (timeRange === '24h') {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (timeRange === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // 过滤时间范围内的数据
    const filteredStats = tokenStats.filter(s => {
      const createdDate = new Date(s.created_date);
      return createdDate >= startDate;
    });

    console.log('[AIPerformanceMonitor] Filtered to', filteredStats.length, 'records for', timeRange);

    // 初始化仪表板
    const result = {
      time_range: timeRange,
      total_requests: filteredStats.length,
      response_time: {
        total_ms: 0,
        avg_ms: 0,
        min_ms: Number.MAX_VALUE,
        max_ms: 0,
        p95_ms: 0,
        timeout_count: 0,
        slow_count: 0
      },
      token_usage: {
        total_input: 0,
        total_output: 0,
        total_cached: 0,
        total_cache_creation: 0,
        cache_hit_rate: '0%',
        cache_hit_target: CACHE_HIT_TARGET_RATE + '%'
      },
      cost: {
        total: 0,
        avg_per_request: 0,
        estimated_savings: 0
      },
      errors: {
        total_count: 0,
        error_rate: '0%',
        recent_errors: []
      },
      by_model: {},
      health: {
        status: 'healthy',
        issues: []
      }
    };

    const responseTimes = [];

    for (const stat of filteredStats) {
      const responseTime = Number(stat.response_time_ms) || 0;

      // 响应时间统计
      if (responseTime > 0) {
        responseTimes.push(responseTime);
        result.response_time.total_ms += responseTime;
        result.response_time.min_ms = Math.min(result.response_time.min_ms, responseTime);
        result.response_time.max_ms = Math.max(result.response_time.max_ms, responseTime);
      }

      if (stat.is_timeout) result.response_time.timeout_count++;
      if (stat.is_slow) result.response_time.slow_count++;

      // Token 统计
      result.token_usage.total_input += Number(stat.input_tokens) || 0;
      result.token_usage.total_output += Number(stat.output_tokens) || 0;
      result.token_usage.total_cached += Number(stat.cached_tokens) || 0;
      result.token_usage.total_cache_creation += Number(stat.cache_creation_tokens) || 0;

      // 成本统计
      result.cost.total += Number(stat.total_cost) || 0;

      // 错误统计
      if (stat.is_error) {
        result.errors.total_count++;
        if (result.errors.recent_errors.length < 10) {
          result.errors.recent_errors.push({
            time: stat.created_date,
            model: stat.model_used || 'unknown',
            error: stat.error_message || 'Unknown error'
          });
        }
      }

      // 按模型分组
      const model = stat.model_used || 'unknown';
      if (!result.by_model[model]) {
        result.by_model[model] = {
          count: 0,
          total_response_time: 0,
          avg_response_time_ms: 0,
          cache_hit_rate: '0%',
          error_count: 0,
          total_cached: 0,
          total_input: 0
        };
      }
      result.by_model[model].count++;
      result.by_model[model].total_response_time += responseTime;
      result.by_model[model].total_cached += Number(stat.cached_tokens) || 0;
      result.by_model[model].total_input += Number(stat.input_tokens) || 0;
      if (stat.is_error) result.by_model[model].error_count++;
    }

    // 计算平均值和比率
    if (result.total_requests > 0) {
      result.response_time.avg_ms = responseTimes.length > 0 
        ? Math.round(result.response_time.total_ms / responseTimes.length)
        : 0;

      // 计算 P95
      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);
        const p95Index = Math.floor(responseTimes.length * 0.95);
        result.response_time.p95_ms = responseTimes[p95Index] || result.response_time.max_ms;
      }

      // 缓存命中率
      const totalTokens = result.token_usage.total_input + result.token_usage.total_cached;
      if (totalTokens > 0) {
        const hitRate = (result.token_usage.total_cached / totalTokens) * 100;
        result.token_usage.cache_hit_rate = hitRate.toFixed(2) + '%';
      }

      // 平均成本
      result.cost.avg_per_request = result.cost.total / result.total_requests;

      // 估算缓存节省
      const inputCostPerToken = 0.000003;
      result.cost.estimated_savings = result.token_usage.total_cached * inputCostPerToken * 0.9;

      // 错误率
      result.errors.error_rate = ((result.errors.total_count / result.total_requests) * 100).toFixed(2) + '%';

      // 按模型计算平均响应时间和缓存命中率
      for (const model in result.by_model) {
        const m = result.by_model[model];
        m.avg_response_time_ms = m.count > 0 ? Math.round(m.total_response_time / m.count) : 0;
        const modelTotal = m.total_cached + m.total_input;
        if (modelTotal > 0) {
          m.cache_hit_rate = ((m.total_cached / modelTotal) * 100).toFixed(2) + '%';
        }
      }
    }

    // 修正无数据时的 min 值
    if (result.response_time.min_ms === Number.MAX_VALUE) {
      result.response_time.min_ms = 0;
    }

    // 健康状态检查
    const timeoutRate = parseFloat(result.response_time.timeout_count / result.total_requests * 100) || 0;
    const errorRate = parseFloat(result.errors.error_rate) || 0;
    const cacheHitRate = parseFloat(result.token_usage.cache_hit_rate) || 0;

    if (timeoutRate > 5) {
      result.health.status = 'critical';
      result.health.issues.push(`超时率过高: ${timeoutRate.toFixed(2)}%`);
    }
    if (errorRate > 5) {
      result.health.status = 'critical';
      result.health.issues.push(`错误率过高: ${result.errors.error_rate}`);
    }
    if (cacheHitRate < CACHE_HIT_TARGET_RATE && result.total_requests > 10) {
      if (result.health.status !== 'critical') {
        result.health.status = 'warning';
      }
      result.health.issues.push(`缓存命中率低于目标 ${CACHE_HIT_TARGET_RATE}%: ${result.token_usage.cache_hit_rate}`);
    }

    return result;
  }, [tokenStats, timeRange]);

  // 调试：显示错误
  if (error) {
    console.error('[AIPerformanceMonitor] Error:', error);
  }

  const getHealthBadge = (status) => {
    const styles = {
      healthy: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
      warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
      critical: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle }
    };
    const style = styles[status] || styles.healthy;
    const Icon = style.icon;
    return (
      <Badge className={`${style.bg} ${style.text} gap-1`}>
        <Icon className="h-3 w-3" />
        {status === 'healthy' ? '健康' : status === 'warning' ? '警告' : '严重'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-500">加载性能数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部标题和控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">AI 性能监控</h2>
            <p className="text-xs text-slate-500">实时监控 API 响应和资源使用</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dashboard && getHealthBadge(dashboard.health?.status)}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">最近1小时</SelectItem>
              <SelectItem value="24h">最近24小时</SelectItem>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 健康问题警告 */}
      {dashboard?.health?.issues?.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">发现以下问题</h4>
                <ul className="mt-1 space-y-1">
                  {dashboard.health.issues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-yellow-700">• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 总请求数 */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">总请求数</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.total_requests?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 平均响应时间 */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">平均响应时间</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.response_time?.avg_ms?.toLocaleString() || 0}
                  <span className="text-sm font-normal text-slate-500">ms</span>
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              P95: {dashboard?.response_time?.p95_ms?.toLocaleString() || 0}ms
            </p>
          </CardContent>
        </Card>

        {/* 缓存命中率 */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">缓存命中率</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.token_usage?.cache_hit_rate || '0%'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              目标: {dashboard?.token_usage?.cache_hit_target || '50%'}
            </p>
          </CardContent>
        </Card>

        {/* 错误率 */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">错误率</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.errors?.error_rate || '0%'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              共 {dashboard?.errors?.total_count || 0} 个错误
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Token 使用统计 */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              Token 使用统计
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">输入 Tokens</span>
              <span className="font-medium">{dashboard?.token_usage?.total_input?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">输出 Tokens</span>
              <span className="font-medium">{dashboard?.token_usage?.total_output?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">缓存读取 Tokens</span>
              <span className="font-medium text-green-600">{dashboard?.token_usage?.total_cached?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">缓存创建 Tokens</span>
              <span className="font-medium">{dashboard?.token_usage?.total_cache_creation?.toLocaleString() || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* 成本统计 */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              成本统计
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">总成本 (USD)</span>
              <span className="font-medium">${dashboard?.cost?.total?.toFixed(4) || '0.0000'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">平均每次请求</span>
              <span className="font-medium">${dashboard?.cost?.avg_per_request?.toFixed(6) || '0.000000'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">缓存节省估算</span>
              <span className="font-medium text-green-600">${dashboard?.cost?.estimated_savings?.toFixed(4) || '0.0000'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 按模型统计 */}
      {dashboard?.by_model && Object.keys(dashboard.by_model).length > 0 && (
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-600" />
              按模型统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 text-slate-600 font-medium">模型</th>
                    <th className="text-right py-2 text-slate-600 font-medium">请求数</th>
                    <th className="text-right py-2 text-slate-600 font-medium">平均响应时间</th>
                    <th className="text-right py-2 text-slate-600 font-medium">缓存命中率</th>
                    <th className="text-right py-2 text-slate-600 font-medium">错误数</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dashboard.by_model).map(([model, stats]) => (
                    <tr key={model} className="border-b border-slate-100">
                      <td className="py-3 font-medium">{model}</td>
                      <td className="text-right py-3">{stats.count}</td>
                      <td className="text-right py-3">{stats.avg_response_time_ms}ms</td>
                      <td className="text-right py-3">{stats.cache_hit_rate}</td>
                      <td className="text-right py-3">
                        {stats.error_count > 0 ? (
                          <span className="text-red-600">{stats.error_count}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最近错误 */}
      {dashboard?.errors?.recent_errors?.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              最近错误
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.errors.recent_errors.map((error, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">{error.model}</span>
                      <span className="text-xs text-red-400">
                        {new Date(error.time).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm text-red-700 truncate">{error.error}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}