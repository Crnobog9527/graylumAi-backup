import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 获取当前用户的对话列表
 * 使用 asServiceRole 绕过 RLS 限制，通过 created_by 字段过滤
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[listMyConversations] User:', user.email);

    // 使用 asServiceRole 绕过 RLS，获取用户的所有对话
    const conversations = await base44.asServiceRole.entities.Conversation.filter(
      { created_by: user.email, is_archived: false },
      '-updated_date'
    );

    console.log('[listMyConversations] Found', conversations.length, 'conversations');

    // 返回简化的对话列表（不需要完整消息内容）
    const simplifiedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      model_id: conv.model_id,
      prompt_module_id: conv.prompt_module_id,
      total_credits_used: conv.total_credits_used,
      is_archived: conv.is_archived,
      created_by: conv.created_by,
      created_date: conv.created_date,
      updated_date: conv.updated_date,
      // 不返回 messages 和 system_prompt 以减少数据量
      message_count: conv.messages?.length || 0,
    }));

    return Response.json({
      success: true,
      conversations: simplifiedConversations,
      count: simplifiedConversations.length
    });

  } catch (error) {
    console.error('[listMyConversations] Error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});
