import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { model_id, messages, system_prompt } = await req.json();

    // Token 估算函数 (字符数 / 4)
    const estimateTokens = (text) => Math.ceil((text || '').length / 4);

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

    // 获取积分设置（默认：input 1积分/1K tokens, output 5积分/1K tokens）
    let inputCreditsPerK = 1;
    let outputCreditsPerK = 5;
    
    try {
      const settings = await base44.asServiceRole.entities.SystemSettings.filter({});
      const inputSetting = settings.find(s => s.setting_key === 'input_credits_per_1k');
      const outputSetting = settings.find(s => s.setting_key === 'output_credits_per_1k');
      if (inputSetting) inputCreditsPerK = parseFloat(inputSetting.setting_value) || 1;
      if (outputSetting) outputCreditsPerK = parseFloat(outputSetting.setting_value) || 5;
    } catch (e) {
      // 使用默认值
    }

    // 获取模型配置
    const models = await base44.asServiceRole.entities.AIModel.filter({ id: model_id });
    const model = models[0];

    if (!model) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    // 使用模型配置的 input_limit
    const inputLimit = model.input_limit || 180000;
    const { truncatedMsgs: processedMessages, totalTokens: estimatedInputTokens } = truncateMessages(messages, system_prompt, inputLimit);

    // 计算可用积分（月度积分优先使用）
    const currentCredits = (user.credits || 0);
    const monthlyCredits = (user.monthly_credits || 0);
    const totalAvailableCredits = currentCredits + monthlyCredits;

    // 预估最小积分消耗（用于检查）
    const estimatedMinCredits = Math.ceil(estimatedInputTokens / 1000) * inputCreditsPerK + outputCreditsPerK;
    
    if (totalAvailableCredits < estimatedMinCredits) {
      return Response.json({ 
        error: '积分不足，请充值后继续使用',
        credits_available: totalAvailableCredits,
        credits_needed: estimatedMinCredits
      }, { status: 402 });
    }

    let responseText;
    let actualInputTokens = estimatedInputTokens;
    let actualOutputTokens = 0;

    // 如果使用内置集成（支持联网）
    if (model.provider === 'builtin' || model.enable_web_search) {
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

      responseText = result;
      actualOutputTokens = estimateTokens(responseText);
      
    } else {
      if (!model.api_key) {
        return Response.json({ error: 'API key not configured for this model' }, { status: 400 });
      }

      const provider = model.provider;
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

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          body: JSON.stringify({
            model: model.model_id,
            messages: formattedMessages,
            max_tokens: model.max_tokens || 4096
          })
        });

        if (!res.ok) {
          const error = await res.text();
          return Response.json({ error: `API error: ${error}` }, { status: res.status });
        }

        const data = await res.json();
        responseText = data.choices[0].message.content;
        
        // 使用API返回的真实token数
        if (data.usage) {
          actualInputTokens = data.usage.prompt_tokens || actualInputTokens;
          actualOutputTokens = data.usage.completion_tokens || estimateTokens(responseText);
        } else {
          actualOutputTokens = estimateTokens(responseText);
        }

      } else if (provider === 'anthropic') {
        const endpoint = model.api_endpoint || 'https://api.anthropic.com/v1/messages';
        const isOfficialApi = !model.api_endpoint || model.api_endpoint.includes('anthropic.com');

        const anthropicMessages = formattedMessages.filter(m => m.role !== 'system');

        const headers = { 'Content-Type': 'application/json' };
        
        if (isOfficialApi) {
          headers['x-api-key'] = model.api_key;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${model.api_key}`;
        }

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
        
        // Anthropic 返回 usage
        if (data.usage) {
          actualInputTokens = data.usage.input_tokens || actualInputTokens;
          actualOutputTokens = data.usage.output_tokens || estimateTokens(responseText);
        } else {
          actualOutputTokens = estimateTokens(responseText);
        }

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
          generationConfig: { maxOutputTokens: model.max_tokens || 4096 }
        };

        if (system_prompt) {
          requestBody.systemInstruction = { parts: [{ text: system_prompt }] };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const error = await res.text();
          return Response.json({ error: `API error: ${error}` }, { status: res.status });
        }

        const data = await res.json();
        responseText = data.candidates[0].content.parts[0].text;
        
        // Google 返回 usageMetadata
        if (data.usageMetadata) {
          actualInputTokens = data.usageMetadata.promptTokenCount || actualInputTokens;
          actualOutputTokens = data.usageMetadata.candidatesTokenCount || estimateTokens(responseText);
        } else {
          actualOutputTokens = estimateTokens(responseText);
        }

      } else {
        return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
      }
    }

    // 计算实际积分消耗
    // Input: inputCreditsPerK 积分/1K tokens, Output: outputCreditsPerK 积分/1K tokens
    const inputCredits = Math.ceil(actualInputTokens / 1000) * inputCreditsPerK;
    const outputCredits = Math.ceil(actualOutputTokens / 1000) * outputCreditsPerK;
    const totalCreditsUsed = inputCredits + outputCredits;

    // 扣除积分（先扣月度积分，再扣购买积分）
    let remainingToDeduct = totalCreditsUsed;
    let newMonthlyCredits = monthlyCredits;
    let newCredits = currentCredits;

    if (monthlyCredits > 0) {
      if (monthlyCredits >= remainingToDeduct) {
        newMonthlyCredits = monthlyCredits - remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        remainingToDeduct -= monthlyCredits;
        newMonthlyCredits = 0;
      }
    }
    
    if (remainingToDeduct > 0) {
      newCredits = Math.max(0, currentCredits - remainingToDeduct);
    }

    // 更新用户积分和统计
    await base44.asServiceRole.entities.User.update(user.id, {
      credits: newCredits,
      monthly_credits: newMonthlyCredits,
      total_credits_used: (user.total_credits_used || 0) + totalCreditsUsed,
      total_input_tokens: (user.total_input_tokens || 0) + actualInputTokens,
      total_output_tokens: (user.total_output_tokens || 0) + actualOutputTokens,
      last_active: new Date().toISOString()
    });

    // 记录交易
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_email: user.email,
      type: 'usage',
      amount: -totalCreditsUsed,
      balance_after: newCredits + newMonthlyCredits,
      description: `对话消耗 - ${model.name} (Input: ${actualInputTokens} tokens = ${inputCredits}积分, Output: ${actualOutputTokens} tokens = ${outputCredits}积分)`,
      model_used: model.name,
      reference_id: model.id
    });

    // 更新模型使用统计
    const today = new Date().toISOString().split('T')[0];
    try {
      const existingStats = await base44.asServiceRole.entities.ModelUsageStats.filter({
        model_id: model.id,
        date: today
      });

      if (existingStats.length > 0) {
        const stat = existingStats[0];
        await base44.asServiceRole.entities.ModelUsageStats.update(stat.id, {
          input_tokens: (stat.input_tokens || 0) + actualInputTokens,
          output_tokens: (stat.output_tokens || 0) + actualOutputTokens,
          total_requests: (stat.total_requests || 0) + 1,
          credits_earned: (stat.credits_earned || 0) + totalCreditsUsed
        });
      } else {
        await base44.asServiceRole.entities.ModelUsageStats.create({
          model_id: model.id,
          model_name: model.name,
          input_tokens: actualInputTokens,
          output_tokens: actualOutputTokens,
          total_requests: 1,
          credits_earned: totalCreditsUsed,
          date: today
        });
      }
    } catch (e) {
      // 统计更新失败不影响主流程
    }

    return Response.json({
      response: responseText,
      credits_used: totalCreditsUsed,
      input_tokens: actualInputTokens,
      output_tokens: actualOutputTokens,
      input_credits: inputCredits,
      output_credits: outputCredits,
      balance: newCredits + newMonthlyCredits
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});