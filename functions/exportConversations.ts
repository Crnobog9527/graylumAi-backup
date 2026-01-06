import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversation_ids, format = 'json' } = body;

    // 获取用户的会员等级
    const userTier = user.subscription_tier || 'free';
    
    // 获取会员计划配置
    const membershipPlans = await base44.entities.MembershipPlan.list();
    const plan = membershipPlans.find(p => p.level === userTier);
    
    // 检查导出权限
    const canExport = plan?.can_export_conversations || false;
    
    if (!canExport) {
      return Response.json({ 
        error: '您当前的会员等级不支持批量导出功能，请升级会员', 
        upgrade_required: true 
      }, { status: 403 });
    }

    // 获取用户的对话
    const allConversations = await base44.entities.Conversation.list('-created_date');
    
    // 筛选指定的对话（如果提供了ID列表）
    let conversationsToExport = allConversations;
    if (conversation_ids && conversation_ids.length > 0) {
      conversationsToExport = allConversations.filter(conv => 
        conversation_ids.includes(conv.id)
      );
    }

    if (conversationsToExport.length === 0) {
      return Response.json({ error: '没有可导出的对话' }, { status: 400 });
    }

    // 格式化导出数据
    const exportData = conversationsToExport.map(conv => ({
      id: conv.id,
      title: conv.title || '未命名对话',
      created_date: conv.created_date,
      updated_date: conv.updated_date,
      model_id: conv.model_id,
      total_credits_used: conv.total_credits_used || 0,
      messages: (conv.messages || []).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        credits_used: msg.credits_used || 0
      }))
    }));

    if (format === 'markdown') {
      // 导出为Markdown格式
      let markdown = `# 对话记录导出\n\n`;
      markdown += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
      markdown += `共 ${exportData.length} 条对话\n\n---\n\n`;

      for (const conv of exportData) {
        markdown += `## ${conv.title}\n\n`;
        markdown += `- 创建时间: ${new Date(conv.created_date).toLocaleString('zh-CN')}\n`;
        markdown += `- 模型: ${conv.model_id || '默认'}\n`;
        markdown += `- 消耗积分: ${conv.total_credits_used}\n\n`;

        for (const msg of conv.messages) {
          const role = msg.role === 'user' ? '👤 用户' : '🤖 助手';
          markdown += `### ${role}\n\n${msg.content}\n\n`;
        }
        markdown += `---\n\n`;
      }

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename=conversations_${Date.now()}.md`
        }
      });
    }

    // 默认JSON格式
    return Response.json({
      success: true,
      export_time: new Date().toISOString(),
      total_conversations: exportData.length,
      data: exportData
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});