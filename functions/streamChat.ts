import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Token 估算函数
const estimateTokens = (text) => Math.ceil((text || '').length / 4);

Deno.serve(async (req) => {
  console.log('[streamChat] Request started');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { conversation_id, message, system_prompt } = await req.json();
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // 获取模型配置
    const models = await base44.asServiceRole.entities.AIModel.filter({ is_active: true });
    if (models.length === 0) {
      return Response.json({ error: 'No active AI models found' }, { status: 400 });
    }
    
    let selectedModel = models.find(m => m.is_default) || models[0];
    
    // 如果有对话ID，获取对话历史和模型设置
    let conversationMessages = [];
    let conversation = null;
    
    if (conversation_id) {
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      if (convs.length > 0) {
        conversation = convs[0];
        conversationMessages = conversation.messages || [];
        const convModel = models.find(m => m.id === conversation.model_id);
        if (convModel) selectedModel = convModel;
      }
    }
    
    // 检查模型是否支持流式（目前只支持 OpenRouter / OpenAI 兼容格式）
    const isOpenRouter = selectedModel.api_endpoint?.includes('openrouter.ai');
    const isOpenAIFormat = selectedModel.api_endpoint?.includes('/chat/completions') || 
                          selectedModel.provider === 'openai' || 
                          selectedModel.provider === 'custom';
    
    if (!isOpenRouter && !isOpenAIFormat) {
      // 不支持流式的模型，回退到普通调用
      console.log('[streamChat] Model does not support streaming, falling back to regular call');
      const result = await base44.functions.invoke('smartChatWithSearch', {
        conversation_id,
        message,
        system_prompt
      });
      return Response.json(result.data);
    }
    
    // 硬编码身份信息
    const identityInfo = `\n\n【重要：模型身份信息】\n当用户询问你的模型版本、型号、具体是什么模型等相关问题时，请统一回答：\n我是 Claude Sonnet 4.5，具体模型版本号是 claude-sonnet-4-5-20250929，发布于2025年9月29日。`;
    const enhancedSystemPrompt = system_prompt ? `${system_prompt}${identityInfo}` : identityInfo.trim();
    
    // 构建消息
    const apiMessages = [];
    const isFirstTurn = conversationMessages.length === 0;
    
    // 系统提示词只在第一轮添加
    if (isFirstTurn && enhancedSystemPrompt) {
      apiMessages.push({ role: 'system', content: enhancedSystemPrompt });
    }
    
    // 添加历史消息
    conversationMessages.forEach(m => {
      apiMessages.push({
        role: m.role,
        content: m.content || m.text || ''
      });
    });
    
    // 添加当前消息
    apiMessages.push({ role: 'user', content: message });
    
    // 搜索关键词检测
    const lowerMessage = message.toLowerCase();
    const searchKeywords = ["天气", "股价", "汇率", "新闻", "最新", "今天", "现在", "当前", "查询", "搜索"];
    const hasUrl = /(https?:\/\/[^\s]+)/.test(message);
    const hasSearchKeyword = searchKeywords.some(kw => lowerMessage.includes(kw));
    const shouldSearch = (hasSearchKeyword || hasUrl) && selectedModel.enable_web_search;
    
    // 构建请求
    const endpoint = selectedModel.api_endpoint || 'https://api.openai.com/v1/chat/completions';
    const requestBody = {
      model: selectedModel.model_id,
      messages: apiMessages,
      max_tokens: selectedModel.max_tokens || 4096,
      stream: true  // 启用流式
    };
    
    if (isOpenRouter && shouldSearch) {
      requestBody.plugins = [{ id: 'web', max_results: 5 }];
    }
    
    console.log('[streamChat] Calling API with streaming, model:', selectedModel.model_id);
    
    // 发起流式请求
    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${selectedModel.api_key}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!apiResponse.ok) {
      const error = await apiResponse.text();
      return Response.json({ error: `API error: ${error}` }, { status: apiResponse.status });
    }
    
    // 创建 TransformStream 处理 SSE 数据
    let fullResponse = '';
    let inputTokens = estimateTokens(apiMessages.map(m => m.content).join(''));
    let outputTokens = 0;
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // 流结束，发送完成信号和统计信息
              outputTokens = estimateTokens(fullResponse);
              const inputCredits = inputTokens / 1000;
              const outputCredits = outputTokens / 200;
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'done',
                full_response: fullResponse,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                input_credits: inputCredits,
                output_credits: outputCredits,
                credits_used: inputCredits + outputCredits
              })}\n\n`));
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                // 转发内容块
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: content
                })}\n\n`));
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      },
      
      async flush(controller) {
        // 确保发送完成信号
        if (fullResponse) {
          outputTokens = estimateTokens(fullResponse);
          const inputCredits = inputTokens / 1000;
          const outputCredits = outputTokens / 200;
          
          // 保存对话和扣费（异步执行，不阻塞响应）
          saveConversationAndDeduct(
            base44, user, conversation, conversation_id, 
            conversationMessages, message, fullResponse,
            selectedModel, inputTokens, outputTokens, shouldSearch
          ).catch(err => console.error('[streamChat] Save error:', err));
        }
      }
    });
    
    // 返回流式响应
    return new Response(apiResponse.body.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Conversation-Id': conversation_id || 'new'
      }
    });
    
  } catch (error) {
    console.error('[streamChat] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// 保存对话和扣费（异步函数）
async function saveConversationAndDeduct(
  base44, user, conversation, conversationId,
  conversationMessages, userMessage, assistantResponse,
  model, inputTokens, outputTokens, webSearchUsed
) {
  try {
    const inputCredits = inputTokens / 1000;
    const outputCredits = outputTokens / 200;
    const tokenCredits = inputCredits + outputCredits;
    
    // 获取用户当前余额
    const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
    if (users.length === 0) return;
    
    const userRecord = users[0];
    let currentBalance = userRecord.credits || 0;
    let currentPending = userRecord.pending_credits || 0;
    let actualDeducted = 0;
    let webSearchDeducted = 0;
    
    // 联网搜索费用
    if (webSearchUsed) {
      const WEB_SEARCH_FEE = 5;
      if (currentBalance >= WEB_SEARCH_FEE) {
        currentBalance -= WEB_SEARCH_FEE;
        webSearchDeducted = WEB_SEARCH_FEE;
      }
    }
    
    // Token 费用加入待结算
    currentPending += tokenCredits;
    
    // 待结算 >= 1 时扣除
    let tokenDeducted = 0;
    if (currentPending >= 1) {
      tokenDeducted = Math.floor(currentPending);
      if (currentBalance >= tokenDeducted) {
        currentBalance -= tokenDeducted;
        currentPending -= tokenDeducted;
      }
    }
    
    actualDeducted = webSearchDeducted + tokenDeducted;
    
    // 更新用户余额
    await base44.asServiceRole.entities.User.update(userRecord.id, {
      credits: currentBalance,
      pending_credits: currentPending,
      total_credits_used: (userRecord.total_credits_used || 0) + actualDeducted
    });
    
    // 创建交易记录
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_email: user.email,
      type: 'usage',
      amount: -actualDeducted,
      balance_after: currentBalance,
      description: `流式对话消耗 - ${model.name}`,
      model_used: model.name,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      input_credits: inputCredits,
      output_credits: outputCredits,
      web_search_used: webSearchUsed
    });
    
    // 更新或创建对话
    const newMessages = [
      ...conversationMessages,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { 
        role: 'assistant', 
        content: assistantResponse, 
        timestamp: new Date().toISOString(),
        credits_used: actualDeducted,
        input_tokens: inputTokens,
        output_tokens: outputTokens
      }
    ];
    
    if (conversation) {
      await base44.asServiceRole.entities.Conversation.update(conversation.id, {
        messages: newMessages,
        total_credits_used: (conversation.total_credits_used || 0) + actualDeducted
      });
    } else {
      await base44.asServiceRole.entities.Conversation.create({
        title: userMessage.slice(0, 50),
        model_id: model.id,
        messages: newMessages,
        total_credits_used: actualDeducted
      });
    }
    
    console.log('[streamChat] Saved conversation and deducted', actualDeducted, 'credits');
    
  } catch (error) {
    console.error('[streamChat] saveConversationAndDeduct error:', error);
  }
}