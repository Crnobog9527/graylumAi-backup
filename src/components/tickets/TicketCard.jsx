import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { categoryMap } from '@/constants/ticketConstants';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityBadge from './TicketPriorityBadge';

export default function TicketCard({ ticket, linkTo = 'TicketDetail' }) {
  return (
    <Link to={createPageUrl(linkTo) + `?id=${ticket.id}`}>
      <div
        className="rounded-xl p-5 transition-all duration-300 hover:translate-y-[-2px]"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 215, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-primary)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>{ticket.ticket_number}</span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{ticket.title}</h3>
            <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{ticket.description}</p>
            <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
              <span>{categoryMap[ticket.category]}</span>
              <span>创建于 {new Date(ticket.created_date).toLocaleDateString('zh-CN')}</span>
              <span>更新于 {new Date(ticket.updated_date).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
