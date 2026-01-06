import React from 'react';
import { cn } from '@/lib/utils';
import { priorityMap } from '@/constants/ticketConstants';

export default function TicketPriorityBadge({ priority, showLabel = true, className = "" }) {
  const priorityInfo = priorityMap[priority];
  if (!priorityInfo) return null;

  return (
    <span className={cn("text-sm font-medium", priorityInfo.color, className)}>
      {priorityInfo.label}{showLabel && '优先级'}
    </span>
  );
}
