import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ========== 性能监控配置 ==========
const TIMEOUT_THRESHOLD_MS = 30000;  // 30秒超时警告阈值
const SLOW_RESPONSE_THRESHOLD_MS = 10000;  // 10秒慢响应警告阈值
const CACHE_HIT_TARGET_RATE = 50;  // 目标缓存命中率 50%

// 日志级别控制
const LOG_LEVEL = parseInt(Deno.env.get('LOG_LEVEL') || '2', 10);
const log = {
  error: (...args: unknown[]) => console.error('[AIPerformanceMonitor]', ...args),
  warn: (...args: unknown[]) => LOG_LEVEL >= 1 && console.warn('[AIPerformanceMonitor]', ...args),
  info: (...args: unknown[]) => LOG_LEVEL >= 2 && console.log('[AIPerformanceMonitor]', ...args),
  debug: (...args: unknown[]) => LOG_LEVEL >= 3 && console.log('[AIPerformanceMonitor]', ...args),
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 支持从 URL 参数或 POST body 读取 operation
    const url = new URL(req.url);
    let operation = url.searchParams.get('operation') || 'dashboard';
    let timeRange = url.searchParams.get('time_range') || '24h';
    
    // 如果是 POST 请求，尝试从 body 读取
    let bodyData = null;
    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
        if (bodyData.operation) operation = bodyData.operation;
        if (bodyData.time_range) timeRange = bodyData.time_range;
      } catch (e) {
        // Body 解析失败，使用 URL 参数
      }
    }

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

    // ========== 记录性能数据 ==========
    if (operation === 'record') {
      const data = bodyData || {};
      const {
        conversation_id,
        model_used,
        response_time_ms,
        input_tokens,
        output_tokens,
        cached_tokens,
        cache_creation_tokens,
        cache_hit_rate,
        total_cost,
        is_error,
        error_message
      } = data;

      // 判断是否超时或慢响应
      const is_timeout = response_time_ms >= TIMEOUT_THRESHOLD_MS;
      const is_slow = response_time_ms >= SLOW_RESPONSE_THRESHOLD_MS;

      // 记录到 TokenStats（使用 service role 绕过 RLS）
      log.info('Recording to TokenStats:', { model_used, response_time_ms, input_tokens, output_tokens });
      await base44.asServiceRole.entities.TokenStats.create({
        conversation_id: conversation_id || 'unknown',
        user_email: user.email,
        model_used: model_used || 'unknown',
        input_tokens: input_tokens || 0,
        output_tokens: output_tokens || 0,
        cached_tokens: cached_tokens || 0,
        cache_creation_tokens: cache_creation_tokens || 0,
        total_cost: total_cost || 0,
        request_type: 'chat',
        response_time_ms: response_time_ms,
        is_timeout: is_timeout,
        is_slow: is_slow,
        is_error: is_error || false,
        error_message: error_message || null
      });

      // 如果超时或错误，发出警告日志
      if (is_timeout) {
        log.warn('TIMEOUT ALERT | Model:', model_used, '| Time:', response_time_ms, 'ms');
      } else if (is_slow) {
        log.warn('SLOW RESPONSE | Model:', model_used, '| Time:', response_time_ms, 'ms');
      }

      if (is_error) {
        log.error('API ERROR | Model:', model_used, '| Error:', error_message);
      }

      return Response.json({
        success: true,
        alerts: {
          is_timeout,
          is_slow,
          is_error
        }
      });
    }

    // ========== 获取性能仪表板数据 ==========
    if (operation === 'dashboard') {
      // 获取统计数据
      log.info('Fetching TokenStats for dashboard...');
      const stats = await base44.asServiceRole.entities.TokenStats.list();
      log.info('Found', stats.length, 'TokenStats records');

      // 过滤时间范围
      const filteredStats = stats.filter(s =>
        new Date(s.created_date) >= startDate
      );

      // 聚合统计
      const dashboard = {
        time_range: timeRange,
        total_requests: filteredStats.length,

        // 响应时间统计
        response_time: {
          total_ms: 0,
          avg_ms: 0,
          min_ms: Number.MAX_VALUE,
          max_ms: 0,
          p95_ms: 0,
          timeout_count: 0,
          slow_count: 0,
          timeout_rate: '0%',
          slow_rate: '0%'
        },

        // Token 和缓存统计
        token_usage: {
          total_input: 0,
          total_output: 0,
          total_cached: 0,
          total_cache_creation: 0,
          cache_hit_rate: '0%',
          cache_hit_target: CACHE_HIT_TARGET_RATE + '%',
          cache_status: 'unknown'
        },

        // 成本统计
        cost: {
          total: 0,
          avg_per_request: 0,
          estimated_savings: 0
        },

        // 错误统计
        errors: {
          total_count: 0,
          error_rate: '0%',
          recent_errors: [] as Array<{time: string, model: string, error: string}>
        },

        // 按模型分组统计
        by_model: {} as Record<string, {
          count: number,
          avg_response_time_ms: number,
          cache_hit_rate: string,
          error_count: number
        }>,

        // 按小时分组（用于图表）
        hourly_stats: [] as Array<{
          hour: string,
          requests: number,
          avg_response_time_ms: number,
          error_count: number
        }>,

        // 健康状态
        health: {
          status: 'healthy',
          issues: [] as string[]
        }
      };

      const responseTimes: number[] = [];

      for (const stat of filteredStats) {
        const responseTime = stat.response_time_ms || 0;

        // 响应时间统计
        if (responseTime > 0) {
          responseTimes.push(responseTime);
          dashboard.response_time.total_ms += responseTime;
          dashboard.response_time.min_ms = Math.min(dashboard.response_time.min_ms, responseTime);
          dashboard.response_time.max_ms = Math.max(dashboard.response_time.max_ms, responseTime);
        }

        if (stat.is_timeout) dashboard.response_time.timeout_count++;
        if (stat.is_slow) dashboard.response_time.slow_count++;

        // Token 统计
        dashboard.token_usage.total_input += stat.input_tokens || 0;
        dashboard.token_usage.total_output += stat.output_tokens || 0;
        dashboard.token_usage.total_cached += stat.cached_tokens || 0;
        dashboard.token_usage.total_cache_creation += stat.cache_creation_tokens || 0;

        // 成本统计
        dashboard.cost.total += stat.total_cost || 0;

        // 错误统计
        if (stat.is_error) {
          dashboard.errors.total_count++;
          if (dashboard.errors.recent_errors.length < 10) {
            dashboard.errors.recent_errors.push({
              time: stat.created_date,
              model: stat.model_used || 'unknown',
              error: stat.error_message || 'Unknown error'
            });
          }
        }

        // 按模型分组
        const model = stat.model_used || 'unknown';
        if (!dashboard.by_model[model]) {
          dashboard.by_model[model] = {
            count: 0,
            avg_response_time_ms: 0,
            cache_hit_rate: '0%',
            error_count: 0
          };
        }
        dashboard.by_model[model].count++;
        if (stat.is_error) dashboard.by_model[model].error_count++;
      }

      // 计算平均值和比率
      if (dashboard.total_requests > 0) {
        dashboard.response_time.avg_ms = Math.round(dashboard.response_time.total_ms / responseTimes.length) || 0;
        dashboard.response_time.timeout_rate = ((dashboard.response_time.timeout_count / dashboard.total_requests) * 100).toFixed(2) + '%';
        dashboard.response_time.slow_rate = ((dashboard.response_time.slow_count / dashboard.total_requests) * 100).toFixed(2) + '%';

        // 计算 P95
        if (responseTimes.length > 0) {
          responseTimes.sort((a, b) => a - b);
          const p95Index = Math.floor(responseTimes.length * 0.95);
          dashboard.response_time.p95_ms = responseTimes[p95Index] || dashboard.response_time.max_ms;
        }

        // 缓存命中率
        const totalTokens = dashboard.token_usage.total_input + dashboard.token_usage.total_cached;
        if (totalTokens > 0) {
          const hitRate = (dashboard.token_usage.total_cached / totalTokens) * 100;
          dashboard.token_usage.cache_hit_rate = hitRate.toFixed(2) + '%';
          dashboard.token_usage.cache_status = hitRate >= CACHE_HIT_TARGET_RATE ? 'good' : 'needs_improvement';
        }

        // 平均成本
        dashboard.cost.avg_per_request = dashboard.cost.total / dashboard.total_requests;

        // 估算缓存节省（假设缓存命中节省 90% 输入成本）
        const inputCostPerToken = 0.000003; // $3/MTok
        dashboard.cost.estimated_savings = dashboard.token_usage.total_cached * inputCostPerToken * 0.9;

        // 错误率
        dashboard.errors.error_rate = ((dashboard.errors.total_count / dashboard.total_requests) * 100).toFixed(2) + '%';

        // 按模型计算平均响应时间
        for (const model in dashboard.by_model) {
          const modelStats = filteredStats.filter(s => s.model_used === model);
          const modelResponseTimes = modelStats.map(s => s.response_time_ms || 0).filter(t => t > 0);
          if (modelResponseTimes.length > 0) {
            dashboard.by_model[model].avg_response_time_ms = Math.round(
              modelResponseTimes.reduce((a, b) => a + b, 0) / modelResponseTimes.length
            );
          }

          // 按模型计算缓存命中率
          const modelCached = modelStats.reduce((sum, s) => sum + (s.cached_tokens || 0), 0);
          const modelInput = modelStats.reduce((sum, s) => sum + (s.input_tokens || 0), 0);
          const modelTotal = modelCached + modelInput;
          if (modelTotal > 0) {
            dashboard.by_model[model].cache_hit_rate = ((modelCached / modelTotal) * 100).toFixed(2) + '%';
          }
        }
      }

      // 健康状态检查
      const timeoutRate = parseFloat(dashboard.response_time.timeout_rate);
      const errorRate = parseFloat(dashboard.errors.error_rate);
      const cacheHitRate = parseFloat(dashboard.token_usage.cache_hit_rate);

      if (timeoutRate > 5) {
        dashboard.health.status = 'critical';
        dashboard.health.issues.push(`超时率过高: ${dashboard.response_time.timeout_rate}`);
      }
      if (errorRate > 5) {
        dashboard.health.status = 'critical';
        dashboard.health.issues.push(`错误率过高: ${dashboard.errors.error_rate}`);
      }
      if (cacheHitRate < CACHE_HIT_TARGET_RATE && dashboard.total_requests > 10) {
        if (dashboard.health.status !== 'critical') {
          dashboard.health.status = 'warning';
        }
        dashboard.health.issues.push(`缓存命中率低于目标 ${CACHE_HIT_TARGET_RATE}%: ${dashboard.token_usage.cache_hit_rate}`);
      }
      if (dashboard.response_time.avg_ms > SLOW_RESPONSE_THRESHOLD_MS) {
        if (dashboard.health.status !== 'critical') {
          dashboard.health.status = 'warning';
        }
        dashboard.health.issues.push(`平均响应时间过长: ${dashboard.response_time.avg_ms}ms`);
      }

      // 修正无数据时的 min 值
      if (dashboard.response_time.min_ms === Number.MAX_VALUE) {
        dashboard.response_time.min_ms = 0;
      }

      log.info('Dashboard generated | Requests:', dashboard.total_requests, '| Health:', dashboard.health.status);

      return Response.json(dashboard);
    }

    // ========== 获取超时警报列表 ==========
    if (operation === 'alerts') {
      const stats = await base44.asServiceRole.entities.TokenStats.filter({});

      const alerts = stats
        .filter(s => new Date(s.created_date) >= startDate && (s.is_timeout || s.is_error))
        .map(s => ({
          time: s.created_date,
          type: s.is_timeout ? 'timeout' : 'error',
          model: s.model_used,
          response_time_ms: s.response_time_ms,
          error_message: s.error_message,
          conversation_id: s.conversation_id
        }))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 50);

      return Response.json({
        time_range: timeRange,
        total_alerts: alerts.length,
        alerts
      });
    }

    return Response.json({ error: 'Invalid operation' }, { status: 400 });

  } catch (error) {
    log.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});