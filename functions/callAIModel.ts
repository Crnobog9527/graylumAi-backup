import { base44 } from './base44Client.js';

export default async function callAIModel({ model_id, messages, system_prompt }) {
  // 获取模型配置
  const models = await base44.entities.AIModel.filter({ id: model_id });
  const model = models[0];
  
  if (!model) {
    throw new Error('Model not found');
  }
  
  if (!model.api_key) {
    throw new Error('API key not configured for this model');
  }

  const provider = model.provider;
  let response;

  // 构建消息列表
  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  if (system_prompt) {
    formattedMessages.unshift({ role: 'system', content: system_prompt });
  }

  if (provider === 'openai' || provider === 'custom') {
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
      throw new Error(`API error: ${error}`);
    }

    const data = await res.json();
    response = data.choices[0].message.content;

  } else if (provider === 'anthropic') {
    // Anthropic Claude API
    const endpoint = model.api_endpoint || 'https://api.anthropic.com/v1/messages';
    
    // Anthropic 需要单独处理 system prompt
    const anthropicMessages = formattedMessages.filter(m => m.role !== 'system');
    const systemContent = formattedMessages.find(m => m.role === 'system')?.content || '';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': model.api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model.model_id,
        max_tokens: model.max_tokens || 4096,
        system: systemContent,
        messages: anthropicMessages
      })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`API error: ${error}`);
    }

    const data = await res.json();
    response = data.content[0].text;

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

    const systemInstruction = formattedMessages.find(m => m.role === 'system')?.content;

    const requestBody = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: model.max_tokens || 4096
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
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
      throw new Error(`API error: ${error}`);
    }

    const data = await res.json();
    response = data.candidates[0].content.parts[0].text;

  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return { response, credits_used: model.credits_per_message };
}