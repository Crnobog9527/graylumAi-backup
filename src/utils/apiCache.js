// API 请求缓存和去重管理器
class APIRequestManager {
  constructor() {
    this.cache = new Map(); // 响应缓存
    this.pending = new Map(); // 进行中的请求
    this.config = {
      cacheTTL: 5 * 60 * 1000, // 缓存5分钟
      enableCache: true,
      enableDedup: true,
    };
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dedupHits: 0,
    };
  }

  // 生成缓存键
  getCacheKey(url, options) {
    const method = options?.method || 'GET';
    const body = options?.body || '';
    return `${method}:${url}:${typeof body === 'string' ? body : JSON.stringify(body)}`;
  }

  // 带缓存和去重的请求
  async fetch(url, options = {}) {
    const cacheKey = this.getCacheKey(url, options);
    this.stats.totalRequests++;

    // 1. 检查缓存
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        this.stats.cacheHits++;
        if (process.env.NODE_ENV === 'development') {
          console.log('[APICache] 缓存命中:', url);
        }
        return Promise.resolve(cached.data);
      }
    }

    // 2. 请求去重 - 如果相同请求正在进行，等待结果
    if (this.config.enableDedup && this.pending.has(cacheKey)) {
      this.stats.dedupHits++;
      if (process.env.NODE_ENV === 'development') {
        console.log('[APICache] 去重命中:', url);
      }
      return this.pending.get(cacheKey);
    }

    this.stats.cacheMisses++;

    // 3. 发起新请求
    const requestPromise = fetch(url, options)
      .then(async (response) => {
        const data = await response.json();

        // 缓存成功的响应
        if (response.ok && this.config.enableCache) {
          this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now(),
          });
        }

        return data;
      })
      .finally(() => {
        // 请求完成，从 pending 中移除
        this.pending.delete(cacheKey);
      });

    // 记录进行中的请求
    this.pending.set(cacheKey, requestPromise);

    return requestPromise;
  }

  // 清除缓存
  clearCache() {
    this.cache.clear();
    if (process.env.NODE_ENV === 'development') {
      console.log('[APICache] 缓存已清空');
    }
  }

  // 清除特定缓存
  invalidate(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (process.env.NODE_ENV === 'development' && count > 0) {
      console.log(`[APICache] 已清除 ${count} 个匹配 "${pattern}" 的缓存`);
    }
  }

  // 设置缓存TTL
  setCacheTTL(ttl) {
    this.config.cacheTTL = ttl;
  }

  // 启用/禁用缓存
  setEnableCache(enabled) {
    this.config.enableCache = enabled;
  }

  // 启用/禁用去重
  setEnableDedup(enabled) {
    this.config.enableDedup = enabled;
  }

  // 获取统计信息
  getStats() {
    const hitRate =
      this.stats.totalRequests > 0
        ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      pendingRequests: this.pending.size,
    };
  }

  // 打印统计
  logStats() {
    console.table(this.getStats());
  }

  // 重置统计
  resetStats() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dedupHits: 0,
    };
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheTTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// 导出单例
export const apiManager = new APIRequestManager();

// 定期清理过期缓存 (每分钟)
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiManager.cleanup();
  }, 60 * 1000);
}
