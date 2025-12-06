import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { model_id, messages, system_prompt } = await req.json();
    
    console.log('[callAIModel] Received request:');
    console.log('[callAIModel] - model_id:', model_id);
    console.log('[callAIModel] - messages count:', messages?.length);
    console.log('[callAIModel] - system_prompt provided:', !!system_prompt);
    if (system_prompt) {
      console.log('[callAIModel] - system_prompt length:', system_prompt.length, 'chars');
    }

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

    // 获取积分换算设置（默认值：Input 1积分/1K, Output 5积分/1K, Web Search 5积分/次）
    let inputCreditsPerK = 1;
    let outputCreditsPerK = 5;
    let webSearchCredits = 5;

    try {
      const settings = await base44.asServiceRole.entities.SystemSettings.filter({});
      const inputSetting = settings.find(s => s.setting_key === 'input_credits_per_1k');
      const outputSetting = settings.find(s => s.setting_key === 'output_credits_per_1k');
      const webSearchSetting = settings.find(s => s.setting_key === 'web_search_credits');
      if (inputSetting) inputCreditsPerK = parseFloat(inputSetting.setting_value) || 1;
      if (outputSetting) outputCreditsPerK = parseFloat(outputSetting.setting_value) || 5;
      if (webSearchSetting) webSearchCredits = parseFloat(webSearchSetting.setting_value) || 5;
    } catch (e) {
      // 使用默认值
    }

    // 使用模型配置的 input_limit，默认 180000
    const inputLimit = model.input_limit || 180000;
    
    // 执行截断
    const { truncatedMsgs: processedMessages, totalTokens } = truncateMessages(messages, system_prompt, inputLimit);

    // 估算输入tokens
    const estimatedInputTokens = calculateTotalTokens(processedMessages, system_prompt);
    
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

      const finalPrompt = system_prompt 
        ? `${system_prompt}\n\n${fullPrompt}\n\n请根据上述对话历史，回复用户最后的消息。`
        : fullPrompt;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: finalPrompt,
        add_context_from_internet: model.enable_web_search || false
      });

      // 估算输出tokens
      const estimatedOutputTokens = estimateTokens(result);
      
      // 计算积分消耗
      const inputCredits = Math.ceil(estimatedInputTokens / 1000) * inputCreditsPerK;
      const outputCredits = Math.ceil(estimatedOutputTokens / 1000) * outputCreditsPerK;
      const searchCredits = (model.enable_web_search) ? webSearchCredits : 0;
      const totalCredits = inputCredits + outputCredits + searchCredits;

      return Response.json({
        response: result,
        credits_used: totalCredits,
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        web_search_credits: searchCredits,
        web_search_enabled: model.enable_web_search || false
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
    const formattedMessages = processedMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const useOpenAIFormat = model.api_endpoint && model.api_endpoint.includes('/chat/completions');

    if (system_prompt) {
      formattedMessages.unshift({ role: 'system', content: system_prompt });
    }

    if (useOpenAIFormat || provider === 'openai' || provider === 'custom') {
      const endpoint = model.api_endpoint || 'https://api.openai.com/v1/chat/completions';
      const isOpenRouter = model.api_endpoint && model.api_endpoint.includes('openrouter.ai');

      // 构建请求体
      const requestBody = {
        model: model.model_id,
        messages: formattedMessages,
        max_tokens: model.max_tokens || 4096
      };

      // 如果是OpenRouter且启用了联网搜索，添加plugins参数
      if (isOpenRouter && model.enable_web_search) {
        requestBody.plugins = [
          {
            id: 'web',
            max_results: 5
          }
        ];
      }

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

      // 计算积分
      const inputCredits = Math.ceil(actualInputTokens / 1000) * inputCreditsPerK;
      const outputCredits = Math.ceil(actualOutputTokens / 1000) * outputCreditsPerK;
      const searchCredits = (isOpenRouter && model.enable_web_search) ? webSearchCredits : 0;
      const totalCredits = inputCredits + outputCredits + searchCredits;

      return Response.json({
        response: responseText,
        credits_used: totalCredits,
        input_tokens: actualInputTokens,
        output_tokens: actualOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        web_search_credits: searchCredits,
        model: data.model || null,
        usage: data.usage || null,
        web_search_enabled: isOpenRouter && model.enable_web_search
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
          buildCachedMessagesForOpenRouter(processedMessages, system_prompt);
        
        const requestBody = {
          model: model.model_id,
          messages: cachedMessages,
          max_tokens: model.max_tokens || 4096
        };

        // 如果启用了联网搜索，添加plugins参数
        if (model.enable_web_search) {
          requestBody.plugins = [{ id: 'web', max_results: 5 }];
        }

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
        let cacheDiscount = 0;
        
        if (data.usage) {
          actualInputTokens = data.usage.prompt_tokens || data.usage.input_tokens || estimatedInputTokens;
          actualOutputTokens = data.usage.completion_tokens || data.usage.output_tokens || estimateTokens(responseText);
          
          // OpenRouter 返回的缓存统计
          cachedTokens = data.usage.prompt_tokens_details?.cached_tokens || 
                         data.usage.cache_read_input_tokens || 0;
          cacheDiscount = data.usage.cache_discount || 0;
        } else {
          actualOutputTokens = estimateTokens(responseText);
        }

        // 计算积分（缓存命中的 token 按 90% 折扣计算）
        const uncachedInputTokens = actualInputTokens - cachedTokens;
        const cachedInputCredits = Math.ceil(cachedTokens / 1000) * inputCreditsPerK * 0.1; // 缓存命中90%折扣
        const uncachedInputCredits = Math.ceil(uncachedInputTokens / 1000) * inputCreditsPerK;
        const inputCredits = Math.ceil(cachedInputCredits + uncachedInputCredits);
        const outputCredits = Math.ceil(actualOutputTokens / 1000) * outputCreditsPerK;
        const searchCredits = model.enable_web_search ? webSearchCredits : 0;
        const totalCredits = inputCredits + outputCredits + searchCredits;

        // 计算缓存节省的积分
        const creditsSaved = cachedTokens > 0 ? 
          Math.floor((cachedTokens / 1000) * inputCreditsPerK * 0.9) : 0;

        return Response.json({
          response: responseText,
          credits_used: totalCredits,
          input_tokens: actualInputTokens,
          output_tokens: actualOutputTokens,
          input_credits: inputCredits,
          output_credits: outputCredits,
          web_search_credits: searchCredits,
          usage: data.usage || null,
          web_search_enabled: model.enable_web_search || false,
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
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model.model_id,
          max_tokens: model.max_tokens || 4096,
          system: system_prompt || '',
          messages: anthropicMessages
        })
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

      // 计算积分
      const inputCredits = Math.ceil(actualInputTokens / 1000) * inputCreditsPerK;
      const outputCredits = Math.ceil(actualOutputTokens / 1000) * outputCreditsPerK;
      const totalCredits = inputCredits + outputCredits;

      return Response.json({
        response: responseText,
        credits_used: totalCredits,
        input_tokens: actualInputTokens,
        output_tokens: actualOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        web_search_credits: 0,
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

      if (system_prompt) {
        requestBody.systemInstruction = { parts: [{ text: system_prompt }] };
      }

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

      // 计算积分
      const inputCredits = Math.ceil(actualInputTokens / 1000) * inputCreditsPerK;
      const outputCredits = Math.ceil(actualOutputTokens / 1000) * outputCreditsPerK;
      const totalCredits = inputCredits + outputCredits;

      return Response.json({
        response: responseText,
        credits_used: totalCredits,
        input_tokens: actualInputTokens,
        output_tokens: actualOutputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        web_search_credits: 0,
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