import React from 'react';
import { cn } from '@/lib/utils';
import { statusMap } from '@/constants/ticketConstants';

export default function TicketStatusBadge({ status, showIcon = true, className = "" }) {
  const statusInfo = statusMap[status];
  if (!statusInfo) return null;

  const StatusIcon = statusInfo.icon;

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1.5",
      statusInfo.color,
      className
    )}>
      {showIcon && <StatusIcon className="h-3 w-3" />}
      {statusInfo.label}
    </span>
  );
}
