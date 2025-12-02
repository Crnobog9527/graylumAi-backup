import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { model_id, messages, system_prompt } = await req.json();

    // 获取模型配置
    const models = await base44.asServiceRole.entities.AIModel.filter({ id: model_id });
    const model = models[0];

    if (!model) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    // 如果使用内置集成（支持联网）
    if (model.provider === 'builtin' || model.enable_web_search) {
      // 构建完整的提示
      const fullPrompt = messages.map(m => {
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

      return Response.json({
        response: result,
        credits_used: model.credits_per_message || 1,
        web_search_enabled: model.enable_web_search || false
      });
    }

    if (!model.api_key) {
      return Response.json({ error: 'API key not configured for this model' }, { status: 400 });
    }

    const provider = model.provider;
    let responseText;

    // 构建消息列表
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // 如果配置了自定义端点且包含 /chat/completions，使用 OpenAI 兼容格式
    const useOpenAIFormat = model.api_endpoint && model.api_endpoint.includes('/chat/completions');

    if (system_prompt) {
      formattedMessages.unshift({ role: 'system', content: system_prompt });
    }

    if (useOpenAIFormat || provider === 'openai' || provider === 'custom') {
      // OpenAI 或兼容 OpenAI 格式的 API
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
      
      // 返回 OpenAI 兼容格式的调试信息
      return Response.json({
        response: responseText,
        credits_used: model.credits_per_message || 1,
        model: data.model || null,
        usage: data.usage || null,
        rawResponse: data // 调试用，可查看完整响应结构
      });

    } else if (provider === 'anthropic') {
      // Anthropic Claude API
      const endpoint = model.api_endpoint || 'https://api.anthropic.com/v1/messages';
      const isOfficialApi = !model.api_endpoint || model.api_endpoint.includes('anthropic.com');

      // Anthropic 需要单独处理 system prompt
      const anthropicMessages = formattedMessages.filter(m => m.role !== 'system');

      // 根据是否使用官方 API 或代理来设置不同的请求头
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (isOfficialApi) {
        // 官方 Anthropic API 使用 x-api-key
        headers['x-api-key'] = model.api_key;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        // 第三方代理通常使用 Bearer token
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

    } else if (provider === 'google') {
      // Google Gemini API
      const endpoint = model.api_endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${model.model_id}:generateContent?key=${model.api_key}`;

      // 转换消息格式为 Gemini 格式
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
      
      // 返回 Google Gemini 的 modelVersion
      return Response.json({
        response: responseText,
        credits_used: model.credits_per_message || 1,
        modelVersion: data.modelVersion || null,
        rawResponse: data // 调试用，可查看完整响应结构
      });

    } else {
      return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    return Response.json({
      response: responseText,
      credits_used: model.credits_per_message || 1
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});