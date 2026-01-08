import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

// 辅助函数：按日期分组对话
const groupConversationsByDate = (conversations) => {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  };

  conversations.forEach(conv => {
    const date = new Date(conv.updated_date || conv.created_date);
    if (isToday(date)) {
      groups.today.push(conv);
    } else if (isYesterday(date)) {
      groups.yesterday.push(conv);
    } else if (isThisWeek(date)) {
      groups.thisWeek.push(conv);
    } else if (isThisMonth(date)) {
      groups.thisMonth.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
};

// 默认设置
const defaultSettings = {
  maxInputCharacters: 10000,
  chatBillingHint: '',
  showTokenUsageStats: false
};

export function useChatState() {
  const queryClient = useQueryClient();

  // 用户状态
  const [user, setUser] = useState(null);

  // 聊天状态
  const [selectedModel, setSelectedModel] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputMessage, setInputMessage] = useState('');

  // 选择模式
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);

  // 长文本警告
  const [longTextWarning, setLongTextWarning] = useState({
    open: false,
    estimatedTokens: 0,
    estimatedCredits: 0
  });

  // 文件上传
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileContents, setFileContents] = useState([]);

  // 标题编辑
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // 调试面板
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);

  // 导出状态
  const [isExporting, setIsExporting] = useState(false);
  const [canExport, setCanExport] = useState(false);

  // 设置
  const [settings, setSettings] = useState(defaultSettings);

  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoSentRef = useRef(false);  // 跟踪是否已经自动发送过

  // 获取用户信息
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setCanExport(userData?.membership_level !== 'free');
      } catch (e) {
        console.error('Failed to fetch user:', e);
      }
    };
    fetchUser();
  }, []);

  // 获取系统设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const allSettings = await base44.entities.SystemSettings.list();
        const settingsMap = {};
        allSettings.forEach(s => {
          settingsMap[s.setting_key] = s.setting_value;
        });

        setSettings({
          maxInputCharacters: parseInt(settingsMap.max_input_characters) || 10000,
          chatBillingHint: settingsMap.chat_billing_hint || '',
          showTokenUsageStats: settingsMap.show_token_usage_stats === 'true'
        });
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      }
    };
    fetchSettings();
  }, []);

  // 获取对话列表
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('[useChatState] Fetching conversations...');
      // 获取所有对话，然后在前端过滤掉已归档的
      const convs = await base44.entities.Conversation.list('-updated_date', 100);
      console.log('[useChatState] Fetched conversations:', convs.length);
      // 过滤：is_archived 不为 true 的对话（包括 false、undefined、null）
      const filtered = convs.filter(c => c.is_archived !== true);
      console.log('[useChatState] After filter:', filtered.length);
      return filtered;
    },
    staleTime: 5000,  // 缩短缓存时间以更快刷新
    refetchOnWindowFocus: true
  });

  // 获取模型列表
  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const modelList = await base44.entities.AIModel.filter({ is_active: true });
      return modelList;
    },
    staleTime: 60000
  });

  // 设置默认模型
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultModel = models.find(m => m.is_default) || models[0];
      setSelectedModel(defaultModel);
    }
  }, [models, selectedModel]);

  // 分组对话
  const groupedConversations = useMemo(() => {
    return groupConversationsByDate(conversations);
  }, [conversations]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 开始新对话
  const handleStartNewChat = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setInputMessage('');
    setUploadedFiles([]);
    setFileContents([]);
  }, []);

  // 选择对话
  const handleSelectConversation = useCallback(async (conv) => {
    setCurrentConversation(conv);
    setMessages(conv.messages || []);
    setEditingTitleValue(conv.title || '');
  }, []);

  // 删除对话
  const handleDeleteConversation = useCallback(async (convId) => {
    try {
      await base44.entities.Conversation.delete(convId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (currentConversation?.id === convId) {
        handleStartNewChat();
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  }, [currentConversation, handleStartNewChat, queryClient]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    try {
      await Promise.all(selectedConversations.map(id => 
        base44.entities.Conversation.delete(id)
      ));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversations([]);
      setIsSelectMode(false);
      if (selectedConversations.includes(currentConversation?.id)) {
        handleStartNewChat();
      }
    } catch (e) {
      console.error('Failed to batch delete:', e);
    }
  }, [selectedConversations, currentConversation, handleStartNewChat, queryClient]);

  // 切换选择对话
  const toggleSelectConversation = useCallback((convId) => {
    setSelectedConversations(prev => 
      prev.includes(convId) 
        ? prev.filter(id => id !== convId)
        : [...prev, convId]
    );
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedConversations.length === conversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(conversations.map(c => c.id));
    }
  }, [selectedConversations, conversations]);

  // 保存标题
  const handleSaveTitle = useCallback(async () => {
    if (!currentConversation || !editingTitleValue.trim()) return;
    try {
      await base44.entities.Conversation.update(currentConversation.id, {
        title: editingTitleValue.trim()
      });
      setCurrentConversation(prev => ({ ...prev, title: editingTitleValue.trim() }));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsEditingTitle(false);
    } catch (e) {
      console.error('Failed to save title:', e);
    }
  }, [currentConversation, editingTitleValue, queryClient]);

  // 发送消息
  const handleSendMessage = useCallback(async (skipWarning = false) => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage && fileContents.length === 0) return;
    if (isStreaming) return;

    // 估算 tokens
    const estimatedTokens = Math.ceil(trimmedMessage.length / 4);
    const estimatedCredits = Math.ceil(estimatedTokens / 1000) + Math.ceil(estimatedTokens / 5);

    // 长文本警告
    if (!skipWarning && estimatedTokens > 2000) {
      setLongTextWarning({
        open: true,
        estimatedTokens,
        estimatedCredits
      });
      return;
    }

    setIsStreaming(true);

    // 添加用户消息到界面
    const userMessage = {
      role: 'user',
      content: trimmedMessage,
      text: trimmedMessage,
      timestamp: new Date().toISOString(),
      attachments: uploadedFiles.map(f => ({ name: f.name, type: f.type }))
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      // 构建完整消息（包含文件内容）
      let fullMessage = trimmedMessage;
      if (fileContents.length > 0) {
        const fileTexts = fileContents.map(f => `[文件: ${f.name}]\n${f.content}`).join('\n\n');
        fullMessage = `${fileTexts}\n\n${trimmedMessage}`;
      }

      // 获取系统提示词（如果是使用模块）
      const urlParams = new URLSearchParams(window.location.search);
      const moduleId = urlParams.get('module_id');
      let systemPrompt = '';

      if (moduleId && messages.length === 0) {
        try {
          const modules = await base44.entities.PromptModule.filter({ id: moduleId });
          if (modules.length > 0) {
            systemPrompt = modules[0].system_prompt || '';
          }
        } catch (e) {
          console.error('Failed to fetch module:', e);
        }
      }

      // 调用 API
      const response = await base44.functions.invoke('smartChatWithSearch', {
        message: fullMessage,
        conversation_id: currentConversation?.id || null,
        system_prompt: systemPrompt
      });

      // 安全检查响应
      if (!response) {
        throw new Error('服务器无响应');
      }
      
      const responseData = response.data;
      if (!responseData) {
        throw new Error('服务器返回空数据');
      }
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      // 添加 AI 响应
      const assistantMessage = {
        role: 'assistant',
        content: responseData.response || '',
        timestamp: new Date().toISOString(),
        credits_used: responseData.credits_used,
        input_tokens: responseData.input_tokens,
        output_tokens: responseData.output_tokens
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 更新当前对话
      if (responseData.conversation_id) {
        const convId = responseData.conversation_id;
        if (!currentConversation) {
          // 新对话 - 创建本地对话对象并立即刷新列表
          const newConv = {
            id: convId,
            title: trimmedMessage.slice(0, 50),
            messages: [...messages, userMessage, assistantMessage],
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
            is_archived: false
          };
          setCurrentConversation(newConv);
          // 延迟后强制刷新对话列表，多次尝试确保数据同步
          setTimeout(() => {
            console.log('[useChatState] First refetch attempt...');
            refetchConversations();
          }, 500);
          setTimeout(() => {
            console.log('[useChatState] Second refetch attempt...');
            refetchConversations();
          }, 1500);
        } else {
          setCurrentConversation(prev => ({
            ...prev,
            messages: [...(prev?.messages || []), userMessage, assistantMessage]
          }));
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      }

      // 添加调试信息
      if (user?.role === 'admin') {
        setDebugInfo(prev => [...prev, {
          timestamp: new Date().toISOString(),
          message: trimmedMessage.slice(0, 50),
          model: responseData.model_used,
          inputTokens: responseData.input_tokens,
          outputTokens: responseData.output_tokens,
          creditsUsed: responseData.credits_used,
          taskClassification: responseData.task_classification,
          compressionUsed: responseData.compression_used,
          contextType: responseData.context_type
        }]);
      }

      // 清空文件
      setUploadedFiles([]);
      setFileContents([]);

    } catch (error) {
      console.error('Failed to send message:', error);
      // 添加错误消息
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `抱歉，发生错误：${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [inputMessage, fileContents, uploadedFiles, isStreaming, currentConversation, messages, user, queryClient]);

  // 键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(false);
    }
  }, [handleSendMessage]);

  // 确认长文本发送
  const handleConfirmLongText = useCallback(() => {
    setLongTextWarning({ open: false, estimatedTokens: 0, estimatedCredits: 0 });
    handleSendMessage(true);
  }, [handleSendMessage]);

  // 文件选择
  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const newFiles = files.map(f => ({
      name: f.name,
      type: f.type,
      status: 'extracting',
      file: f
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 上传文件
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // 提取内容
        if (file.type.startsWith('image/')) {
          // 图片直接使用 URL
          setFileContents(prev => [...prev, {
            name: file.name,
            type: 'image',
            url: file_url
          }]);
        } else {
          // 文档提取文本
          try {
            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
              file_url,
              json_schema: {
                type: 'object',
                properties: {
                  content: { type: 'string' }
                }
              }
            });

            if (result.status === 'success') {
              setFileContents(prev => [...prev, {
                name: file.name,
                type: 'text',
                content: result.output?.content || ''
              }]);
            }
          } catch (extractError) {
            console.error('Extract error:', extractError);
          }
        }

        // 更新状态
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === uploadedFiles.length + i 
            ? { ...f, status: 'ready' }
            : f
        ));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => prev.map(f => 
        f.status === 'extracting' ? { ...f, status: 'error', error: error.message } : f
      ));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [uploadedFiles.length]);

  // 移除已上传文件
  const removeUploadedFile = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 导出对话
  const handleExportConversation = useCallback(async () => {
    if (!currentConversation || !canExport) return;

    setIsExporting(true);
    try {
      const exportData = {
        title: currentConversation.title,
        created_date: currentConversation.created_date,
        messages: currentConversation.messages || messages
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${currentConversation.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [currentConversation, messages, canExport]);

  // 处理功能广场模块的自动发送
  useEffect(() => {
    // 如果已经自动发送过，直接返回
    if (autoSentRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const moduleId = urlParams.get('module_id');
    const autoStart = urlParams.get('auto_start');

    // 只有当 auto_start=true、有 moduleId、没有当前对话、且消息为空时才自动发送
    if (autoStart === 'true' && moduleId && !currentConversation && messages.length === 0 && !isStreaming) {
      autoSentRef.current = true;  // 标记已经触发过

      const autoSendMessage = async () => {
        try {
          const modules = await base44.entities.PromptModule.filter({ id: moduleId });
          if (modules.length > 0) {
            const module = modules[0];
            const userPrompt = module.user_prompt_template || '';

            // 清除 URL 中的 auto_start 参数，避免重复触发
            const newUrl = window.location.pathname + '?module_id=' + moduleId;
            window.history.replaceState({}, '', newUrl);

            // 如果有用户提示词模板，自动填充并发送
            if (userPrompt && userPrompt.trim()) {
              setInputMessage(userPrompt);

              // 使用 setTimeout 确保 inputMessage 更新后再发送
              setTimeout(() => {
                // 创建用户消息
                const userMessage = {
                  role: 'user',
                  content: userPrompt,
                  timestamp: new Date().toISOString()
                };

                setMessages([userMessage]);
                setInputMessage('');
                setIsStreaming(true);

                // 调用 API
                base44.functions.invoke('smartChatWithSearch', {
                  message: userPrompt,
                  conversation_id: null,
                  system_prompt: module.system_prompt || ''
                }).then(response => {
                  const responseData = response.data;
                  if (responseData && !responseData.error) {
                    const assistantMessage = {
                      role: 'assistant',
                      content: responseData.response || '',
                      timestamp: new Date().toISOString(),
                      credits_used: responseData.credits_used,
                      input_tokens: responseData.input_tokens,
                      output_tokens: responseData.output_tokens
                    };

                    setMessages(prev => [...prev, assistantMessage]);

                    // 更新对话
                    if (responseData.conversation_id) {
                      const newConv = {
                        id: responseData.conversation_id,
                        title: userPrompt.slice(0, 50),
                        messages: [userMessage, assistantMessage],
                        created_date: new Date().toISOString(),
                        updated_date: new Date().toISOString(),
                        is_archived: false
                      };
                      setCurrentConversation(newConv);
                      // 延迟后强制刷新对话列表
                      setTimeout(() => {
                        refetchConversations();
                      }, 800);
                    }
                  }
                }).catch(error => {
                  console.error('Auto-send failed:', error);
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `抱歉，发送失败：${error.message}`,
                    timestamp: new Date().toISOString(),
                    isError: true
                  }]);
                }).finally(() => {
                  setIsStreaming(false);
                });
              }, 100);
            }
          }
        } catch (e) {
          console.error('Failed to auto-send message:', e);
        }
      };

      autoSendMessage();
    }
  }, [messages.length, currentConversation, isStreaming, queryClient]);

  return {
    // 状态
    user,
    selectedModel,
    currentConversation,
    messages,
    isStreaming,
    inputMessage,
    setInputMessage,
    isSelectMode,
    setIsSelectMode,
    selectedConversations,
    setSelectedConversations,
    longTextWarning,
    setLongTextWarning,
    uploadedFiles,
    isUploading,
    fileContents,
    isEditingTitle,
    setIsEditingTitle,
    editingTitleValue,
    setEditingTitleValue,
    showDebugPanel,
    setShowDebugPanel,
    debugInfo,
    setDebugInfo,
    isExporting,
    canExport,

    // Refs
    messagesEndRef,
    textareaRef,
    fileInputRef,

    // 数据
    conversations,
    groupedConversations,
    settings,

    // 操作函数
    handleStartNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleBatchDelete,
    toggleSelectConversation,
    toggleSelectAll,
    handleSaveTitle,
    handleSendMessage,
    handleKeyDown,
    handleConfirmLongText,
    handleFileSelect,
    removeUploadedFile,
    handleExportConversation,
  };
}