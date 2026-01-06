import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { categoryMap } from '@/constants/ticketConstants';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityBadge from './TicketPriorityBadge';

export default function TicketCard({ ticket, linkTo = 'TicketDetail' }) {
  return (
    <Link to={createPageUrl(linkTo) + `?id=${ticket.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-sm font-mono text-slate-500">{ticket.ticket_number}</span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{ticket.title}</h3>
            <p className="text-slate-600 text-sm line-clamp-2 mb-3">{ticket.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
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
