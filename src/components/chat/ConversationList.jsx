import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Trash2, Archive, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

export default function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect, 
  onDelete, 
  onArchive 
}) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-3 rounded-full bg-slate-100 mb-3">
          <MessageSquare className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">No conversations yet</p>
        <p className="text-xs text-slate-400 mt-1">Start a new chat to begin</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all",
            selectedId === conv.id
              ? "bg-violet-50 border border-violet-200"
              : "hover:bg-slate-50 border border-transparent"
          )}
          onClick={() => onSelect(conv.id)}
        >
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            selectedId === conv.id ? "bg-violet-100" : "bg-slate-100"
          )}>
            <MessageSquare className={cn(
              "h-4 w-4",
              selectedId === conv.id ? "text-violet-600" : "text-slate-500"
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-slate-800 truncate">
              {conv.title || 'New Conversation'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {format(new Date(conv.updated_date || conv.created_date), 'MMM d, HH:mm')}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onArchive(conv.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => onDelete(conv.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}