import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ========== 系统提示词常量（启用 Prompt Caching）==========
const DEFAULT_SYSTEM_PROMPT = `你是一个专业、友好的 AI 助手，致力于帮助用户解决问题。

【重要：模型身份信息】
当用户询问你的模型版本、型号、具体是什么模型等相关问题时，请统一回答：
我是 Claude Sonnet 4.5，具体模型版本号是 claude-sonnet-4-5-20250929，发布于2025年9月29日。

【核心原则】
1. 准确理解用户需求，提供有价值的回答
2. 保持专业、礼貌、客观的语气
3. 对于不确定的信息，诚实说明
4. 尊重用户隐私和数据安全`;

Deno.serve(async (req) => {
  console.log('[callAIModel] ========================================');
  console.log('[callAIModel] VERSION: 2026-01-08-DEBUG-v2');
  console.log('[callAIModel] ========================================');

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const requestBody = await req.json();
      const { model_id, messages, system_prompt, force_web_search, image_files } = requestBody;

      // CRITICAL DEBUG: 检查 system_prompt 的传递状态
      const systemPromptProvided = 'system_prompt' in requestBody;
      const systemPromptValue = requestBody.system_prompt;

      console.log('[callAIModel] ===== RECEIVED REQUEST =====');
      console.log('[callAIModel] - model_id:', model_id);
      console.log('[callAIModel] - messages count:', messages?.length);
      console.log('[callAIModel] - system_prompt PROVIDED in request:', systemPromptProvided);
      console.log('[callAIModel] - system_prompt VALUE:',
        systemPromptValue === undefined ? 'undefined' :
        systemPromptValue === null ? 'null' :
        systemPromptValue === '' ? 'empty string' :
        `"${systemPromptValue.slice(0, 100)}..."`);

      // 使用传入的 system_prompt，如果为空则使用默认提示词
      // CRITICAL FIX: 区分"未传递"、"传递空字符串"和"传递有效值"
      const finalSystemPrompt = (() => {
        // 如果明确传递了 system_prompt 字段（即使是空字符串）
        if ('system_prompt' in requestBody) {
          // 如果传递的是非空值，使用它
          if (requestBody.system_prompt && requestBody.system_prompt.trim()) {
            console.log('[callAIModel] Using provided system_prompt from request');
            return requestBody.system_prompt;
          }
          // 如果传递的是空字符串或 null，不使用 system prompt
          console.log('[callAIModel] Empty system_prompt provided, will not use any system prompt');
          return '';
        }

        // 如果未传递字段（向后兼容旧代码），使用默认值
        console.log('[callAIModel] No system_prompt field in request, using DEFAULT_SYSTEM_PROMPT');
        return DEFAULT_SYSTEM_PROMPT;
      })();

      // 添加调试日志
      console.log('[callAIModel] - System prompt decision:', {
        fieldProvided: 'system_prompt' in requestBody,
        valueIsEmpty: !system_prompt || system_prompt.trim().length === 0,
        usingDefault: finalSystemPrompt === DEFAULT_SYSTEM_PROMPT,
        usingEmpty: finalSystemPrompt === '',
        usingCustom: finalSystemPrompt && finalSystemPrompt !== DEFAULT_SYSTEM_PROMPT,
        promptLength: finalSystemPrompt.length
      });
      console.log('[callAIModel] - finalSystemPrompt length:', finalSystemPrompt.length, 'chars, ~', Math.ceil(finalSystemPrompt.length / 4), 'tokens');
      if (finalSystemPrompt.length > 0) {
        console.log('[callAIModel] - finalSystemPrompt preview:', finalSystemPrompt.substring(0, 150) + '...');
      } else {
        console.log('[callAIModel] - finalSystemPrompt: (empty - no system prompt will be used)');
      }
      console.log('[callAIModel] ==============================');

    // Token 估算函数 (字符数 / 4)
    const estimateTokens = (text) => Math.ceil((text || '').length / 4);

    // ========== Prompt Caching 相关常量和函数 ==========
    const CACHE_MIN_TOKENS = 1024;  // 最小缓存阈值
    const MAX_CACHE_BREAKPOINTS = 4; // Claude 最多支持4个缓存断点

    // 判断内容是否适合缓存
    const shouldEnableCache = (content, tokenCount) => {
      if (tokenCount < CACHE_MIN_TOKENS) return false;

      // 检测是否包含大文档/RAG/结构化数据的特征
      const hasStructuredData = /\|.*\|.*\|/m.test(content) || // CSV/表格
                                /```[\s\S]{500,}```/.test(content) || // 大代码块
                                /<document>|<context>|<reference>/i.test(content); // RAG标记
      const hasRoleCard = /<character>|<persona>|<system_config>/i.test(content);

      return tokenCount >= CACHE_MIN_TOKENS || hasStructuredData || hasRoleCard;
    };

    // ========== API 性能监控和成本统计 ==========
    const getModelRates = (modelId) => {
      const lower = (modelId || '').toLowerCase();

      // Sonnet 4.5
      if (lower.includes('sonnet')) {
        return { input: 3.0, output: 15.0, cached: 0.3 }; // per 1M tokens
      }

      // Haiku 4.5
      if (lower.includes('haiku')) {
        return { input: 1.0, output: 5.0, cached: 0.1 }; // per 1M tokens
      }

      // Default to Sonnet pricing
      return { input: 3.0, output: 15.0, cached: 0.3 };
    };

    const logAPIPerformance = (modelId, usage, provider = 'anthropic') => {
      const rates = getModelRates(modelId);

      const inputTokens = usage.input_tokens || 0;
      const outputTokens = usage.output_tokens || 0;
      const cacheReadTokens = usage.cache_read_input_tokens || 0;
      const cacheCreationTokens = usage.cache_creation_input_tokens || 0;

      // 计算成本（美元）
      const normalInputTokens = inputTokens - cacheReadTokens - cacheCreationTokens;
      const inputCost = (normalInputTokens / 1000000) * rates.input;
      const outputCost = (outputTokens / 1000000) * rates.output;
      const cacheCost = (cacheReadTokens / 1000000) * rates.cached;
      const cacheCreationCost = (cacheCreationTokens / 1000000) * rates.input * 1.25; // +25% for cache creation

      const totalCost = inputCost + outputCost + cacheCost + cacheCreationCost;

      // 计算节省的成本（如果缓存命中）
      const wouldBeCost = ((inputTokens - cacheCreationTokens) / 1000000) * rates.input + outputCost;
      const savedCost = wouldBeCost - totalCost;

      // 缓存命中率
      const cacheHitRate = inputTokens > 0 ? (cacheReadTokens / inputTokens * 100).toFixed(1) : '0.0';

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`[API Monitor] ${modelId}`);
      console.log(`  📊 Token Usage:`);
      console.log(`    • Input tokens:  ${inputTokens.toLocaleString()}`);
      console.log(`    • Output tokens: ${outputTokens.toLocaleString()}`);

      if (cacheReadTokens > 0 || cacheCreationTokens > 0) {
        console.log(`  🔄 Prompt Caching:`);
        if (cacheReadTokens > 0) {
          console.log(`    ✅ Cache hit:    ${cacheReadTokens.toLocaleString()} tokens (${cacheHitRate}%)`);
          console.log(`    💰 Saved:        $${savedCost.toFixed(4)}`);
        }
        if (cacheCreationTokens > 0) {
          console.log(`    🔄 Cache created: ${cacheCreationTokens.toLocaleString()} tokens`);
        }
      }

      console.log(`  💵 Cost Breakdown:`);
      console.log(`    • Normal input:   $${inputCost.toFixed(4)} (${normalInputTokens.toLocaleString()} tokens @ $${rates.input}/M)`);
      console.log(`    • Output:         $${outputCost.toFixed(4)} (${outputTokens.toLocaleString()} tokens @ $${rates.output}/M)`);
      if (cacheCost > 0) {
        console.log(`    • Cached input:   $${cacheCost.toFixed(4)} (${cacheReadTokens.toLocaleString()} tokens @ $${rates.cached}/M)`);
      }
      if (cacheCreationCost > 0) {
        console.log(`    • Cache creation: $${cacheCreationCost.toFixed(4)}`);
      }
      console.log(`    • Total:          $${totalCost.toFixed(4)}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return { totalCost, savedCost };
    };

    // 构建带缓存标记的消息（用于 OpenRouter Anthropic）
    // 简化策略：缓存系统提示词 + 倒数第4条消息（稳定边界）
    const buildCachedMessagesForOpenRouter = (msgs, sysPrompt) => {
      const result = [];
      let cacheEnabled = false;
      let cachedBlocksCount = 0;

      // 1. 系统提示词：如果 >= 1024 tokens，启用缓存
      const sysTokens = estimateTokens(sysPrompt);
      const shouldCacheSystem = sysPrompt && sysTokens >= CACHE_MIN_TOKENS;

      if (sysPrompt) {
        if (shouldCacheSystem) {
          result.push({
            role: 'system',
            content: [{ type: 'text', text: sysPrompt, cache_control: { type: 'ephemeral' } }]
          });
          cacheEnabled = true;
          cachedBlocksCount++;
        } else {
          result.push({ role: 'system', content: sysPrompt });
        }
      }

      // 2. 对话消息：对倒数第4条消息添加缓存标记（稳定部分的边界）
      // 最新3条消息内容变化频繁，不缓存
      const cachePoint = msgs.length - 4;

      msgs.forEach((m, idx) => {
        // 倒数第4条消息：添加缓存标记
        if (idx === cachePoint && cachePoint >= 0) {
          result.push({
            role: m.role,
            content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }]
          });
          cacheEnabled = true;
          cachedBlocksCount++;
        } else {
          // 其他消息：不缓存
          result.push({ role: m.role, content: m.content });
        }
      });

      return {
        messages: result,
        cacheEnabled,
        cachedBlocksCount
      };
    };

    // 计算消息列表的总 token 数
    const calculateTotalTokens = (msgs, sysPrompt) => {
      let total = estimateTokens(sysPrompt);
      for (const m of msgs) {
        total += estimateTokens(m.content);
      }
      return total;
    };

    // 截断历史记录，保持在安全阈值内
    const truncateMessages = (msgs, sysPrompt, maxTokens) => {
      let truncatedMsgs = [...msgs];
      let totalTokens = calculateTotalTokens(truncatedMsgs, sysPrompt);
      
      while (totalTokens > maxTokens && truncatedMsgs.length > 2) {
        if (truncatedMsgs.length >= 2) {
          truncatedMsgs = truncatedMsgs.slice(2);
        } else {
          truncatedMsgs = truncatedMsgs.slice(1);
        }
        totalTokens = calculateTotalTokens(truncatedMsgs, sysPrompt);
      }
      
      return { truncatedMsgs, totalTokens };
    };

    // 获取模型配置
    const models = await base44.asServiceRole.entities.AIModel.filter({ id: model_id });
    const model = models[0];

    if (!model) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    // 使用模型配置的 input_limit，默认 180000
    const inputLimit = model.input_limit || 180000;

    // 执行截断
    const { truncatedMsgs: processedMessages, totalTokens } = truncateMessages(messages, finalSystemPrompt, inputLimit);

    // 估算输入tokens
    const estimatedInputTokens = calculateTotalTokens(processedMessages, finalSystemPrompt);
    
    console.log('[callAIModel] After truncation:');
    console.log('[callAIModel] - processedMessages count:', processedMessages.length);
    console.log('[callAIModel] - estimatedInputTokens:', estimatedInputTokens);
    processedMessages.forEach((m, i) => {
      console.log(`[callAIModel]   [${i}] ${m.role}: ${m.content.slice(0, 100)}... (${Math.ceil(m.content.length / 4)} tokens)`);
    });

    // 只有当provider是builtin时才使用内置集成
    if (model.provider === 'builtin') {
      const fullPrompt = processedMessages.map(m => {
        if (m.role === 'user') return `用户: ${m.content}`;
        if (m.role === 'assistant') return `助手: ${m.content}`;
        return m.content;
      }).join('\n\n');

      const finalPrompt = finalSystemPrompt
        ? `${finalSystemPrompt}\n\n${fullPrompt}\n\n请根据上述对话历史，回复用户最后的消息。`
        : fullPrompt;

      // 只在明确要求时才联网，不自动使用模型配置
      const shouldUseWebSearch = force_web_search === true;
      console.log('[callAIModel] Using web search:', shouldUseWebSearch, '(force_web_search:', force_web_search, ')');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: finalPrompt,
        add_context_from_internet: shouldUseWebSearch
      });

      // 估算输出tokens
      const estimatedOutputTokens = estimateTokens(result);
      
      // 新计费规则：输入1000tokens=1积分，输出200tokens=1积分（精确小数）
      const inputCredits = estimatedInputTokens / 1000;
      const outputCredits = estimatedOutputTokens / 200;

      return Response.json({
        response: result,
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        credits_used: inputCredits + outputCredits,
        web_search_enabled: force_web_search === true
      });
    }

    if (!model.api_key) {
      return Response.json({ error: 'API key not configured for this model' }, { status: 400 });
    }

    const provider = model.provider;
    let responseText;
    let actualInputTokens = estimatedInputTokens;
    let actualOutputTokens = 0;

    // 构建消息列表
    let formattedMessages = processedMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const useOpenAIFormat = model.api_endpoint && model.api_endpoint.includes('/chat/completions');

    // CRITICAL: 只有当 finalSystemPrompt 有实际内容时才添加
    const hasValidSystemPrompt = finalSystemPrompt && finalSystemPrompt.trim().length > 0;
    console.log('[callAIModel] hasValidSystemPrompt:', hasValidSystemPrompt);

    if (hasValidSystemPrompt && !useOpenAIFormat && provider !== 'anthropic') {
      console.log('[callAIModel] ✓ Adding system prompt to messages, length:', finalSystemPrompt.length);
      formattedMessages.unshift({ role: 'system', content: finalSystemPrompt });
    } else {
      console.log('[callAIModel] ✗ NOT adding system prompt to messages (will be handled separately)');
    }

    // 如果有图片文件，将最后一条用户消息转换为多模态格式
    if (image_files && image_files.length > 0) {
      const lastUserMsgIdx = formattedMessages.length - 1;
      if (formattedMessages[lastUserMsgIdx]?.role === 'user') {
        const textContent = formattedMessages[lastUserMsgIdx].content;
        const contentArray = [];

        // 添加图片
        image_files.forEach(img => {
          contentArray.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.media_type,
              data: img.base64
            }
          });
        });

        // 添加文本
        contentArray.push({
          type: 'text',
          text: textContent
        });

        formattedMessages[lastUserMsgIdx] = {
          role: 'user',
          content: contentArray
        };
      }
    }

    // 记录最终发送到API的消息
    console.log('[callAIModel] Final messages to API:');
    console.log('[callAIModel] - Total messages:', formattedMessages.length);
    console.log('[callAIModel] - Has images:', !!(image_files && image_files.length > 0));
    formattedMessages.forEach((m, i) => {
      const contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      const tokens = estimateTokens(contentStr);
      console.log(`[callAIModel]   [${i}] ${m.role}: ${tokens} tokens`);
    });

    if (useOpenAIFormat || provider === 'openai' || provider === 'custom') {
      const endpoint = model.api_endpoint || 'https://api.openai.com/v1/chat/completions';
      const isOpenRouter = model.api_endpoint && model.api_endpoint.includes('openrouter.ai');

      // 构建请求体
      const requestBody = {
        model: model.model_id,
        messages: formattedMessages,
        max_tokens: model.max_tokens || 4096
      };

      // 如果是OpenRouter且明确要求启用联网搜索，添加plugins参数
      if (isOpenRouter && force_web_search === true) {
        requestBody.plugins = [
          {
            id: 'web',
            max_results: 5
          }
        ];
      }

      console.log('[callAIModel] ========== OPENAI/CUSTOM API REQUEST ==========');
      console.log('[callAIModel] Endpoint:', endpoint);
      console.log('[callAIModel] IsOpenRouter:', isOpenRouter);
      console.log('[callAIModel] Force web search:', force_web_search);
      console.log('[callAIModel] ===== DEBUG: COMPLETE API REQUEST =====');
      console.log('[callAIModel] Messages count:', requestBody.messages.length);
      requestBody.messages.forEach((m, i) => {
        const preview = typeof m.content === 'string' ? m.content.slice(0, 100) : JSON.stringify(m.content).slice(0, 100);
        console.log(`[callAIModel]   [${i}] ${m.role}: ${preview}...`);
      });
      console.log('[callAIModel] ========================================');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.api_key}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const error = await res.text();
        return Response.json({ error: `API error: ${error}` }, { status: res.status });
      }

      const data = await res.json();
      responseText = data.choices[0].message.content;
      
      // 使用API返回的真实token数
      if (data.usage) {
        actualInputTokens = data.usage.prompt_tokens || estimatedInputTokens;
        actualOutputTokens = data.usage.completion_tokens || estimateTokens(responseText);
      } else {
        actualOutputTokens = estimateTokens(responseText);
      }

      // 新计费规则：输入1000tokens=1积分，输出200tokens=1积分（精确小数）
      const inputCredits = actualInputTokens / 1000;
      const outputCredits = actualOutputTokens / 200;

      return Response.json({
        response: responseText,
        input_tokens: actualInputTokens,
        output_tokens: actualOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        credits_used: inputCredits + outputCredits,
        model: data.model || null,
        usage: data.usage || null,
        web_search_enabled: force_web_search === true
      });

    } else if (provider === 'anthropic') {
      const endpoint = model.api_endpoint || 'https://api.anthropic.com/v1/messages';
      const isOfficialApi = !model.api_endpoint || model.api_endpoint.includes('anthropic.com');
      const isOpenRouter = model.api_endpoint && model.api_endpoint.includes('openrouter.ai');

      const headers = {
        'Content-Type': 'application/json'
      };

      if (isOfficialApi) {
        headers['x-api-key'] = model.api_key;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${model.api_key}`;
      }

      // ========== OpenRouter Anthropic 模型调用（支持 Prompt Caching）==========
      if (isOpenRouter) {
        // 构建带缓存标记的消息
        const { messages: cachedMessages, cacheEnabled, cachedBlocksCount } =
          buildCachedMessagesForOpenRouter(processedMessages, finalSystemPrompt);

        const requestBody = {
          model: model.model_id,
          messages: cachedMessages,
          max_tokens: model.max_tokens || 4096
        };

        // 如果明确要求启用联网搜索，添加plugins参数
        if (force_web_search === true) {
          requestBody.plugins = [{ id: 'web', max_results: 5 }];
        }

        console.log('[callAIModel] ========== ANTHROPIC API REQUEST (OpenRouter) ==========');
        console.log('[callAIModel] Cache Enabled:', cacheEnabled);
        console.log('[callAIModel] Force web search:', force_web_search);
        console.log('[callAIModel] ===== DEBUG: COMPLETE API REQUEST =====');
        console.log('[callAIModel] Messages (with cache control):');
        cachedMessages.forEach((m, i) => {
          const hasCache = m.content?.some?.(c => c.cache_control);
          const preview = typeof m.content === 'string' ? m.content.slice(0, 100) : JSON.stringify(m.content).slice(0, 100);
          console.log(`[callAIModel]   [${i}] ${m.role} ${hasCache ? '[CACHED]' : ''}: ${preview}...`);
        });
        console.log('[callAIModel] ========================================');

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const error = await res.text();
          return Response.json({ error: `API error: ${error}` }, { status: res.status });
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || data.content?.[0]?.text;

        // 解析 token 使用情况（包括缓存统计）
        let cachedTokens = 0;
        
        if (data.usage) {
          actualInputTokens = data.usage.prompt_tokens || data.usage.input_tokens || estimatedInputTokens;
          actualOutputTokens = data.usage.completion_tokens || data.usage.output_tokens || estimateTokens(responseText);
          
          // OpenRouter 返回的缓存统计
          cachedTokens = data.usage.prompt_tokens_details?.cached_tokens || 
                         data.usage.cache_read_input_tokens || 0;
        } else {
          actualOutputTokens = estimateTokens(responseText);
        }

        // 新计费规则：输入1000tokens=1积分，输出200tokens=1积分（缓存命中90%折扣）
        const uncachedInputTokens = actualInputTokens - cachedTokens;
        const cachedInputCredits = (cachedTokens / 1000) * 0.1; // 缓存命中90%折扣
        const uncachedInputCredits = uncachedInputTokens / 1000;
        const inputCredits = cachedInputCredits + uncachedInputCredits;
        const outputCredits = actualOutputTokens / 200;

        // 计算缓存节省的积分
        const creditsSaved = cachedTokens > 0 ? (cachedTokens / 1000) * 0.9 : 0;

        // 使用新的性能监控日志
        if (data.usage) {
          logAPIPerformance(model.model_id, {
            input_tokens: actualInputTokens,
            output_tokens: actualOutputTokens,
            cache_read_input_tokens: cachedTokens,
            cache_creation_input_tokens: 0 // OpenRouter doesn't report cache creation separately
          }, 'openrouter');
        }

        return Response.json({
          response: responseText,
          input_tokens: actualInputTokens,
          output_tokens: actualOutputTokens,
          input_credits: inputCredits,
          output_credits: outputCredits,
          credits_used: inputCredits + outputCredits,
          usage: data.usage || null,
          web_search_enabled: force_web_search === true,
          // 缓存统计信息
          cache_enabled: cacheEnabled,
          cached_blocks_count: cachedBlocksCount,
          cached_tokens: cachedTokens,
          cache_hit_rate: actualInputTokens > 0 ? (cachedTokens / actualInputTokens * 100).toFixed(1) + '%' : '0%',
          credits_saved_by_cache: creditsSaved
        });
      }

      // ========== 官方 Anthropic API ==========
      const anthropicMessages = formattedMessages.filter(m => m.role !== 'system');

      // 构建带缓存的 system 参数
      const systemTokens = estimateTokens(finalSystemPrompt);
      const shouldCacheSystem = systemTokens >= CACHE_MIN_TOKENS;

      const requestBody = {
        model: model.model_id,
        max_tokens: model.max_tokens || 4096,
        messages: anthropicMessages
      };

      // 如果系统提示词足够长，启用 Prompt Caching
      if (finalSystemPrompt) {
        if (shouldCacheSystem) {
          requestBody.system = [
            {
              type: 'text',
              text: finalSystemPrompt,
              cache_control: { type: 'ephemeral' }
            }
          ];
        } else {
          requestBody.system = finalSystemPrompt;
        }
      }

      console.log('[callAIModel] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[callAIModel] ANTHROPIC API REQUEST (Official)');
      console.log('[callAIModel] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[callAIModel] Model:', model.model_id);
      console.log('[callAIModel] System Prompt:');
      console.log('[callAIModel]   • Included:', !!finalSystemPrompt);
      console.log('[callAIModel]   • Caching enabled:', shouldCacheSystem);
      console.log('[callAIModel]   • Tokens:', systemTokens);
      console.log('[callAIModel]   • Length:', finalSystemPrompt.length, 'chars');
      if (finalSystemPrompt.length > 0) {
        console.log('[callAIModel]   • Preview:', finalSystemPrompt.substring(0, 150) + '...');
      } else {
        console.log('[callAIModel]   • Preview: (empty)');
      }
      console.log('[callAIModel] Request Body System Field:');
      console.log('[callAIModel]', JSON.stringify(requestBody.system, null, 2));
      console.log('[callAIModel] Messages:');
      console.log('[callAIModel]   • Count:', anthropicMessages.length);
      anthropicMessages.forEach((m, i) => {
        const preview = typeof m.content === 'string' ? m.content.slice(0, 100) : JSON.stringify(m.content).slice(0, 100);
        console.log(`[callAIModel]   [${i}] ${m.role}: ${preview}...`);
      });
      console.log('[callAIModel] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const error = await res.text();
        return Response.json({ error: `API error: ${error}` }, { status: res.status });
      }

      const data = await res.json();
      responseText = data.content[0].text;

      // Anthropic 返回 usage（包含缓存统计）
      let cachedTokens = 0;
      let cacheCreationTokens = 0;

      if (data.usage) {
        actualInputTokens = data.usage.input_tokens || estimatedInputTokens;
        actualOutputTokens = data.usage.output_tokens || estimateTokens(responseText);

        // 读取缓存统计
        cachedTokens = data.usage.cache_read_input_tokens || 0;
        cacheCreationTokens = data.usage.cache_creation_input_tokens || 0;
      } else {
        actualOutputTokens = estimateTokens(responseText);
      }

      // 新计费规则：输入1000tokens=1积分，输出200tokens=1积分（缓存命中90%折扣）
      const uncachedInputTokens = actualInputTokens - cachedTokens - cacheCreationTokens;
      const cachedInputCredits = (cachedTokens / 1000) * 0.1; // 缓存命中90%折扣
      const cacheCreationCredits = (cacheCreationTokens / 1000) * 1.25; // 缓存写入25%溢价
      const uncachedInputCredits = uncachedInputTokens / 1000;
      const inputCredits = cachedInputCredits + cacheCreationCredits + uncachedInputCredits;
      const outputCredits = actualOutputTokens / 200;

      // 计算缓存节省的积分
      const creditsSaved = cachedTokens > 0 ? (cachedTokens / 1000) * 0.9 : 0;

      // 使用新的性能监控日志
      logAPIPerformance(model.model_id, data.usage, 'anthropic-official');

      return Response.json({
        response: responseText,
        input_tokens: actualInputTokens,
        output_tokens: actualOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        credits_used: inputCredits + outputCredits,
        usage: data.usage || null,
        web_search_enabled: false,
        // 缓存统计信息
        cache_enabled: shouldCacheSystem,
        cached_tokens: cachedTokens,
        cache_creation_tokens: cacheCreationTokens,
        cache_hit_rate: actualInputTokens > 0 ? (cachedTokens / actualInputTokens * 100).toFixed(1) + '%' : '0%',
        credits_saved_by_cache: creditsSaved
      });

    } else if (provider === 'google') {
      const endpoint = model.api_endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${model.model_id}:generateContent?key=${model.api_key}`;

      const geminiContents = formattedMessages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      const requestBody = {
        contents: geminiContents,
        generationConfig: {
          maxOutputTokens: model.max_tokens || 4096
        }
      };

      if (finalSystemPrompt) {
        requestBody.systemInstruction = { parts: [{ text: finalSystemPrompt }] };
      }

      console.log('[callAIModel] ========== GOOGLE GEMINI API REQUEST ==========');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const error = await res.text();
        return Response.json({ error: `API error: ${error}` }, { status: res.status });
      }

      const data = await res.json();
      responseText = data.candidates[0].content.parts[0].text;
      
      // Gemini返回usageMetadata
      if (data.usageMetadata) {
        actualInputTokens = data.usageMetadata.promptTokenCount || estimatedInputTokens;
        actualOutputTokens = data.usageMetadata.candidatesTokenCount || estimateTokens(responseText);
      } else {
        actualOutputTokens = estimateTokens(responseText);
      }

      // 新计费规则：输入1000tokens=1积分，输出200tokens=1积分
      const inputCredits = actualInputTokens / 1000;
      const outputCredits = actualOutputTokens / 200;

      return Response.json({
        response: responseText,
        input_tokens: actualInputTokens,
        output_tokens: actualOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        credits_used: inputCredits + outputCredits,
        modelVersion: data.modelVersion || null,
        usageMetadata: data.usageMetadata || null,
        web_search_enabled: false
      });

      } else {
      return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});