import React from 'react';
import { format } from 'date-fns';
import { MessageSquare, Trash2, Archive, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ConversationList({ 
  conversations, 
  activeConversationId, 
  onSelect, 
  onDelete,
  onArchive 
}) {
  if (!conversations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="p-4 rounded-full bg-slate-100 mb-4">
          <MessageSquare className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-slate-500 text-sm">No conversations yet</p>
        <p className="text-slate-400 text-xs mt-1">Start a new chat to begin</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
              activeConversationId === conv.id
                ? "bg-indigo-50 border border-indigo-200"
                : "hover:bg-slate-50 border border-transparent"
            )}
            onClick={() => onSelect(conv)}
          >
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              activeConversationId === conv.id
                ? "bg-indigo-100"
                : "bg-slate-100 group-hover:bg-slate-200"
            )}>
              <MessageSquare className={cn(
                "h-4 w-4",
                activeConversationId === conv.id ? "text-indigo-600" : "text-slate-500"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm truncate",
                activeConversationId === conv.id ? "text-indigo-700" : "text-slate-700"
              )}>
                {conv.title || 'New Chat'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {format(new Date(conv.created_date), 'MMM d, HH:mm')}
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
                  <MoreVertical className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(conv); }}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(conv); }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}