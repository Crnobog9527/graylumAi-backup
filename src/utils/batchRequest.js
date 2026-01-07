// 批量请求处理器
class BatchRequestManager {
  constructor(options = {}) {
    this.queue = [];
    this.batchDelay = options.batchDelay || 50; // 默认50ms内的请求合并
    this.maxBatchSize = options.maxBatchSize || 10; // 最大批量大小
    this.timer = null;
  }

  // 添加请求到队列
  add(request, options = {}) {
    return new Promise((resolve, reject) => {
      const { priority = 0, group = 'default' } = options;

      this.queue.push({
        request,
        resolve,
        reject,
        priority,
        group,
        addedAt: Date.now(),
      });

      // 如果达到最大批量大小，立即执行
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
        return;
      }

      // 设置批量处理定时器
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  // 批量执行
  async flush() {
    if (this.queue.length === 0) return;

    // 清除定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // 按优先级排序
    const batch = [...this.queue].sort((a, b) => b.priority - a.priority);
    this.queue = [];

    if (process.env.NODE_ENV === 'development') {
      console.log(`[BatchRequest] 批量处理 ${batch.length} 个请求`);
    }

    // 按组分组执行
    const groups = new Map();
    for (const item of batch) {
      if (!groups.has(item.group)) {
        groups.set(item.group, []);
      }
      groups.get(item.group).push(item);
    }

    // 并行执行所有请求
    const results = await Promise.allSettled(batch.map(({ request }) => request()));

    // 分发结果
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        batch[index].resolve(result.value);
      } else {
        batch[index].reject(result.reason);
      }
    });

    return results;
  }

  // 清空队列
  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // 拒绝所有待处理的请求
    for (const item of this.queue) {
      item.reject(new Error('Batch request cancelled'));
    }
    this.queue = [];
  }

  // 获取队列状态
  getStatus() {
    return {
      queueLength: this.queue.length,
      hasTimer: this.timer !== null,
    };
  }
}

// 导出单例（通用批量处理器）
export const batchManager = new BatchRequestManager();

// 创建专用批量处理器的工厂函数
export function createBatchManager(options) {
  return new BatchRequestManager(options);
}

// 批量删除对话的辅助函数
export async function batchDeleteConversations(conversationIds, deleteFunction) {
  if (conversationIds.length === 0) return [];

  const results = await Promise.allSettled(conversationIds.map((id) => deleteFunction(id)));

  const succeeded = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      succeeded.push(conversationIds[index]);
    } else {
      failed.push({
        id: conversationIds[index],
        error: result.reason,
      });
    }
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[BatchDelete] 成功: ${succeeded.length}, 失败: ${failed.length}`);
  }

  return { succeeded, failed };
}

// 批量预加载对话的辅助函数
export async function batchPrefetchConversations(conversationIds, prefetchFunction) {
  if (conversationIds.length === 0) return;

  // 限制并发数量
  const concurrency = 3;
  const chunks = [];

  for (let i = 0; i < conversationIds.length; i += concurrency) {
    chunks.push(conversationIds.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map((id) => prefetchFunction(id)));
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[BatchPrefetch] 预加载了 ${conversationIds.length} 个对话`);
  }
}
