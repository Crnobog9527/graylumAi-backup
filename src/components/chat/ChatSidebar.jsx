import React, { memo } from 'react';
import { Plus, Settings2, Trash2, CheckSquare, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 对话项组件
const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  isSelectMode,
  isSelected,
  onSelect,
  onClick,
  onDelete
}) {
  const date = new Date(conversation.updated_date || conversation.created_date);
  const timeStr = format(date, 'HH:mm', { locale: zhCN });

  return (
    <div
      onClick={() => isSelectMode ? onSelect() : onClick()}
      className="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer conversation-item transition-colors"
      style={{
        background: isActive && !isSelectMode
          ? 'rgba(255, 215, 0, 0.1)'
          : isSelected
            ? 'rgba(239, 68, 68, 0.1)'
            : 'transparent',
        border: isActive && !isSelectMode
          ? '1px solid rgba(255, 215, 0, 0.3)'
          : isSelected
            ? '1px solid rgba(239, 68, 68, 0.3)'
            : '1px solid transparent',
      }}
    >
      {isSelectMode && (
        <div className="shrink-0">
          {isSelected ? (
            <CheckSquare className="h-4 w-4" style={{ color: 'var(--error)' }} />
          ) : (
            <Square className="h-4 w-4" style={{ color: 'var(--text-disabled)' }} />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm truncate block font-medium"
            style={{ color: isActive && !isSelectMode ? 'var(--color-primary)' : 'var(--text-secondary)' }}
          >
            {conversation.title || '新对话'}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>{timeStr}</span>
      </div>

      {!isSelectMode && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
});

// 对话分组组件
const ConversationGroup = memo(function ConversationGroup({
  title,
  conversations,
  currentConversationId,
  isSelectMode,
  selectedConversations,
  onToggleSelect,
  onSelect,
  onDelete
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="px-2 py-1 text-xs" style={{ color: 'var(--text-disabled)' }}>{title}</div>
      {conversations.map(conv => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={currentConversationId === conv.id}
          isSelectMode={isSelectMode}
          isSelected={selectedConversations.includes(conv.id)}
          onSelect={() => onToggleSelect(conv.id)}
          onClick={() => onSelect(conv)}
          onDelete={() => onDelete(conv.id)}
        />
      ))}
    </div>
  );
});

// 主侧边栏组件
const ChatSidebar = memo(function ChatSidebar({
  groupedConversations,
  conversations,
  currentConversation,
  isSelectMode,
  setIsSelectMode,
  selectedConversations,
  setSelectedConversations,
  onStartNewChat,
  onSelectConversation,
  onDeleteConversation,
  onBatchDelete,
  toggleSelectConversation,
  toggleSelectAll
}) {
  return (
    <div
      className="w-64 flex flex-col shrink-0 md:flex"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-primary)' }}
    >
      {/* 新建对话按钮 */}
      <div className="p-4">
        <Button
          onClick={() => onStartNewChat()}
          className="w-full gap-2 h-11 rounded-xl font-medium"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            color: 'var(--bg-primary)',
          }}
        >
          <Plus className="h-5 w-5" />
          新建对话
        </Button>
      </div>

      {/* 全部对话标题栏 */}
      <div
        className="flex items-center justify-between px-5 py-2"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>全部对话</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsSelectMode(!isSelectMode);
            if (isSelectMode) {
              setSelectedConversations([]);
            }
          }}
          className="h-7 px-2 text-xs font-medium hover:opacity-80"
          style={{ color: 'var(--color-primary)' }}
        >
          <Settings2 className="h-3.5 w-3.5 mr-1" />
          {isSelectMode ? '完成' : '管理'}
        </Button>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-3 pb-4">
            {/* 批量操作栏 */}
            {isSelectMode && (
              <div
                className="flex items-center gap-2 px-2 py-2 mb-2 rounded-lg"
                style={{ background: 'var(--bg-primary)' }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-7 px-2 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {selectedConversations.length === conversations.length ? '取消全选' : '全选'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBatchDelete}
                  disabled={selectedConversations.length === 0}
                  className="h-7 w-7 p-0"
                  style={{ background: 'var(--error)', color: 'white' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <ConversationGroup
              title="今天"
              conversations={groupedConversations.today}
              currentConversationId={currentConversation?.id}
              isSelectMode={isSelectMode}
              selectedConversations={selectedConversations}
              onToggleSelect={toggleSelectConversation}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />

            <ConversationGroup
              title="昨天"
              conversations={groupedConversations.yesterday}
              currentConversationId={currentConversation?.id}
              isSelectMode={isSelectMode}
              selectedConversations={selectedConversations}
              onToggleSelect={toggleSelectConversation}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />

            <ConversationGroup
              title="本周"
              conversations={groupedConversations.thisWeek}
              currentConversationId={currentConversation?.id}
              isSelectMode={isSelectMode}
              selectedConversations={selectedConversations}
              onToggleSelect={toggleSelectConversation}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />

            <ConversationGroup
              title="更早"
              conversations={groupedConversations.older}
              currentConversationId={currentConversation?.id}
              isSelectMode={isSelectMode}
              selectedConversations={selectedConversations}
              onToggleSelect={toggleSelectConversation}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />

            {/* 空状态 */}
            {conversations.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-disabled)' }}>
                暂无对话记录
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});

export default ChatSidebar;
