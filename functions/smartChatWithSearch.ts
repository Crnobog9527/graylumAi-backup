import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
    console.error('Save cache error:', error);
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
  console.log('[smartChatWithSearch] Request started');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('[smartChatWithSearch] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const requestData = await req.json();
    let conversation_id = requestData.conversation_id;
    const { message, system_prompt, image_files } = requestData;
    console.log('[smartChatWithSearch] User:', user.email, 'Message:', message?.slice(0, 50));
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // 步骤1：获取模型配置，检查是否启用智能搜索
    console.log('[smartChatWithSearch] Getting AI models...');
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
    
    console.log('[smartChatWithSearch] Using model:', selectedModel.name, 'Web search enabled:', selectedModel.enable_web_search);
    
    // 步骤1.5：Token预算检查
    try {
      const budgetRes = await base44.functions.invoke('tokenBudgetManager', {
        conversation_id: conversation_id || 'temp',
        operation: 'check'
      });
      
      if (budgetRes.data?.budget?.is_exceeded) {
        console.log('[smartChatWithSearch] WARNING: Token budget exceeded');
      } else if (budgetRes.data?.budget?.should_warn) {
        console.log('[smartChatWithSearch] WARNING: Token budget at', budgetRes.data.budget.usage_percent);
      }
    } catch (e) {
      console.log('[smartChatWithSearch] Budget check skipped:', e.message);
    }
    
    // 步骤2：智能任务分类和模型选择
    let taskClassification = null;
    let shouldUpdateSessionTaskType = false;
    try {
      const classifyRes = await base44.functions.invoke('taskClassifier', {
        message,
        conversation_id
      });
      
      if (classifyRes.data && !classifyRes.data.error) {
        taskClassification = classifyRes.data;
        shouldUpdateSessionTaskType = taskClassification.should_update_session_task_type;
        
        console.log('[smartChatWithSearch] Task classification:', taskClassification.task_type, 
                    '| Model:', taskClassification.recommended_model,
                    '| Complexity:', taskClassification.complexity_score,
                    '| Continuation:', taskClassification.is_continuation);
        
        // 根据任务分类结果选择模型（如果有对应的AI模型）
        if (taskClassification.model_id) {
          const classifiedModel = models.find(m => 
            m.model_id === taskClassification.model_id || 
            m.model_id.includes(taskClassification.recommended_model)
          );
          if (classifiedModel && classifiedModel.is_active) {
            selectedModel = classifiedModel;
            console.log('[smartChatWithSearch] Switched to classified model:', selectedModel.name);
          }
        }
      }
    } catch (e) {
      console.log('[smartChatWithSearch] Task classification skipped:', e.message);
    }
    
    // 步骤3：简化的搜索判断（关键词匹配或URL检测）- 无论模型是否启用联网，都进行判断
    const lowerMessage = message.toLowerCase();
    const searchKeywords = [
      "天气", "股价", "汇率", "比赛", "新闻", "最新", "今天", "昨天", "现在", "当前",
      "近期", "帮我查", "搜索", "找一下", "谁是", "CEO", "总统", "总理", "价格",
      "多少钱", "排名", "评分", "weather", "stock", "price", "news", "latest", "today", "current",
      "search", "查询", "查一下"
    ];
    
    // URL 检测正则
    const hasUrl = /(https?:\/\/[^\s]+)/.test(message);
    const hasSearchKeyword = searchKeywords.some(kw => lowerMessage.includes(kw));
    const shouldSearch = hasSearchKeyword || hasUrl;
    
    let decision;
    if (shouldSearch && selectedModel.enable_web_search) {
      decision = {
        need_search: true,
        search_type: 'general',
        confidence: 0.9,
        reason: hasUrl ? '检测到URL链接' : '检测到搜索关键词',
        decision_level: 'keyword',
        decision_time_ms: 0,
        will_use_web_search: true
      };
      console.log('[smartChatWithSearch] ✓ Search enabled by', hasUrl ? 'URL detection' : 'keyword match');
    } else {
      decision = {
        need_search: false,
        search_type: 'none',
        confidence: 0.9,
        reason: shouldSearch ? 'Web search disabled in model settings' : '未检测到搜索关键词或URL',
        decision_level: 'keyword',
        decision_time_ms: 0,
        will_use_web_search: false
      };
      console.log('[smartChatWithSearch] ✗ Search disabled -', decision.reason);
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
        // 获取现有摘要
        const summaries = await base44.asServiceRole.entities.ConversationSummary.filter(
          { conversation_id },
          '-created_date',
          1
        );

        if (summaries.length > 0) {
          summaryToUse = summaries[0];
          console.log('[smartChatWithSearch] Found existing summary covering', summaryToUse.covered_messages, 'messages');
        }
      } catch (e) {
        console.log('[smartChatWithSearch] Summary fetch skipped:', e.message);
      }
    }
    
    // 步骤4：获取对话历史
    let conversation;
    let conversationMessages = [];
    
    if (conversation_id) {
      console.log('[smartChatWithSearch] Loading conversation:', conversation_id);
      try {
        const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
        if (convs.length > 0) {
          conversation = convs[0];
          conversationMessages = conversation.messages || [];
          console.log('[smartChatWithSearch] Loaded', conversationMessages.length, 'messages from conversation');
        } else {
          console.log('[smartChatWithSearch] Conversation not found, treating as new');
          conversation_id = null;
        }
      } catch (e) {
        console.log('[smartChatWithSearch] Error loading conversation:', e.message, '- treating as new');
        conversation_id = null;
      }
    } else {
      console.log('[smartChatWithSearch] New conversation, no history');
    }
    
    // 构建消息列表 - 使用摘要替换旧消息（如果存在）
    let apiMessages = [];
    let contextType = '完整历史';
    let beforeCompressionTokens = 0;
    let afterCompressionTokens = 0;

    // 【优化】提高使用摘要的门槛，从8条改为12条，确保更多上下文被保留
    if (summaryToUse && conversationMessages.length > 12) {
      // 有摘要且消息较多时，使用摘要 + 最近消息
      const coveredCount = summaryToUse.covered_messages * 2; // 转换为消息数（一问一答=2条）
      const recentMessages = conversationMessages.slice(coveredCount);

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

      // 添加最近的消息，将摘要上下文附加到第一条消息前
      if (recentMessages.length > 0) {
        // 第一条消息：附加摘要上下文
        const firstMessage = recentMessages[0];
        apiMessages.push({
          role: firstMessage.role,
          content: summaryContext + '\n' + ((firstMessage.content || firstMessage.text) || '')
        });

        // 其余消息：正常添加
        apiMessages.push(...recentMessages.slice(1).map(m => ({
          role: m.role,
          content: (m.content || m.text) || ''
        })));
      }

      contextType = '摘要+最近消息';
      compressionInfo = {
        before_tokens: beforeCompressionTokens,
        after_tokens: afterCompressionTokens,
        saved_tokens: beforeCompressionTokens - afterCompressionTokens,
        compression_ratio: ((1 - afterCompressionTokens / beforeCompressionTokens) * 100).toFixed(1)
      };

      console.log('[smartChatWithSearch] ===== SUMMARY MODE =====');
      console.log('[smartChatWithSearch] Using summary + recent messages:', recentMessages.length);
      console.log('[smartChatWithSearch] Summary attached to first message, NO fake assistant message');
      console.log('[smartChatWithSearch] Compression:', beforeCompressionTokens, '→', afterCompressionTokens, 'tokens (saved:', compressionInfo.saved_tokens, ')');
      console.log('[smartChatWithSearch] ===========================');
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
    
    // 过滤掉空消息
    apiMessages = apiMessages.filter(m => m.content && m.content.trim().length > 0);
    
    // 计算token估算
    const totalTokens = apiMessages.reduce((sum, m) => sum + estimateTokens(m.content || ''), 0) + 
                        (system_prompt ? estimateTokens(system_prompt) : 0);
    
    console.log('[smartChatWithSearch] Calling AI model with', apiMessages.length, 'messages, estimated', totalTokens, 'tokens');
    console.log('[smartChatWithSearch] Message details:');
    apiMessages.forEach((m, i) => {
      const tokens = estimateTokens(m.content || '');
      const preview = (m.content || '').slice(0, 50);
      console.log(`  [${i}] role=${m.role}, tokens=${tokens}, preview=${preview}...`);
    });
    
    // 系统提示词只在新对话的第一轮时使用（消息列表为空）
    // 如果有历史消息，说明不是第一轮，绝对不能使用 system_prompt
    // CRITICAL: 只有当 system_prompt 有实际内容时才使用
    const isFirstTurn = conversationMessages.length === 0;
    const hasValidSystemPrompt = system_prompt && system_prompt.trim().length > 0;
    const shouldUseSystemPrompt = isFirstTurn && hasValidSystemPrompt;
    
    console.log('[smartChatWithSearch] ===== SYSTEM PROMPT DECISION =====');
    console.log('[smartChatWithSearch] isFirstTurn:', isFirstTurn, '(conversationMessages.length:', conversationMessages.length, ')');
    console.log('[smartChatWithSearch] conversation exists:', !!conversation);
    console.log('[smartChatWithSearch] system_prompt:', system_prompt ? `"${system_prompt.slice(0, 100)}..."` : 'null/undefined');
    console.log('[smartChatWithSearch] hasValidSystemPrompt:', hasValidSystemPrompt);
    console.log('[smartChatWithSearch] shouldUseSystemPrompt:', shouldUseSystemPrompt);
    
    if (shouldUseSystemPrompt) {
      console.log('[smartChatWithSearch] ✓ WILL USE system prompt, tokens:', estimateTokens(system_prompt));
    } else {
      console.log('[smartChatWithSearch] ✗ WILL NOT USE system prompt');
      if (system_prompt) {
        console.log('[smartChatWithSearch]   Reason: isFirstTurn=', isFirstTurn, 'conversation=', !!conversation);
      }
    }
    console.log('[smartChatWithSearch] ========================================');
    
    // 调用 AI 模型 - 启用联网搜索
    console.log('[smartChatWithSearch] === ABOUT TO CALL callAIModel ===');
    console.log('[smartChatWithSearch] Parameters:');
    console.log('[smartChatWithSearch]   - model_id:', selectedModel.id);
    console.log('[smartChatWithSearch]   - messages count:', apiMessages.length);
    console.log('[smartChatWithSearch]   - system_prompt:', shouldUseSystemPrompt ? `YES (${system_prompt.length} chars, ~${Math.ceil(system_prompt.length / 4)} tokens)` : 'NO');
    console.log('[smartChatWithSearch]   - force_web_search:', decision.will_use_web_search || false);
    if (shouldUseSystemPrompt && system_prompt) {
      console.log('[smartChatWithSearch]   - system_prompt preview:', system_prompt.slice(0, 200) + '...');
    }
    console.log('[smartChatWithSearch] === END PARAMETERS ===');
    
    // 构建调用参数，只在需要时添加 system_prompt
    const callParams = {
      model_id: selectedModel.id,
      messages: apiMessages,
      force_web_search: decision.will_use_web_search || false
    };
    
    if (shouldUseSystemPrompt && system_prompt) {
      callParams.system_prompt = system_prompt;
    }
    
    const modelRes = await base44.functions.invoke('callAIModel', callParams);
    
    if (!modelRes.data || modelRes.data.error) {
      throw new Error(modelRes.data?.error || 'AI model call failed');
    }
    
    const modelData = modelRes.data;
    console.log('[smartChatWithSearch] AI response received, web_search_used:', modelData.web_search_enabled);
    
    // ========== 新的双轨制结算逻辑 ==========
    const inputTokens = modelData.input_tokens || 0;
    const outputTokens = modelData.output_tokens || 0;
    const inputCredits = modelData.input_credits || 0;
    const outputCredits = modelData.output_credits || 0;
    const webSearchUsed = modelData.web_search_enabled || false;
    
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
    
    console.log('[smartChatWithSearch] ===== 结算开始 =====');
    console.log('[smartChatWithSearch] 当前余额:', currentBalance, '积分');
    console.log('[smartChatWithSearch] 待结算余额:', currentPending, '积分');
    console.log('[smartChatWithSearch] Token消耗:', tokenCredits.toFixed(4), '积分');
    console.log('[smartChatWithSearch] 联网搜索:', webSearchUsed ? 'YES (5积分)' : 'NO');
    
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
      console.log('[smartChatWithSearch] → 扣除联网搜索费:', WEB_SEARCH_FEE, '积分，余额:', finalBalance);
    }
    
    // 步骤2：Token费用加入待结算
    finalPending += tokenCredits;
    console.log('[smartChatWithSearch] → Token费用加入待结算:', tokenCredits.toFixed(4), '积分');
    console.log('[smartChatWithSearch] → 待结算余额更新为:', finalPending.toFixed(4), '积分');
    
    // 步骤3：待结算余额>=1时扣除整数部分
    if (finalPending >= 1) {
      const toDeduct = Math.floor(finalPending);
      if (finalBalance < toDeduct) {
        throw new Error(`积分不足，需要${toDeduct}积分，您当前只有${finalBalance}积分`);
      }
      finalBalance -= toDeduct;
      finalPending -= toDeduct;
      tokenDeducted = toDeduct;
      console.log('[smartChatWithSearch] → 待结算≥1，扣除Token费:', toDeduct, '积分，余额:', finalBalance);
      console.log('[smartChatWithSearch] → 待结算余额更新为:', finalPending.toFixed(4), '积分');
    }
    
    actualDeducted = webSearchDeducted + tokenDeducted;
    
    console.log('[smartChatWithSearch] ===== 结算完成 =====');
    console.log('[smartChatWithSearch] 本次扣除: 功能费', webSearchDeducted, '+ Token费', tokenDeducted, '= 总计', actualDeducted, '积分');
    console.log('[smartChatWithSearch] 最终余额:', finalBalance, '积分');
    console.log('[smartChatWithSearch] 最终待结算:', finalPending.toFixed(4), '积分');
    console.log('[smartChatWithSearch] ========================');
    
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
      console.log('[smartChatWithSearch] Updating conversation');
      const updateData = {
        messages: newMessages,
        total_credits_used: (conversation.total_credits_used || 0) + actualDeducted,
        updated_date: new Date().toISOString()
      };
      
      // 如果需要更新 session_task_type
      if (shouldUpdateSessionTaskType && taskClassification) {
        updateData.session_task_type = taskClassification.task_type;
        console.log('[smartChatWithSearch] Updating session_task_type to:', taskClassification.task_type);
      }
      
      await base44.asServiceRole.entities.Conversation.update(conversation.id, updateData);
    } else {
      console.log('[smartChatWithSearch] Creating new conversation');
      const createData = {
        title: message.slice(0, 50),
        model_id: selectedModel.id,
        messages: newMessages,
        total_credits_used: actualDeducted
      };
      
      // 如果是创作类任务，记录 session_task_type
      if (shouldUpdateSessionTaskType && taskClassification) {
        createData.session_task_type = taskClassification.task_type;
        console.log('[smartChatWithSearch] Setting initial session_task_type to:', taskClassification.task_type);
      }
      
      const newConv = await base44.asServiceRole.entities.Conversation.create(createData);
      finalConversationId = newConv.id;
    }
    
    // 步骤5：更新Token预算（使用最新的用户余额）
    try {
      await base44.functions.invoke('tokenBudgetManager', {
        conversation_id: finalConversationId,
        operation: 'consume',
        tokens: inputTokens + outputTokens
      });
    } catch (e) {
      console.log('[smartChatWithSearch] Budget update skipped:', e.message);
    }
    
    // 步骤6：检查是否需要触发压缩
    // 【优化】提高压缩触发门槛，从16条改为24条，保留更多原始上下文
    const messageCount = conversationMessages.length + 2; // +2 = 当前一问一答
    if (messageCount >= 24 && messageCount % 12 === 0) { // 每12条消息（6轮）检查一次
      console.log('[smartChatWithSearch] Triggering compression check for', messageCount / 2, 'rounds');
      try {
        // 异步触发压缩，不等待结果
        // 【优化】保留最近6轮（12条消息）而不是4轮
        base44.functions.invoke('compressConversation', {
          conversation_id: finalConversationId,
          messages_to_compress: messageCount - 12 // 保留最近6轮
        }).catch(err => console.log('[smartChatWithSearch] Compression failed:', err.message));
      } catch (e) {
        console.log('[smartChatWithSearch] Compression trigger skipped:', e.message);
      }
    }
    
    console.log('[smartChatWithSearch] Request completed successfully');
    
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
    console.error('[smartChatWithSearch] Error:', error);
    console.error('[smartChatWithSearch] Stack:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      time_ms: Date.now() - startTime
    }, { status: 500 });
  }
});