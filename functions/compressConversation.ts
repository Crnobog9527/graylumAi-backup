import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ========== 摘要生成配置 ==========
// 强制使用 Haiku 降低成本，摘要任务不需要 Sonnet
const MODELS = {
  haiku: '@preset/claude-haiku-4.5'
};

const SUMMARY_MAX_TOKENS = 300;  // 摘要简短即可，控制在 300 tokens

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
    // 压缩消息数量由调用方传入（通常保留最近 6 条消息）
    const messagesToCompress = messages_to_compress || messages.length - 6; // 默认保留最近 6 条
    
    if (messagesToCompress <= 0) {
      return Response.json({ error: 'No messages to compress' }, { status: 400 });
    }
    
    const oldMessages = messages.slice(0, messagesToCompress);
    const conversationText = oldMessages.map(m => 
      `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`
    ).join('\n\n');
    
    const originalTokens = estimateTokens(conversationText);
    
    // 【优化】简洁的摘要提示词，使用 Haiku 快速提取关键信息
    const summaryPrompt = `Summarize the key points of this conversation in 2-3 concise sentences.

Focus on:
1. User's main needs and requests
2. Important context for continuing the conversation
3. Any specific requirements or preferences mentioned

Conversation (${Math.floor(oldMessages.length / 2)} turns):
${conversationText}

Provide a brief, structured summary that captures the essential information.`;

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
        max_tokens: SUMMARY_MAX_TOKENS  // 使用配置的最大 token 数
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