import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ========== 日志级别控制 ==========
// 级别: 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG
const LOG_LEVEL = parseInt(Deno.env.get('LOG_LEVEL') || '2', 10);

const log = {
  error: (...args: unknown[]) => console.error('[smartChat]', ...args),
  warn: (...args: unknown[]) => LOG_LEVEL >= 1 && console.warn('[smartChat]', ...args),
  info: (...args: unknown[]) => LOG_LEVEL >= 2 && console.log('[smartChat]', ...args),
  debug: (...args: unknown[]) => LOG_LEVEL >= 3 && console.log('[smartChat]', ...args),
};

// ========== 对话历史管理配置 ==========
// 原则：在保持上下文记忆的同时降低 token 消耗
const FULL_HISTORY_LIMIT = 10;          // 10 轮内保持完整历史（20 条消息）
const RECENT_MESSAGES_COUNT = 6;        // 超过 10 轮后，保留最近 6 条完整消息（3 轮）
const COMPRESSION_CHECK_INTERVAL = 10;  // 每 10 条消息检查一次是否需要压缩
const COMPRESSION_TRIGGER_MESSAGES = 20; // >= 20 条消息时触发压缩（10 轮）

// 其他配置
const CACHE_TTL_MINUTES = 15;
const SIMILARITY_THRESHOLD = 0.85;
const WEB_SEARCH_COST = 0.005;

// Token 估算函数
const estimateTokens = (text) => Math.ceil((text || '').length / 4);

// 标准化查询
const normalizeQuery = (query) => {
  return query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

// 计算查询hash
const hashQuery = (query, searchType) => {
  const normalized = normalizeQuery(query);
  const str = `${normalized}_${searchType}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// 检查缓存
const checkCache = async (query, searchType, base44) => {
  const queryHash = hashQuery(query, searchType);
  const caches = await base44.asServiceRole.entities.SearchCache.filter({ query_hash: queryHash });
  
  if (caches.length === 0) {
    return null;
  }
  
  const cache = caches[0];
  const now = new Date();
  const expiresAt = new Date(cache.expires_at);
  
  if (now > expiresAt) {
    // 缓存过期，删除
    await base44.asServiceRole.entities.SearchCache.delete(cache.id);
    return null;
  }
  
  // 命中缓存，更新统计
  await base44.asServiceRole.entities.SearchCache.update(cache.id, {
    hit_count: (cache.hit_count || 0) + 1,
    cost_saved: (cache.cost_saved || 0) + WEB_SEARCH_COST
  });
  
  return JSON.parse(cache.search_results);
};

// 保存缓存
const saveCache = async (query, searchType, results, base44) => {
  const queryHash = hashQuery(query, searchType);
  const normalized = normalizeQuery(query);
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
  
  try {
    await base44.asServiceRole.entities.SearchCache.create({
      query_hash: queryHash,
      normalized_query: normalized,
      search_type: searchType,
      search_results: JSON.stringify(results),
      hit_count: 0,
      expires_at: expiresAt,
      cost_saved: 0
    });
  } catch (error) {
    // Silently ignore cache save errors
  }
};

// 执行搜索
const executeSearch = async (query, searchType) => {
  // 这里集成实际的搜索API
  // 为了演示，返回模拟数据
  return {
    query,
    results: [
      { title: '搜索结果1', snippet: '相关内容...', url: 'https://example.com/1' },
      { title: '搜索结果2', snippet: '相关内容...', url: 'https://example.com/2' }
    ],
    timestamp: new Date().toISOString()
  };
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  log.debug('VERSION: 2026-01-11-OPTIMIZED');

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      log.warn('Unauthorized request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestData = await req.json();
    let conversation_id = requestData.conversation_id;
    const { message, system_prompt, image_files } = requestData;
    log.info('User:', user.email, '| Message:', message?.slice(0, 50));
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // 步骤0.5：读取系统设置
    let enableSmartRouting = true;  // 默认启用
    let enableSmartSearchDecision = true;  // 默认启用

    try {
      const settings = await base44.asServiceRole.entities.SystemSettings.list();
      const settingsMap = {};
      settings.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });

      enableSmartRouting = settingsMap.enable_smart_routing !== 'false';
      enableSmartSearchDecision = settingsMap.enable_smart_search_decision !== 'false';
      log.debug('Settings: routing=' + enableSmartRouting + ', search=' + enableSmartSearchDecision);
    } catch (e) {
      log.debug('Settings load failed, using defaults');
    }

    // 步骤1：获取模型配置
    const models = await base44.asServiceRole.entities.AIModel.filter({ is_active: true });
    if (models.length === 0) {
      throw new Error('No active AI models found');
    }

    // 优先使用默认模型或对话指定的模型
    let selectedModel = models.find(m => m.is_default) || models[0];

    if (conversation_id) {
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      if (convs.length > 0 && convs[0].model_id) {
        const convModel = models.find(m => m.id === convs[0].model_id);
        if (convModel) selectedModel = convModel;
      }
    }

    log.debug('Model:', selectedModel.name);
    
    // 步骤1.5：Token预算检查
    try {
      const budgetRes = await base44.functions.invoke('tokenBudgetManager', {
        conversation_id: conversation_id || 'temp',
        operation: 'check'
      });

      if (budgetRes.data?.budget?.is_exceeded) {
        log.warn('Token budget exceeded');
      } else if (budgetRes.data?.budget?.should_warn) {
        log.warn('Token budget at', budgetRes.data.budget.usage_percent);
      }
    } catch (e) {
      log.debug('Budget check skipped');
    }
    
    // 步骤2：智能任务分类和模型选择
    let taskClassification = null;
    let shouldUpdateSessionTaskType = false;

    if (enableSmartRouting) {
      try {
        const classifyRes = await base44.functions.invoke('taskClassifier', {
          message,
          conversation_id
        });

        if (classifyRes.data && !classifyRes.data.error) {
          taskClassification = classifyRes.data;
          shouldUpdateSessionTaskType = taskClassification.should_update_session_task_type;
          log.debug('Task:', taskClassification.task_type, '| Model:', taskClassification.recommended_model);

          // 根据任务分类结果选择模型
          if (taskClassification.model_id) {
            const classifiedModel = models.find(m =>
              m.model_id === taskClassification.model_id ||
              m.model_id.includes(taskClassification.recommended_model)
            );
            if (classifiedModel && classifiedModel.is_active) {
              selectedModel = classifiedModel;
              log.debug('Switched to:', selectedModel.name);
            }
          }
        }
      } catch (e) {
        log.debug('Task classification failed');
      }
    }
    
    // 步骤3：简化的搜索判断（关键词匹配或URL检测）
    let decision;

    if (enableSmartSearchDecision) {
      const lowerMessage = message.toLowerCase();
      const searchKeywords = [
        "天气", "股价", "汇率", "比赛", "新闻", "最新", "今天", "昨天", "现在", "当前",
        "近期", "帮我查", "搜索", "找一下", "谁是", "CEO", "总统", "总理", "价格",
        "多少钱", "排名", "评分", "weather", "stock", "price", "news", "latest", "today", "current",
        "search", "查询", "查一下"
      ];

      const hasUrl = /(https?:\/\/[^\s]+)/.test(message);
      const hasSearchKeyword = searchKeywords.some(kw => lowerMessage.includes(kw));
      const shouldSearch = hasSearchKeyword || hasUrl;

      if (shouldSearch && selectedModel.enable_web_search) {
        decision = {
          need_search: true,
          search_type: 'general',
          confidence: 0.9,
          reason: hasUrl ? 'URL detected' : 'Search keyword detected',
          decision_level: 'keyword',
          decision_time_ms: 0,
          will_use_web_search: true
        };
        log.debug('Search enabled:', decision.reason);
      } else {
        decision = {
          need_search: false,
          search_type: 'none',
          confidence: 0.9,
          reason: shouldSearch ? 'Web search disabled' : 'No search keywords',
          decision_level: 'keyword',
          decision_time_ms: 0,
          will_use_web_search: false
        };
      }
    } else {
      decision = {
        need_search: false,
        search_type: 'none',
        confidence: 1.0,
        reason: 'Search disabled in settings',
        decision_level: 'system',
        decision_time_ms: 0,
        will_use_web_search: false
      };
    }
    
    let searchResults = null;
    let cacheHit = false;
    let searchCost = 0;
    
    // will_use_web_search 已在上面设置，这里不需要额外处理
    
    // 步骤3：构建消息（不需要额外处理，联网在callAIModel中启用）
    const enhancedMessage = message;
    
    // 步骤3.5：检查是否需要压缩历史
    let shouldCompress = false;
    let summaryToUse = null;
    let compressionInfo = null;

    if (conversation_id) {
      try {
        const summaries = await base44.asServiceRole.entities.ConversationSummary.filter(
          { conversation_id },
          '-created_date',
          1
        );

        if (summaries.length > 0) {
          summaryToUse = summaries[0];
          log.debug('Found summary covering', summaryToUse.covered_messages, 'messages');
        }
      } catch (e) {
        log.debug('Summary fetch skipped');
      }
    }

    // 步骤4：获取对话历史
    let conversation;
    let conversationMessages = [];

    if (conversation_id) {
      try {
        const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
        if (convs.length > 0) {
          conversation = convs[0];
          conversationMessages = conversation.messages || [];
          log.debug('Loaded', conversationMessages.length, 'messages');
        } else {
          log.warn('Conversation not found:', conversation_id);
          conversation_id = null;
        }
      } catch (e) {
        log.warn('Error loading conversation:', e.message);
        conversation_id = null;
      }
    }
    
    // 构建消息列表 - 使用摘要替换旧消息（如果存在）
    let apiMessages = [];
    let contextType = '完整历史';
    let beforeCompressionTokens = 0;
    let afterCompressionTokens = 0;

    // 【优化】使用摘要的门槛：超过完整历史限制时
    if (summaryToUse && conversationMessages.length > FULL_HISTORY_LIMIT * 2) {
      // 有摘要且消息较多时，使用摘要 + 最近消息
      const coveredCount = summaryToUse.covered_messages * 2; // 转换为消息数（一问一答=2条）

      // 保留最近的消息（基于 RECENT_MESSAGES_COUNT）
      const recentMessages = conversationMessages.slice(-RECENT_MESSAGES_COUNT);

      // 计算压缩前的 token 数（完整历史）
      beforeCompressionTokens = conversationMessages
        .slice(0, coveredCount)
        .reduce((sum, m) => sum + estimateTokens((m.content || m.text) || ''), 0);

      // 【优化】将摘要信息自然地融入到最近消息之前
      // 不使用虚假的 assistant 消息，而是在第一条最近消息中附加上下文
      const summaryContext = `【对话历史摘要 - 前${summaryToUse.covered_messages}轮】
${summaryToUse.summary_text}

---
[以下是最近的对话]
`;

      // 计算压缩后的 token 数（摘要）
      afterCompressionTokens = estimateTokens(summaryContext);

      // 添加最近的消息，启用简化的位置缓存策略
      if (recentMessages.length > 0) {
        // 第一条消息：附加摘要上下文 + 如果摘要 >= 1024 tokens 则启用缓存
        const firstMessage = recentMessages[0];
        const firstContent = summaryContext + '\n' + ((firstMessage.content || firstMessage.text) || '');
        const shouldCacheSummary = estimateTokens(summaryContext) >= 1024;

        if (shouldCacheSummary) {
          apiMessages.push({
            role: firstMessage.role,
            content: [
              {
                type: 'text',
                text: firstContent,
                cache_control: { type: 'ephemeral' }
              }
            ]
          });
        } else {
          apiMessages.push({
            role: firstMessage.role,
            content: firstContent
          });
        }

        // 其余消息：使用位置缓存策略（倒数第4条消息）
        const remainingMessages = recentMessages.slice(1);
        const cachePoint = remainingMessages.length - 3; // 倒数第4条消息（从0开始计数）

        remainingMessages.forEach((m, idx) => {
          const content = (m.content || m.text) || '';

          // 倒数第4条消息：添加缓存标记（稳定边界）
          if (idx === cachePoint && cachePoint >= 0) {
            apiMessages.push({
              role: m.role,
              content: [
                {
                  type: 'text',
                  text: content,
                  cache_control: { type: 'ephemeral' }
                }
              ]
            });
          } else {
            // 其他消息：不缓存
            apiMessages.push({
              role: m.role,
              content: content
            });
          }
        });
      }

      contextType = '摘要+最近消息';
      compressionInfo = {
        before_tokens: beforeCompressionTokens,
        after_tokens: afterCompressionTokens,
        saved_tokens: beforeCompressionTokens - afterCompressionTokens,
        compression_ratio: ((1 - afterCompressionTokens / beforeCompressionTokens) * 100).toFixed(1)
      };

      log.debug('Summary mode: saved', compressionInfo.saved_tokens, 'tokens');
    } else {
      // 没有摘要或消息较少，使用完整历史
      apiMessages = conversationMessages.map(m => ({
        role: m.role,
        content: (m.content || m.text) || ''
      }));
      contextType = '完整历史';
    }
    
    // 添加当前增强消息
    apiMessages.push({ role: 'user', content: enhancedMessage });
    
    // 过滤掉空消息 - 安全处理 content 可能是数组（带缓存控制）或字符串的情况
    apiMessages = apiMessages.filter(m => {
      if (!m.content) return false;

      // 如果 content 是数组（带缓存控制的消息格式）
      if (Array.isArray(m.content)) {
        return m.content.some(block =>
          block && block.text && typeof block.text === 'string' && block.text.trim().length > 0
        );
      }

      // 如果 content 是字符串
      return typeof m.content === 'string' && m.content.trim().length > 0;
    });

    // 辅助函数：从消息中提取文本内容
    const getMessageText = (content) => {
      if (!content) return '';
      if (Array.isArray(content)) {
        return content.map(block => block?.text || '').join('');
      }
      return typeof content === 'string' ? content : '';
    };

    // 计算token估算
    const totalTokens = apiMessages.reduce((sum, m) => sum + estimateTokens(getMessageText(m.content)), 0) +
                        (system_prompt ? estimateTokens(system_prompt) : 0);

    log.debug('API call:', apiMessages.length, 'messages,', totalTokens, 'tokens');
    
    // ========== 系统提示词处理 ==========
    // 【重要修复】系统提示词不再只在首轮使用，而是：
    // 1. 首轮对话：使用前端传来的 system_prompt，并保存到对话记录
    // 2. 后续轮次：从对话记录中读取保存的 system_prompt
    const isFirstTurn = conversationMessages.length === 0;
    const hasNewSystemPrompt = system_prompt && system_prompt.trim().length > 0;

    // 确定最终使用的系统提示词
    let finalSystemPrompt = null;
    let systemPromptSource = 'none';

    if (isFirstTurn && hasNewSystemPrompt) {
      // 首轮对话：使用前端传来的系统提示词
      finalSystemPrompt = system_prompt;
      systemPromptSource = 'new_from_frontend';
    } else if (conversation && conversation.system_prompt) {
      // 后续轮次：从对话记录中读取保存的系统提示词
      finalSystemPrompt = conversation.system_prompt;
      systemPromptSource = 'saved_in_conversation';
    }

    const shouldUseSystemPrompt = finalSystemPrompt && finalSystemPrompt.trim().length > 0;

    log.debug('System prompt:', shouldUseSystemPrompt ? 'YES (' + systemPromptSource + ')' : 'NO');
    
    // 调用 AI 模型
    log.info('Calling AI:', selectedModel.id, '| Messages:', apiMessages.length, '| Search:', decision.will_use_web_search);

    // 构建调用参数，只在需要时添加 system_prompt
    const callParams = {
      model_id: selectedModel.id,
      messages: apiMessages,
      force_web_search: decision.will_use_web_search || false
    };

    // 【修复】使用 finalSystemPrompt（可能来自前端或对话记录）
    if (shouldUseSystemPrompt && finalSystemPrompt) {
      callParams.system_prompt = finalSystemPrompt;
    }
    
    const modelRes = await base44.functions.invoke('callAIModel', callParams);
    
    if (!modelRes.data || modelRes.data.error) {
      throw new Error(modelRes.data?.error || 'AI model call failed');
    }
    
    const modelData = modelRes.data;

    // API 性能和成本汇总
    const inputTokens = modelData.input_tokens || 0;
    const outputTokens = modelData.output_tokens || 0;
    const inputCredits = modelData.input_credits || 0;
    const outputCredits = modelData.output_credits || 0;
    const webSearchUsed = modelData.web_search_enabled || false;
    const cachedTokens = modelData.cached_tokens || 0;
    const cacheHitRate = modelData.cache_hit_rate || '0%';
    const creditsSaved = modelData.credits_saved_by_cache || 0;

    log.info('Response | Tokens:', inputTokens, '/', outputTokens, '| Cache:', cacheHitRate);
    
    // Token消耗（精确小数）
    const tokenCredits = inputCredits + outputCredits;
    
    // 获取用户当前状态
    const currentUser = await base44.asServiceRole.entities.User.filter({ email: user.email });
    if (currentUser.length === 0) {
      throw new Error('User not found');
    }
    const userRecord = currentUser[0];
    const currentBalance = userRecord.credits || 0;
    const currentPending = userRecord.pending_credits || 0;
    
    log.debug('Settlement: balance=' + currentBalance + ', pending=' + currentPending.toFixed(4) + ', cost=' + tokenCredits.toFixed(4));
    
    let finalBalance = currentBalance;
    let finalPending = currentPending;
    let actualDeducted = 0;
    let webSearchDeducted = 0;
    let tokenDeducted = 0;
    
    // 步骤1：联网搜索费用（立即扣除）
    if (webSearchUsed) {
      const WEB_SEARCH_FEE = 5;
      if (finalBalance < WEB_SEARCH_FEE) {
        throw new Error(`积分不足，联网搜索需要${WEB_SEARCH_FEE}积分，您当前只有${finalBalance}积分`);
      }
      finalBalance -= WEB_SEARCH_FEE;
      webSearchDeducted = WEB_SEARCH_FEE;
    }

    // 步骤2：Token费用加入待结算
    finalPending += tokenCredits;
    
    // 步骤3：待结算余额>=1时扣除整数部分
    if (finalPending >= 1) {
      const toDeduct = Math.floor(finalPending);
      if (finalBalance < toDeduct) {
        throw new Error(`积分不足，需要${toDeduct}积分，您当前只有${finalBalance}积分`);
      }
      finalBalance -= toDeduct;
      finalPending -= toDeduct;
      tokenDeducted = toDeduct;
    }

    actualDeducted = webSearchDeducted + tokenDeducted;
    log.info('Deducted:', actualDeducted, '| Balance:', finalBalance, '| Pending:', finalPending.toFixed(4));
    
    // 更新用户余额和待结算余额
    await base44.asServiceRole.entities.User.update(userRecord.id, {
      credits: finalBalance,
      pending_credits: finalPending,
      total_credits_used: (userRecord.total_credits_used || 0) + actualDeducted
    });
    
    // 创建交易记录
    const transactionDesc = webSearchUsed 
      ? `对话消耗 - ${selectedModel.name} (输入:${inputTokens}/${inputCredits.toFixed(3)}积分, 输出:${outputTokens}/${outputCredits.toFixed(3)}积分, 联网搜索:5积分)`
      : `对话消耗 - ${selectedModel.name} (输入:${inputTokens}/${inputCredits.toFixed(3)}积分, 输出:${outputTokens}/${outputCredits.toFixed(3)}积分)`;
    
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_email: user.email,
      type: 'usage',
      amount: -actualDeducted,
      balance_after: finalBalance,
      description: transactionDesc,
      model_used: selectedModel.name,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      input_credits: inputCredits,
      output_credits: outputCredits,
      web_search_used: webSearchUsed
    });
    
    // 更新或创建对话
    const newMessages = [
      ...conversationMessages,
      { 
        role: 'user', 
        content: message, 
        timestamp: new Date().toISOString() 
      },
      { 
        role: 'assistant', 
        content: modelData.response, 
        timestamp: new Date().toISOString(),
        credits_used: actualDeducted,
        input_tokens: inputTokens,
        output_tokens: outputTokens
      }
    ];
    
    let finalConversationId = conversation_id;
    
    if (conversation) {
      const updateData = {
        messages: newMessages,
        total_credits_used: (conversation.total_credits_used || 0) + actualDeducted,
        updated_date: new Date().toISOString()
      };

      if (shouldUpdateSessionTaskType && taskClassification) {
        updateData.session_task_type = taskClassification.task_type;
      }

      await base44.asServiceRole.entities.Conversation.update(conversation.id, updateData);
      log.debug('Updated conversation:', conversation.id);
    } else {

      const createData = {
        title: message.slice(0, 50),
        model_id: selectedModel.id,
        messages: newMessages,
        total_credits_used: actualDeducted,
        is_archived: false,
        user_email: user.email  // 用户隔离：关联用户邮箱
      };

      // 保存系统提示词
      if (hasNewSystemPrompt && system_prompt) {
        createData.system_prompt = system_prompt;
      }

      // 如果是创作类任务，记录 session_task_type
      if (shouldUpdateSessionTaskType && taskClassification) {
        createData.session_task_type = taskClassification.task_type;
      }

      const newConv = await base44.entities.Conversation.create(createData);
      finalConversationId = newConv.id;
      log.debug('Created conversation:', newConv.id);
    }

    // 步骤5：更新Token预算
    try {
      await base44.functions.invoke('tokenBudgetManager', {
        conversation_id: finalConversationId,
        operation: 'consume',
        tokens: inputTokens + outputTokens
      });
    } catch (e) {
      log.debug('Budget update skipped');
    }

    // 步骤6：检查是否需要触发压缩
    const messageCount = conversationMessages.length + 2;
    if (messageCount >= COMPRESSION_TRIGGER_MESSAGES && messageCount % COMPRESSION_CHECK_INTERVAL === 0) {
      log.debug('Triggering compression for', messageCount / 2, 'rounds');
      try {
        base44.functions.invoke('compressConversation', {
          conversation_id: finalConversationId,
          messages_to_compress: messageCount - RECENT_MESSAGES_COUNT
        }).catch(() => {});
      } catch (e) {
        // Silently ignore compression errors
      }
    }

    const responseTimeMs = Date.now() - startTime;
    log.info('Request completed in', responseTimeMs, 'ms');

    // 步骤7：直接记录性能监控数据到 TokenStats（使用用户身份，RLS 已设为 public）
    try {
      const tokenStatsData = {
        conversation_id: finalConversationId || 'unknown',
        user_email: user.email,
        model_used: selectedModel.name || 'unknown',
        input_tokens: inputTokens || 0,
        output_tokens: outputTokens || 0,
        cached_tokens: modelData.cached_tokens || 0,
        cache_creation_tokens: modelData.cache_creation_tokens || 0,
        total_cost: tokenCredits || 0,
        request_type: 'chat',
        response_time_ms: responseTimeMs,
        is_timeout: responseTimeMs >= 30000,
        is_slow: responseTimeMs >= 10000,
        is_error: false
      };
      log.info('Creating TokenStats record:', JSON.stringify(tokenStatsData));
      // 使用普通用户身份创建（RLS 已设为 public）
      const tokenStatsResult = await base44.entities.TokenStats.create(tokenStatsData);
      log.info('TokenStats created:', tokenStatsResult?.id || 'no id returned');
    } catch (e) {
      log.error('TokenStats record error:', e.message, e.stack);
    }

    return Response.json({
      conversation_id: finalConversationId,
      response: modelData.response,
      model_used: selectedModel.name,
      credits_used: actualDeducted,
      token_credits: tokenCredits,
      search_fee: webSearchDeducted,
      token_fee_deducted: tokenDeducted,
      pending_credits: finalPending,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      input_credits: inputCredits,
      output_credits: outputCredits,
      search_info: {
        executed: webSearchUsed,
        cache_hit: false,
        cost: webSearchDeducted
      },
      task_classification: taskClassification,
      compression_used: !!summaryToUse,
      context_type: contextType,
      compression_info: compressionInfo
    });
    
  } catch (error) {
    const errorTimeMs = Date.now() - startTime;
    log.error('Error:', error.message);

    // 记录错误到 TokenStats
    try {
      const base44ForError = createClientFromRequest(req);
      const errorUser = await base44ForError.auth.me().catch(() => null);
      // 使用普通用户身份创建（RLS 已设为 public）
      await base44ForError.entities.TokenStats.create({
        conversation_id: 'error',
        user_email: errorUser?.email || 'unknown',
        model_used: 'unknown',
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        cache_creation_tokens: 0,
        total_cost: 0,
        request_type: 'chat',
        response_time_ms: errorTimeMs,
        is_timeout: false,
        is_slow: false,
        is_error: true,
        error_message: error.message
      });
    } catch (e) {
      log.error('Error recording TokenStats for error:', e.message);
    }

    return Response.json({
      error: error.message,
      time_ms: errorTimeMs
    }, { status: 500 });
  }
});