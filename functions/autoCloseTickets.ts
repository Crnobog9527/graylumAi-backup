import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 获取所有未关闭的工单
    const tickets = await base44.asServiceRole.entities.Ticket.filter({
      status: { $ne: 'closed' }
    });

    const now = new Date();
    const closedTickets = [];
    const TIMEOUT_HOURS = 48;

    for (const ticket of tickets) {
      // 获取该工单的所有回复
      const replies = await base44.asServiceRole.entities.TicketReply.filter(
        { ticket_id: ticket.id },
        'created_date'
      );

      // 找到第一条管理员回复
      const firstAdminReply = replies.find(r => r.is_admin_reply);
      
      if (!firstAdminReply) {
        // 没有管理员回复，不自动关闭
        continue;
      }

      // 找到管理员回复后的最后一条用户回复
      const adminReplyTime = new Date(firstAdminReply.created_date);
      const userRepliesAfterAdmin = replies.filter(
        r => !r.is_admin_reply && new Date(r.created_date) > adminReplyTime
      );

      // 计算超时时间起点：如果有用户回复，从最后一条用户回复开始；否则从管理员第一次回复开始
      let timeoutStart;
      if (userRepliesAfterAdmin.length > 0) {
        // 有用户回复，从最后一条用户回复时间开始计时
        const lastUserReply = userRepliesAfterAdmin[userRepliesAfterAdmin.length - 1];
        timeoutStart = new Date(lastUserReply.created_date);
      } else {
        // 没有用户回复，从管理员第一次回复开始计时
        timeoutStart = adminReplyTime;
      }

      // 检查是否超过48小时
      const hoursDiff = (now - timeoutStart) / (1000 * 60 * 60);
      
      if (hoursDiff >= TIMEOUT_HOURS) {
        // 自动关闭工单
        await base44.asServiceRole.entities.Ticket.update(ticket.id, {
          status: 'closed',
          resolved_date: now.toISOString()
        });

        // 添加系统消息
        await base44.asServiceRole.entities.TicketReply.create({
          ticket_id: ticket.id,
          user_email: 'system@auto',
          message: `此工单因超过 ${TIMEOUT_HOURS} 小时无用户回复，已被系统自动关闭。如需继续咨询，请创建新工单。`,
          is_admin_reply: true
        });

        closedTickets.push({
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title
        });
      }
    }

    return Response.json({
      success: true,
      checked: tickets.length,
      closed: closedTickets.length,
      closedTickets
    });

  } catch (error) {
    console.error('Auto close tickets error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});