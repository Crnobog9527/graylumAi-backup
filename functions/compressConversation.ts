import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const MODELS = {
  haiku: '@preset/claude-haiku-4.5'
};

const estimateTokens = (text) => Math.ceil((text || '').length / 4);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { conversation_id, messages_to_compress } = await req.json();
    
    if (!conversation_id) {
      return Response.json({ error: 'conversation_id is required' }, { status: 400 });
    }
    
    // 获取对话
    const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
    const conversation = convs[0];
    
    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    const messages = conversation.messages || [];
    const messagesToCompress = messages_to_compress || messages.length - 8; // 保留最近4轮
    
    if (messagesToCompress <= 0) {
      return Response.json({ error: 'No messages to compress' }, { status: 400 });
    }
    
    const oldMessages = messages.slice(0, messagesToCompress);
    const conversationText = oldMessages.map(m => 
      `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`
    ).join('\n\n');
    
    const originalTokens = estimateTokens(conversationText);
    
    // 构建摘要提示词
    const summaryPrompt = `你是一个专业的对话摘要助手。请为以下对话生成结构化摘要。

要求：
1. 主要讨论的主题（用简洁的列表形式）
2. 用户的关键需求、偏好和背景信息
3. 重要的技术细节或上下文信息
4. 未完成的任务或待解决的问题
5. AI 提供的重要建议或方案

对话内容（共 ${oldMessages.length / 2} 轮）：
${conversationText}

请以结构化格式输出摘要，保留所有关键信息，删除重复和不重要的内容。摘要应该让 AI 能够继续对话而不丢失上下文。`;

    // 调用 Haiku 生成摘要
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      return Response.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
    }
    
    const summaryRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`
      },
      body: JSON.stringify({
        model: MODELS.haiku,
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: 2000
      })
    });
    
    if (!summaryRes.ok) {
      const error = await summaryRes.text();
      return Response.json({ error: `API error: ${error}` }, { status: summaryRes.status });
    }
    
    const summaryData = await summaryRes.json();
    const summaryText = summaryData.choices[0].message.content;
    const summaryTokens = estimateTokens(summaryText);
    const compressionRatio = summaryTokens / originalTokens;
    
    // 提取关键主题（简单的关键词提取）
    const topicMatches = summaryText.match(/(?:主题|话题|讨论)[:：]\s*([^\n]+)/gi) || [];
    const keyTopics = topicMatches.map(m => 
      m.split(/[:：]/)[1].trim()
    ).filter(Boolean);
    
    // 创建摘要记录
    const summary = await base44.asServiceRole.entities.ConversationSummary.create({
      conversation_id,
      user_email: user.email,
      summary_text: summaryText,
      covered_messages: oldMessages.length / 2,
      summary_tokens: summaryTokens,
      key_topics: keyTopics.length > 0 ? keyTopics : ['通用对话'],
      compression_ratio: compressionRatio
    });
    
    // 记录统计
    const inputTokens = summaryData.usage?.prompt_tokens || estimateTokens(summaryPrompt);
    const outputTokens = summaryData.usage?.completion_tokens || summaryTokens;
    const cost = (inputTokens / 1000000) * 1.0 + (outputTokens / 1000000) * 5.0;
    
    await base44.asServiceRole.entities.TokenStats.create({
      conversation_id,
      user_email: user.email,
      model_used: MODELS.haiku,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_cost: cost,
      request_type: 'compression',
      compression_triggered: true
    });
    
    return Response.json({
      success: true,
      summary: {
        id: summary.id,
        text: summaryText,
        covered_messages: oldMessages.length / 2,
        original_tokens: originalTokens,
        summary_tokens: summaryTokens,
        compression_ratio: (compressionRatio * 100).toFixed(1) + '%',
        tokens_saved: originalTokens - summaryTokens,
        key_topics: keyTopics
      },
      cost: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_cost: cost.toFixed(6)
      }
    });
    
  } catch (error) {
    console.error('Compress conversation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});