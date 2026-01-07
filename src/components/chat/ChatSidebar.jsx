import React, { memo, useCallback, useMemo } from 'react';
import { Plus, Settings2, Trash2, CheckSquare, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 自定义比较函数 - ConversationItem
const areConversationItemPropsEqual = (prevProps, nextProps) => {
  // 检查关键属性
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.isSelectMode !== nextProps.isSelectMode) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;

  // 比较对话数据
  const prevConv = prevProps.conversation;
  const nextConv = nextProps.conversation;

  if (prevConv.id !== nextConv.id) return false;
  if (prevConv.title !== nextConv.title) return false;
  if (prevConv.updated_date !== nextConv.updated_date) return false;

  return true;
};

// 对话项组件 - 使用自定义比较函数
const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  isSelectMode,
  isSelected,
  onSelect,
  onClick,
  onDelete
}) {
  // 缓存时间格式化
  const timeStr = useMemo(() => {
    const date = new Date(conversation.updated_date || conversation.created_date);
    return format(date, 'HH:mm', { locale: zhCN });
  }, [conversation.updated_date, conversation.created_date]);

  // 缓存点击处理
  const handleClick = useCallback(() => {
    if (isSelectMode) {
      onSelect();
    } else {
      onClick();
    }
  }, [isSelectMode, onSelect, onClick]);

  // 缓存删除处理
  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  // 缓存样式计算
  const containerStyle = useMemo(() => ({
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
  }), [isActive, isSelectMode, isSelected]);

  // 缓存标题颜色
  const titleColor = useMemo(() => ({
    color: isActive && !isSelectMode ? 'var(--color-primary)' : 'var(--text-secondary)'
  }), [isActive, isSelectMode]);

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer conversation-item transition-colors"
      style={containerStyle}
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
            style={titleColor}
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
          onClick={handleDelete}
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}, areConversationItemPropsEqual);

// 自定义比较函数 - ConversationGroup
const areConversationGroupPropsEqual = (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.currentConversationId !== nextProps.currentConversationId) return false;
  if (prevProps.isSelectMode !== nextProps.isSelectMode) return false;
  if (prevProps.conversations.length !== nextProps.conversations.length) return false;
  if (prevProps.selectedConversations.length !== nextProps.selectedConversations.length) return false;

  // 检查选中的对话是否变化
  const prevSelected = new Set(prevProps.selectedConversations);
  const nextSelected = new Set(nextProps.selectedConversations);
  if (prevSelected.size !== nextSelected.size) return false;
  for (const id of prevSelected) {
    if (!nextSelected.has(id)) return false;
  }

  // 检查对话列表是否变化
  for (let i = 0; i < prevProps.conversations.length; i++) {
    const prevConv = prevProps.conversations[i];
    const nextConv = nextProps.conversations[i];
    if (prevConv.id !== nextConv.id || prevConv.title !== nextConv.title) {
      return false;
    }
  }

  return true;
};

// 对话分组组件 - 使用自定义比较函数
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
}, areConversationGroupPropsEqual);

// 批量操作栏组件
const BatchActionBar = memo(function BatchActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onBatchDelete
}) {
  const selectAllText = useMemo(() => {
    return selectedCount === totalCount ? '取消全选' : '全选';
  }, [selectedCount, totalCount]);

  return (
    <div
      className="flex items-center gap-2 px-2 py-2 mb-2 rounded-lg"
      style={{ background: 'var(--bg-primary)' }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        className="h-7 px-2 text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        {selectAllText}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={onBatchDelete}
        disabled={selectedCount === 0}
        className="h-7 w-7 p-0"
        style={{ background: 'var(--error)', color: 'white' }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
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
  // 缓存管理按钮点击处理
  const handleManageClick = useCallback(() => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedConversations([]);
    }
  }, [isSelectMode, setIsSelectMode, setSelectedConversations]);

  // 缓存新建对话点击处理
  const handleNewChat = useCallback(() => {
    onStartNewChat();
  }, [onStartNewChat]);

  // 缓存当前对话 ID
  const currentConversationId = useMemo(() => currentConversation?.id, [currentConversation?.id]);

  return (
    <div
      className="w-64 flex flex-col shrink-0 md:flex"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-primary)' }}
    >
      {/* 新建对话按钮 */}
      <div className="p-4">
        <Button
          onClick={handleNewChat}
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
          onClick={handleManageClick}
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
              <BatchActionBar
                selectedCount={selectedConversations.length}
                totalCount={conversations.length}
                onSelectAll={toggleSelectAll}
                onBatchDelete={onBatchDelete}
              />
            )}

            <ConversationGroup
              title="今天"
              conversations={groupedConversations.today}
              currentConversationId={currentConversationId}
              isSelectMode={isSelectMode}
              selectedConversations={selectedConversations}
              onToggleSelect={toggleSelectConversation}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />

            <ConversationGroup
              title="昨天"
              conversations={groupedConversations.yesterday}
              currentConversationId={currentConversationId}
              isSelectMode={isSelectMode}
              selectedConversations={selectedConversations}
              onToggleSelect={toggleSelectConversation}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />

            <ConversationGroup
              title="本周"
              conversations={groupedConversations.thisWeek}
              currentConversationId={currentConversationId}
              isSelectMode={isSelectMode}
              selectedConversations={selectedConversations}
              onToggleSelect={toggleSelectConversation}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />

            <ConversationGroup
              title="更早"
              conversations={groupedConversations.older}
              currentConversationId={currentConversationId}
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
export { ConversationItem };
