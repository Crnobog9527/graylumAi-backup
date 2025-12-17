import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { model_id, messages, system_prompt, force_web_search, image_files } = await req.json();

      // 硬编码身份信息
      const identityInfo = `\n\n【重要：模型身份信息】\n当用户询问你的模型版本、型号、具体是什么模型等相关问题时，请统一回答：\n我是 Claude Sonnet 4.5，具体模型版本号是 claude-sonnet-4-5-20250929，发布于2025年9月29日。`;

      // 将身份信息附加到system_prompt
      const enhancedSystemPrompt = system_prompt ? `${system_prompt}${identityInfo}` : identityInfo.trim();

      console.log('[callAIModel] ===== RECEIVED REQUEST =====');
    console.log('[callAIModel] - model_id:', model_id);
    console.log('[callAIModel] - messages count:', messages?.length);
    console.log('[callAIModel] - enhanced_system_prompt:', enhancedSystemPrompt === undefined ? 'undefined' : enhancedSystemPrompt === null ? 'null' : `"${enhancedSystemPrompt.slice(0, 100)}..."`);
    console.log('[callAIModel] - system_prompt type:', typeof enhancedSystemPrompt);
    console.log('[callAIModel] - system_prompt provided:', !!enhancedSystemPrompt);
    if (enhancedSystemPrompt) {
      console.log('[callAIModel] - system_prompt length:', enhancedSystemPrompt.length, 'chars, ~', Math.ceil(enhancedSystemPrompt.length / 4), 'tokens');
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

    // 构建带缓存标记的消息（用于 OpenRouter Anthropic）
    const buildCachedMessagesForOpenRouter = (msgs, sysPrompt) => {
      const result = [];
      const cacheableBlocks = [];
      
      // 分析系统提示词
      const sysTokens = estimateTokens(sysPrompt);
      if (sysPrompt && shouldEnableCache(sysPrompt, sysTokens)) {
        cacheableBlocks.push({ type: 'system', tokens: sysTokens });
      }
      
      // 分析消息中可缓存的内容（只分析较早的消息，最新的用户消息不缓存）
      msgs.slice(0, -1).forEach((m, idx) => {
        const tokens = estimateTokens(m.content);
        if (shouldEnableCache(m.content, tokens)) {
          cacheableBlocks.push({ type: 'message', index: idx, tokens, role: m.role });
        }
      });
      
      // 按token数排序，选择最大的几个进行缓存
      cacheableBlocks.sort((a, b) => b.tokens - a.tokens);
      const blocksToCache = cacheableBlocks.slice(0, MAX_CACHE_BREAKPOINTS);
      const cacheIndices = new Set(blocksToCache.filter(b => b.type === 'message').map(b => b.index));
      const cacheSystem = blocksToCache.some(b => b.type === 'system');
      
      // 构建系统消息
      if (sysPrompt) {
        if (cacheSystem) {
          result.push({
            role: 'system',
            content: [{ type: 'text', text: sysPrompt, cache_control: { type: 'ephemeral' } }]
          });
        } else {
          result.push({ role: 'system', content: sysPrompt });
        }
      }
      
      // 构建对话消息
      msgs.forEach((m, idx) => {
        if (cacheIndices.has(idx)) {
          result.push({
            role: m.role,
            content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }]
          });
        } else {
          result.push({ role: m.role, content: m.content });
        }
      });
      
      return {
        messages: result,
        cacheEnabled: blocksToCache.length > 0,
        cachedBlocksCount: blocksToCache.length
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
    
    // 执行截断（使用增强的system prompt）
    const { truncatedMsgs: processedMessages, totalTokens } = truncateMessages(messages, enhancedSystemPrompt, inputLimit);

    // 估算输入tokens（使用增强的system prompt）
    const estimatedInputTokens = calculateTotalTokens(processedMessages, enhancedSystemPrompt);
    
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

      const finalPrompt = enhancedSystemPrompt 
        ? `${enhancedSystemPrompt}\n\n${fullPrompt}\n\n请根据上述对话历史，回复用户最后的消息。`
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

    // CRITICAL: 只有当 enhancedSystemPrompt 有实际内容时才添加
    const hasValidSystemPrompt = enhancedSystemPrompt && enhancedSystemPrompt.trim().length > 0;
    console.log('[callAIModel] hasValidSystemPrompt:', hasValidSystemPrompt);

    if (hasValidSystemPrompt && !useOpenAIFormat && provider !== 'anthropic') {
      console.log('[callAIModel] ✓ Adding system prompt to messages, length:', enhancedSystemPrompt.length);
      formattedMessages.unshift({ role: 'system', content: enhancedSystemPrompt });
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
        // 构建带缓存标记的消息（使用增强的system prompt）
        const { messages: cachedMessages, cacheEnabled, cachedBlocksCount } = 
          buildCachedMessagesForOpenRouter(processedMessages, enhancedSystemPrompt);

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

      const requestBody = {
        model: model.model_id,
        max_tokens: model.max_tokens || 4096,
        messages: anthropicMessages
      };

      // 只在有有效 system_prompt 时才添加
      if (system_prompt && system_prompt.trim().length > 0) {
      requestBody.system = system_prompt;
      }

      console.log('[callAIModel] ========== ANTHROPIC API REQUEST (Official) ==========');
      console.log('[callAIModel] Model ID:', model.model_id);
      console.log('[callAIModel] System prompt included:', !!requestBody.system);

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

      // Anthropic返回usage
      if (data.usage) {
        actualInputTokens = data.usage.input_tokens || estimatedInputTokens;
        actualOutputTokens = data.usage.output_tokens || estimateTokens(responseText);
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
        usage: data.usage || null,
        web_search_enabled: false
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

      if (enhancedSystemPrompt) {
        requestBody.systemInstruction = { parts: [{ text: enhancedSystemPrompt }] };
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