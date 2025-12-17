import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { model_id, messages, system_prompt, force_web_search, image_files } = await req.json();

    console.log('[callAIModelStream] Stream request started');
    console.log('[callAIModelStream] model_id:', model_id);
    console.log('[callAIModelStream] messages count:', messages?.length);

    // Token 估算函数
    const estimateTokens = (text) => Math.ceil((text || '').length / 4);

    // 获取模型配置
    const models = await base44.asServiceRole.entities.AIModel.filter({ id: model_id });
    const model = models[0];

    if (!model) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    const inputLimit = model.input_limit || 180000;
    
    // 简化的消息截断逻辑
    const calculateTotalTokens = (msgs, sysPrompt) => {
      let total = estimateTokens(sysPrompt);
      for (const m of msgs) {
        total += estimateTokens(m.content);
      }
      return total;
    };

    const truncateMessages = (msgs, sysPrompt, maxTokens) => {
      let truncatedMsgs = [...msgs];
      let totalTokens = calculateTotalTokens(truncatedMsgs, sysPrompt);
      
      while (totalTokens > maxTokens && truncatedMsgs.length > 2) {
        truncatedMsgs = truncatedMsgs.length >= 2 ? truncatedMsgs.slice(2) : truncatedMsgs.slice(1);
        totalTokens = calculateTotalTokens(truncatedMsgs, sysPrompt);
      }
      
      return { truncatedMsgs, totalTokens };
    };

    const { truncatedMsgs: processedMessages } = truncateMessages(messages, system_prompt, inputLimit);
    const estimatedInputTokens = calculateTotalTokens(processedMessages, system_prompt);

    // 构建消息列表
    let formattedMessages = processedMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const useOpenAIFormat = model.api_endpoint && model.api_endpoint.includes('/chat/completions');
    const hasValidSystemPrompt = system_prompt && system_prompt.trim().length > 0;

    if (hasValidSystemPrompt && !useOpenAIFormat && model.provider !== 'anthropic') {
      formattedMessages.unshift({ role: 'system', content: system_prompt });
    }

    // 处理图片文件
    if (image_files && image_files.length > 0) {
      const lastUserMsgIdx = formattedMessages.length - 1;
      if (formattedMessages[lastUserMsgIdx]?.role === 'user') {
        const textContent = formattedMessages[lastUserMsgIdx].content;
        const contentArray = [];
        image_files.forEach(img => {
          contentArray.push({
            type: 'image',
            source: { type: 'base64', media_type: img.media_type, data: img.base64 }
          });
        });
        contentArray.push({ type: 'text', text: textContent });
        formattedMessages[lastUserMsgIdx] = { role: 'user', content: contentArray };
      }
    }

    // ========== 流式输出实现 ==========
    const encoder = new TextEncoder();
    
    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          let actualInputTokens = estimatedInputTokens;
          let actualOutputTokens = 0;

          // 根据不同的provider调用流式API
          if (model.provider === 'anthropic') {
            const endpoint = model.api_endpoint || 'https://api.anthropic.com/v1/messages';
            const isOfficialApi = !model.api_endpoint || model.api_endpoint.includes('anthropic.com');
            
            const headers = {
              'Content-Type': 'application/json'
            };

            if (isOfficialApi) {
              headers['x-api-key'] = model.api_key;
              headers['anthropic-version'] = '2023-06-01';
            } else {
              headers['Authorization'] = `Bearer ${model.api_key}`;
            }

            const anthropicMessages = formattedMessages.filter(m => m.role !== 'system');
            
            const requestBody = {
              model: model.model_id,
              max_tokens: model.max_tokens || 4096,
              messages: anthropicMessages,
              stream: true
            };

            if (hasValidSystemPrompt) {
              requestBody.system = system_prompt;
            }

            const res = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody)
            });

            if (!res.ok) {
              const error = await res.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `API error: ${error}`, type: 'error' })}\n\n`));
              controller.close();
              return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                      fullContent += parsed.delta.text;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'content',
                        text: parsed.delta.text,
                        fullContent: fullContent
                      })}\n\n`));
                    }
                    
                    if (parsed.type === 'message_stop' || parsed.type === 'message_delta') {
                      if (parsed.usage) {
                        actualInputTokens = parsed.usage.input_tokens || estimatedInputTokens;
                        actualOutputTokens = parsed.usage.output_tokens || estimateTokens(fullContent);
                      }
                    }
                  } catch (e) {
                    console.error('Parse error:', e);
                  }
                }
              }
            }
          } else if (model.provider === 'openai' || model.provider === 'custom' || useOpenAIFormat) {
            const endpoint = model.api_endpoint || 'https://api.openai.com/v1/chat/completions';
            
            const requestBody = {
              model: model.model_id,
              messages: formattedMessages,
              max_tokens: model.max_tokens || 4096,
              stream: true
            };

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
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `API error: ${error}`, type: 'error' })}\n\n`));
              controller.close();
              return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    
                    if (delta) {
                      fullContent += delta;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'content',
                        text: delta,
                        fullContent: fullContent
                      })}\n\n`));
                    }
                  } catch (e) {
                    console.error('Parse error:', e);
                  }
                }
              }
            }
            
            actualOutputTokens = estimateTokens(fullContent);
          } else {
            // 不支持流式的provider，返回错误
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              error: 'Streaming not supported for this provider',
              type: 'error'
            })}\n\n`));
            controller.close();
            return;
          }

          // 发送最终的token统计
          const inputCredits = actualInputTokens / 1000;
          const outputCredits = actualOutputTokens / 200;
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            input_tokens: actualInputTokens,
            output_tokens: actualOutputTokens,
            input_credits: inputCredits,
            output_credits: outputCredits,
            credits_used: inputCredits + outputCredits,
            web_search_enabled: force_web_search === true,
            fullContent: fullContent
          })}\n\n`));
          
          controller.close();
          
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            error: error.message,
            type: 'error'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Request error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});