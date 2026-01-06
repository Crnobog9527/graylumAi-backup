import React from 'react';
import { Paperclip } from 'lucide-react';
import { categoryMap } from '@/constants/ticketConstants';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityBadge from './TicketPriorityBadge';

export default function TicketInfo({ ticket, showUserEmail = false, children }) {
  return (
    <div
      className="rounded-xl p-6 mb-6"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)'
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>{ticket.ticket_number}</span>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{ticket.title}</h1>
          <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
            {showUserEmail && (
              <>
                <span>用户：{ticket.user_email}</span>
                <span>•</span>
              </>
            )}
            <span>{categoryMap[ticket.category]}</span>
            <span>•</span>
            <span>创建于 {new Date(ticket.created_date).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        {children}
      </div>

      <div className="pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>问题描述</h3>
        <p className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{ticket.description}</p>
      </div>

      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>附件</h3>
          <div className="space-y-2">
            {ticket.attachments.map((file, index) => (
              <a
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--color-primary)'
                }}
              >
                <Paperclip className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-sm">{file.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
