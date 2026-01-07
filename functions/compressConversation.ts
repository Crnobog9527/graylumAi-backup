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
    // 【优化】增加保留的消息数量，从4轮改为6轮（12条消息）
    const messagesToCompress = messages_to_compress || messages.length - 12; // 保留最近6轮
    
    if (messagesToCompress <= 0) {
      return Response.json({ error: 'No messages to compress' }, { status: 400 });
    }
    
    const oldMessages = messages.slice(0, messagesToCompress);
    const conversationText = oldMessages.map(m => 
      `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`
    ).join('\n\n');
    
    const originalTokens = estimateTokens(conversationText);
    
    // 【优化】增强摘要提示词，确保关键指令和上下文被完整保留
    const summaryPrompt = `你是一个专业的对话摘要助手。请为以下对话生成**高质量结构化摘要**。

**核心原则：宁多勿少，关键信息必须完整保留**

**必须保留的内容（按重要性排序）：**
1. **用户的核心指令和要求**：用户明确要求AI做什么、怎么做、以什么格式输出
2. **角色设定和人设**：如果用户要求AI扮演某个角色或专家身份
3. **输出格式要求**：用户指定的任何格式、结构、风格要求
4. **创作主题和背景**：正在讨论或创作的具体内容、主题、背景设定
5. **已完成的内容概要**：AI已经输出了什么（如小说章节、代码模块等）
6. **待完成的任务**：用户还期望完成什么
7. **用户的偏好和反馈**：用户表达的喜好、不满、修改意见

**输出格式：**
【角色/人设】（如有）
...

【核心任务】
...

【输出要求】
- 格式：...
- 风格：...
- 其他：...

【已完成内容】
- 第X部分：...概要...
- 第Y部分：...概要...

【待完成任务】
...

【用户偏好/反馈】
...

【关键上下文】
...

对话内容（共 ${Math.floor(oldMessages.length / 2)} 轮）：
${conversationText}

**重要：摘要必须足够详细，让AI在没有原始对话的情况下，仍能准确继续执行用户的任务和要求。**`;

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