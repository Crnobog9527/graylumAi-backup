import { base44 } from '@/api/base44Client';

// 对话历史本地缓存
const conversationCache = new Map();
const messageHistoryCache = new Map();

// 进行中的请求跟踪 (防止重复发送)
const pendingRequests = new Map();

// 缓存配置
const CACHE_CONFIG = {
  conversationListTTL: 2 * 60 * 1000, // 对话列表：2分钟
  conversationHistoryTTL: 5 * 60 * 1000, // 对话历史：5分钟
  userInfoTTL: 10 * 60 * 1000, // 用户信息：10分钟
};

export const chatAPI = {
  // 发送消息（不缓存，但去重）
  async sendMessage(params) {
    const {
      conversationId,
      message,
      systemPrompt,
      imageFiles,
    } = params;

    // 生成请求唯一键
    const requestKey = `send:${conversationId || 'new'}:${message.slice(0, 50)}`;

    // 检查是否有相同请求正在进行
    if (pendingRequests.has(requestKey)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ChatAPI] 阻止重复发送:', requestKey);
      }
      return pendingRequests.get(requestKey);
    }

    const requestPromise = base44.functions
      .invoke('smartChatWithSearch', {
        conversation_id: conversationId,
        message,
        system_prompt: systemPrompt,
        image_files: imageFiles,
      })
      .then((result) => {
        // 发送成功后，清除相关缓存
        if (conversationId) {
          messageHistoryCache.delete(conversationId);
        }
        return result;
      })
      .finally(() => {
        pendingRequests.delete(requestKey);
      });

    pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  },

  // 获取对话列表（带缓存）
  async getConversations(userEmail, options = {}) {
    const { forceRefresh = false } = options;
    const cacheKey = `conversations:${userEmail}`;

    // 检查本地缓存
    if (!forceRefresh) {
      const cached = conversationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.conversationListTTL) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ChatAPI] 使用缓存的对话列表');
        }
        return cached.data;
      }
    }

    const data = await base44.entities.Conversation.filter(
      { created_by: userEmail, is_archived: false },
      '-updated_date'
    );

    // 更新本地缓存
    conversationCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  },

  // 获取对话历史（带缓存）
  async getConversationHistory(conversationId, options = {}) {
    const { forceRefresh = false } = options;

    // 检查本地缓存
    if (!forceRefresh) {
      const cached = messageHistoryCache.get(conversationId);
      if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.conversationHistoryTTL) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ChatAPI] 使用缓存的对话历史:', conversationId);
        }
        return cached.data;
      }
    }

    const data = await base44.entities.Conversation.get(conversationId);

    // 更新本地缓存
    messageHistoryCache.set(conversationId, {
      data,
      timestamp: Date.now(),
    });

    return data;
  },

  // 刷新对话列表（清除缓存后重新获取）
  async refreshConversations(userEmail) {
    // 清除所有对话列表缓存
    for (const key of conversationCache.keys()) {
      if (key.startsWith('conversations:')) {
        conversationCache.delete(key);
      }
    }
    return this.getConversations(userEmail, { forceRefresh: true });
  },

  // 刷新单个对话
  async refreshConversation(conversationId) {
    messageHistoryCache.delete(conversationId);
    return this.getConversationHistory(conversationId, { forceRefresh: true });
  },

  // 清除所有缓存
  clearAllCache() {
    conversationCache.clear();
    messageHistoryCache.clear();
    if (process.env.NODE_ENV === 'development') {
      console.log('[ChatAPI] 所有缓存已清空');
    }
  },

  // 使特定对话缓存失效
  invalidateConversation(conversationId) {
    messageHistoryCache.delete(conversationId);
  },

  // 使对话列表缓存失效
  invalidateConversationList(userEmail) {
    if (userEmail) {
      conversationCache.delete(`conversations:${userEmail}`);
    } else {
      // 清除所有对话列表缓存
      for (const key of conversationCache.keys()) {
        if (key.startsWith('conversations:')) {
          conversationCache.delete(key);
        }
      }
    }
  },

  // 获取缓存统计
  getCacheStats() {
    return {
      conversationCacheSize: conversationCache.size,
      messageHistoryCacheSize: messageHistoryCache.size,
      pendingRequestsCount: pendingRequests.size,
    };
  },

  // 检查是否有进行中的请求
  hasPendingRequest(conversationId) {
    for (const key of pendingRequests.keys()) {
      if (key.includes(conversationId || 'new')) {
        return true;
      }
    }
    return false;
  },

  // 预加载对话历史
  async prefetchConversation(conversationId) {
    // 如果已经有缓存，不再预加载
    if (messageHistoryCache.has(conversationId)) {
      return;
    }
    // 后台加载，不阻塞
    this.getConversationHistory(conversationId).catch(() => {
      // 预加载失败可以忽略
    });
  },
};
