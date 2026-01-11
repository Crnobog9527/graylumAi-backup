import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isToday, isYesterday, differenceInDays } from 'date-fns';
import { chatAPI } from '@/utils/chatAPI';
import { batchDeleteConversations } from '@/utils/batchRequest';

// 估算token数量 (约4字符=1token)
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function useChatState() {
  // ============ 状态 ============
  const [user, setUser] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [longTextWarning, setLongTextWarning] = useState({ open: false, estimatedCredits: 0, estimatedTokens: 0 });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileContents, setFileContents] = useState([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [canExport, setCanExport] = useState(false);

  // ============ Refs ============
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const processedModuleRef = useRef(null);
  // 【修复 Bug 2】使用 ref 追踪当前对话，避免 React 状态异步更新导致的串联问题
  const currentConversationRef = useRef(null);
  // 【修复 Bug 3】追踪待自动发送的消息，避免 setTimeout 竞态条件
  const pendingAutoSendRef = useRef(null);
  // 【修复对话隔离】追踪当前选中的模块，避免 React 状态异步更新导致系统提示词串联
  const selectedModuleRef = useRef(null);

  const queryClient = useQueryClient();
  const location = useLocation();

  // ============ 加载用户数据 ============
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // 检查导出权限
        const userTier = userData.subscription_tier || 'free';
        const plans = await base44.entities.MembershipPlan.filter({ is_active: true });
        const plan = plans.find(p => p.level === userTier);
        setCanExport(plan?.can_export_conversations || false);
      } catch (e) {
        // 未登录用户由Layout处理重定向到Landing页面
      }
    };
    loadUser();
  }, []);

  // ============ 数据查询 ============
  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['promptModules'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }, 'sort_order'),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: async () => {
      // 【重构】使用 owner_email 查询对话列表
      // 不再依赖系统 created_by 字段，避免 RLS 和客户端不一致问题
      console.log('[conversations] 查询参数 owner_email:', user?.email);

      const result = await base44.entities.Conversation.filter(
        { owner_email: user?.email, is_archived: false },
        '-updated_date'
      );

      console.log('[conversations] 查询返回数量:', result?.length || 0);
      return result;
    },
    enabled: !!user?.email,
  });

  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  // ============ 系统设置解析 ============
  const getSettingValue = useCallback((key, defaultValue) => {
    const setting = systemSettings.find(s => s.setting_key === key);
    return setting ? setting.setting_value : defaultValue;
  }, [systemSettings]);

  const settings = useMemo(() => ({
    longTextWarningEnabled: getSettingValue('enable_long_text_warning', 'true') === 'true',
    longTextThreshold: parseInt(getSettingValue('long_text_warning_threshold', '5000')) || 5000,
    showModelSelector: getSettingValue('chat_show_model_selector', 'true') === 'true',
    maxInputCharacters: parseInt(getSettingValue('max_input_characters', '2000')) || 2000,
    showTokenUsageStats: getSettingValue('show_token_usage_stats', 'true') === 'true',
    chatBillingHint: getSettingValue('chat_billing_hint', ''),
  }), [getSettingValue]);

  // ============ 初始化模型 ============
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  // ============ 滚动到底部 ============
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============ 自动调整输入框高度 ============
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  // ============ Mutations ============
  const createConversationMutation = useMutation({
    mutationFn: (data) => base44.entities.Conversation.create(data),
    onSuccess: (newConv) => {
      setCurrentConversation(newConv);
      queryClient.invalidateQueries(['conversations']);
      // 清除对话列表缓存以获取最新数据
      chatAPI.invalidateConversationList(user?.email);
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conversation.update(id, data),
    onSuccess: (updatedConv) => {
      if (currentConversation?.id === updatedConv.id) {
        setCurrentConversation(updatedConv);
      }
      queryClient.invalidateQueries(['conversations']);
      // 清除更新对话的缓存
      chatAPI.invalidateConversation(updatedConv.id);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id) => base44.entities.Conversation.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries(['conversations']);
      // 清除已删除对话的缓存
      chatAPI.invalidateConversation(deletedId);
      chatAPI.invalidateConversationList(user?.email);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => setUser(prev => ({ ...prev, ...data })),
  });

  // ============ 对话操作 ============
  const handleDeleteConversation = useCallback(async (convId) => {
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    await deleteConversationMutation.mutateAsync(convId);
  }, [currentConversation, deleteConversationMutation]);

  const handleBatchDelete = useCallback(async () => {
    // 如果当前对话在删除列表中，先清空
    if (selectedConversations.includes(currentConversation?.id)) {
      setCurrentConversation(null);
      setMessages([]);
    }

    // 使用批量删除优化
    const { succeeded, failed } = await batchDeleteConversations(
      selectedConversations,
      (id) => base44.entities.Conversation.delete(id)
    );

    // 清除已删除对话的缓存
    for (const id of succeeded) {
      chatAPI.invalidateConversation(id);
    }

    if (failed.length > 0) {
      console.error('部分对话删除失败:', failed);
    }

    setSelectedConversations([]);
    setIsSelectMode(false);
    queryClient.invalidateQueries(['conversations']);
    chatAPI.invalidateConversationList(user?.email);
  }, [selectedConversations, currentConversation, queryClient, user?.email]);

  const toggleSelectConversation = useCallback((convId) => {
    setSelectedConversations(prev =>
      prev.includes(convId)
        ? prev.filter(id => id !== convId)
        : [...prev, convId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedConversations.length === conversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(conversations.map(c => c.id));
    }
  }, [selectedConversations.length, conversations]);

  // ============ URL参数处理 ============
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module_id');
    const autoStart = params.get('auto_start') === 'true';

    // 【诊断日志 Bug 3】URL 参数处理
    console.log('[DEBUG-BUG3] ========== URL 参数处理 useEffect 触发 ==========');
    console.log('[DEBUG-BUG3] location.search:', location.search);
    console.log('[DEBUG-BUG3] moduleId:', moduleId);
    console.log('[DEBUG-BUG3] autoStart:', autoStart);
    console.log('[DEBUG-BUG3] processedModuleRef.current:', processedModuleRef.current);
    console.log('[DEBUG-BUG3] promptModules.length:', promptModules.length);
    console.log('[DEBUG-BUG3] models.length:', models.length);
    console.log('[DEBUG-BUG3] user:', user?.email);

    if (moduleId && moduleId !== processedModuleRef.current && promptModules.length > 0 && models.length > 0 && user) {
      const module = promptModules.find(m => m.id === moduleId);
      console.log('[DEBUG-BUG3] 找到模块:', module?.id, module?.title);
      console.log('[DEBUG-BUG3] module.user_prompt_template:', module?.user_prompt_template?.slice(0, 50) || 'undefined');

      if (module) {
        processedModuleRef.current = moduleId;
        handleStartNewChat(module);
        window.history.replaceState({}, '', createPageUrl('Chat'));

        // 【修复 Bug 3】设置待自动发送的消息，由下一个 useEffect 处理
        if (autoStart && module.user_prompt_template && module.user_prompt_template.trim()) {
          console.log('[DEBUG-BUG3] ✓ 设置 pendingAutoSendRef');
          pendingAutoSendRef.current = {
            message: module.user_prompt_template,
            systemPrompt: module.system_prompt || '',
            moduleId: module.id,
          };
          console.log('[DEBUG-BUG3] pendingAutoSendRef.current:', JSON.stringify({ message: pendingAutoSendRef.current.message.slice(0, 50), moduleId: pendingAutoSendRef.current.moduleId }));
        } else {
          console.log('[DEBUG-BUG3] ✗ 未设置 pendingAutoSendRef');
          console.log('[DEBUG-BUG3]   autoStart:', autoStart);
          console.log('[DEBUG-BUG3]   user_prompt_template 存在:', !!module.user_prompt_template);
        }
      }
    } else {
      console.log('[DEBUG-BUG3] ✗ 条件不满足，跳过处理');
    }
    console.log('[DEBUG-BUG3] ====================================================');
  }, [location.search, promptModules, models, user]);

  // 【修复 Bug 3】自动发送状态
  const [autoSendPending, setAutoSendPending] = useState(false);

  // 【修复 Bug 3】处理待自动发送的消息 - 第一步：设置输入消息
  useEffect(() => {
    // 【诊断日志 Bug 3】第一阶段 useEffect
    console.log('[DEBUG-BUG3] ========== 第一阶段 useEffect 触发 ==========');
    console.log('[DEBUG-BUG3] 条件检查:');
    console.log('[DEBUG-BUG3]   1. pendingAutoSendRef.current:', !!pendingAutoSendRef.current);
    console.log('[DEBUG-BUG3]   2. selectedModule:', !!selectedModule, selectedModule?.id);
    console.log('[DEBUG-BUG3]   3. !currentConversationRef.current:', !currentConversationRef.current);
    console.log('[DEBUG-BUG3]   4. messages.length === 0:', messages.length === 0, `(实际: ${messages.length})`);
    console.log('[DEBUG-BUG3]   5. !isStreaming:', !isStreaming);
    console.log('[DEBUG-BUG3]   6. selectedModel:', !!selectedModel, selectedModel?.name);

    const allConditionsMet = pendingAutoSendRef.current &&
      selectedModule &&
      !currentConversationRef.current &&
      messages.length === 0 &&
      !isStreaming &&
      selectedModel;

    console.log('[DEBUG-BUG3] 所有条件满足:', allConditionsMet);

    if (allConditionsMet) {
      const pending = pendingAutoSendRef.current;
      pendingAutoSendRef.current = null;

      console.log('[DEBUG-BUG3] ✓ 执行第一阶段: 设置 inputMessage 和 autoSendPending');
      console.log('[DEBUG-BUG3] pending.message:', pending.message.slice(0, 50) + '...');

      // 设置输入消息
      setInputMessage(pending.message);
      // 标记需要自动发送
      setAutoSendPending(true);
    } else {
      console.log('[DEBUG-BUG3] ✗ 条件不满足，跳过第一阶段');
    }
    console.log('[DEBUG-BUG3] ====================================================');
  }, [selectedModule, messages.length, isStreaming, selectedModel]);

  // ============ 标题编辑 ============
  const handleSaveTitle = useCallback(async () => {
    if (!currentConversation || !editingTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    await updateConversationMutation.mutateAsync({
      id: currentConversation.id,
      data: { title: editingTitleValue.trim() }
    });
    setIsEditingTitle(false);
  }, [currentConversation, editingTitleValue, updateConversationMutation]);

  const handleStartNewChat = useCallback((module = null) => {
    console.log('[handleStartNewChat] module:', module?.id, module?.title);

    // 【修复】同步更新 ref，确保状态立即生效
    currentConversationRef.current = null;
    selectedModuleRef.current = module || null;  // 同步更新模块 ref

    setCurrentConversation(null);
    setMessages([]);
    setSelectedModule(module || null);
    setIsEditingTitle(false);

    if (module?.model_id && models.length > 0) {
      const moduleModel = models.find(m => m.id === module.model_id);
      if (moduleModel) {
        setSelectedModel(moduleModel);
      }
    }
  }, [models]);

  const handleSelectConversation = useCallback(async (conv) => {
    try {
      // 使用带缓存的 API 获取对话
      const freshConv = await chatAPI.getConversationHistory(conv.id);
      // 同步更新 ref
      currentConversationRef.current = freshConv;
      selectedModuleRef.current = null;  // 切换对话时清空模块
      setCurrentConversation(freshConv);
      setMessages(freshConv.messages || []);
      setSelectedModule(null);
      if (freshConv.model_id) {
        const model = models.find(m => m.id === freshConv.model_id);
        if (model) setSelectedModel(model);
      }
    } catch (e) {
      console.error('对话加载失败:', e);
      currentConversationRef.current = null;
      selectedModuleRef.current = null;
      setCurrentConversation(null);
      setMessages([]);
      chatAPI.invalidateConversation(conv.id);
      queryClient.invalidateQueries(['conversations']);
      alert('该对话已被删除或不存在');
    }
  }, [models, queryClient]);

  // ============ 发送消息 ============
  const handleSendMessage = useCallback(async (skipWarning = false) => {
    // 【诊断日志 Bug 2】发送消息入口
    console.log('[DEBUG-BUG2] ========== handleSendMessage 被调用 ==========');
    console.log('[DEBUG-BUG2] currentConversationRef.current:', currentConversationRef.current?.id);
    console.log('[DEBUG-BUG2] currentConversation (state):', currentConversation?.id);
    console.log('[DEBUG-BUG2] selectedModule:', selectedModule?.id, selectedModule?.title);
    console.log('[DEBUG-BUG2] messages.length:', messages.length);

    if ((!inputMessage.trim() && fileContents.length === 0) || !selectedModel || !user || isStreaming) return;

    const currentCredits = user.credits || 0;

    if (currentCredits < 1) {
      alert('积分不足，请充值后继续使用。');
      return;
    }

    let systemPrompt = '';
    const isFirstTurn = messages.length === 0;
    // 【修复对话隔离】使用 ref 判断模块，避免 React 状态异步问题
    const currentModule = selectedModuleRef.current;
    const hasModule = currentModule !== null && currentModule !== undefined;
    const isNewConversation = !currentConversationRef.current;

    console.log('[handleSendMessage] hasModule:', hasModule, 'isFirstTurn:', isFirstTurn, 'isNewConversation:', isNewConversation);

    if (hasModule && isFirstTurn && isNewConversation) {
      systemPrompt = `【重要约束】你现在是"${currentModule.title}"专用助手。
  ${currentModule.system_prompt}

  【行为规范】
  1. 你必须严格遵循上述角色定位和功能约束
  2. 如果用户的问题超出此模块范围，请礼貌引导用户使用正确的功能模块
  3. 保持专业、专注，不要偏离主题`;
      console.log('[handleSendMessage] 发送系统提示词, 长度:', systemPrompt.length);
    }

    const attachments = await Promise.all(fileContents.map(async (f, idx) => {
      const file = uploadedFiles[idx];
      return {
        fileName: f.file_name,
        fileType: file?.type || f.media_type,
        fileSize: file?.size,
        contentType: f.content_type,
        content: f.content,
        mediaType: f.media_type,
        truncated: f.truncated,
        preview: f.content_type === 'text' ? f.content?.slice(0, 500) : null
      };
    }));

    const fileTextContent = fileContents
      .filter(f => f.content_type === 'text')
      .map(f => f.content)
      .join('');
    const allContent = systemPrompt + messages.map(m => m.content || m.text).join('') + inputMessage + fileTextContent;
    const estimatedInputTokens = estimateTokens(allContent);

    if (!skipWarning && settings.longTextWarningEnabled && estimatedInputTokens > settings.longTextThreshold) {
      const estimatedOutputTokens = Math.min(estimatedInputTokens * 0.5, 4000);
      const inputCost = estimatedInputTokens / 1000;
      const outputCost = estimatedOutputTokens / 200;
      const totalEstimatedCredits = Math.ceil(inputCost + outputCost);

      setLongTextWarning({
        open: true,
        estimatedCredits: totalEstimatedCredits,
        estimatedTokens: estimatedInputTokens
      });
      return;
    }

    const userMessage = {
      role: 'user',
      content: inputMessage,
      text: inputMessage,
      attachments: attachments,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setUploadedFiles([]);
    setFileContents([]);
    setIsStreaming(true);

    try {
      let messageToSend = inputMessage;
      const hasTextFiles = attachments.some(a => a.contentType === 'text');
      const hasImageFiles = attachments.some(a => a.contentType === 'image');

      if (hasTextFiles) {
        const textParts = attachments
          .filter(a => a.contentType === 'text')
          .map(a => `[用户上传的文件: ${a.fileName}]\n\n${a.content}${a.truncated ? '\n\n⚠️ 文件过大，已截取前半部分' : ''}`)
          .join('\n\n---\n\n');

        messageToSend = `${textParts}\n\n[用户的问题]\n${inputMessage}`;
      }

      let imageFiles = null;
      if (hasImageFiles) {
        imageFiles = attachments
          .filter(a => a.contentType === 'image')
          .map(a => ({
            file_name: a.fileName,
            media_type: a.mediaType,
            base64: a.content
          }));
      }

      // 【修复 Bug 2】使用 ref 获取 conversationId，确保获取到同步更新后的值
      // 使用 chatAPI 发送消息（自动去重防止重复请求）
      const { data: result } = await chatAPI.sendMessage({
        conversationId: currentConversationRef.current?.id,
        message: messageToSend,
        systemPrompt: systemPrompt || undefined,
        imageFiles: imageFiles
      });

      if (result.error) {
        throw new Error(result.error);
      }
      const response = result.response;

      // 【重要】使用后端返回的 conversation_id，而不是前端自己创建
      const backendConversationId = result.conversation_id;

      const creditsUsed = result.credits_used || 0;
      const inputTokens = result.input_tokens || 0;
      const outputTokens = result.output_tokens || 0;
      const pendingCredits = result.pending_credits || 0;

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        credits_used: creditsUsed,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      if (user.role === 'admin') {
        setDebugInfo(prev => [...prev, {
          timestamp: new Date().toISOString(),
          message: inputMessage.slice(0, 50) + '...',
          model: result.model_used || selectedModel.name,
          task_type: result.task_classification?.task_type,
          model_tier: result.task_classification?.recommended_model_tier,
          input_tokens: result.input_tokens,
          output_tokens: result.output_tokens,
          compression_used: result.compression_used || false,
          total_messages: updatedMessages.length,
          context_type: result.context_type || '完整历史',
          compression_info: result.compression_info || null
        }]);
      }

      const newBalance = currentCredits - creditsUsed;
      await updateUserMutation.mutateAsync({
        credits: newBalance,
        pending_credits: pendingCredits,
        total_credits_used: (user.total_credits_used || 0) + creditsUsed,
      });

      // 【修复】使用后端返回的 conversation_id 来同步对话状态
      // 后端已经创建/更新了对话，前端只需要同步状态即可
      // 【诊断日志 Bug 1】对话同步
      console.log('[DEBUG-BUG1] ========== 对话同步开始 ==========');
      console.log('[DEBUG-BUG1] backendConversationId:', backendConversationId);
      console.log('[DEBUG-BUG1] user?.email:', user?.email);
      console.log('[DEBUG-BUG1] currentConversationRef.current:', currentConversationRef.current?.id);

      if (backendConversationId) {
        // 【修复 Bug 2】使用 ref 判断是否为现有对话
        if (currentConversationRef.current) {
          console.log('[DEBUG-BUG1] 更新现有对话');
          // 更新现有对话 - 只需刷新前端状态
          const updatedConv = {
            ...currentConversationRef.current,
            messages: updatedMessages,
            total_credits_used: (currentConversationRef.current?.total_credits_used || 0) + creditsUsed,
          };
          // 【修复 Bug 2】同步更新 ref
          currentConversationRef.current = updatedConv;
          setCurrentConversation(updatedConv);
        } else {
          console.log('[conversations] 创建新对话前端状态');
          // 新对话 - 使用后端返回的 ID 创建前端状态
          const title = inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '');
          const newConv = {
            id: backendConversationId,
            title,
            model_id: selectedModel.id,
            prompt_module_id: selectedModule?.id,
            messages: updatedMessages,
            total_credits_used: creditsUsed,
            owner_email: user?.email,  // 【重构】使用 owner_email 替代 created_by
            is_archived: false,
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
          };
          console.log('[conversations] 新对话数据:', JSON.stringify({ id: newConv.id, title: newConv.title, owner_email: newConv.owner_email }));
          // 【修复 Bug 2】同步更新 ref
          currentConversationRef.current = newConv;
          setCurrentConversation(newConv);
        }

        // 刷新对话列表
        chatAPI.invalidateConversationList(user?.email);
        chatAPI.invalidateConversation(backendConversationId);

        await queryClient.refetchQueries({
          queryKey: ['conversations', user?.email],
          exact: true,
        });

        const cacheDataAfter = queryClient.getQueryData(['conversations', user?.email]);
        console.log('[conversations] 刷新后数量:', cacheDataAfter?.length || 0);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [inputMessage, fileContents, uploadedFiles, selectedModel, user, isStreaming, messages, selectedModule, currentConversation, settings, updateUserMutation, updateConversationMutation, createConversationMutation]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(false);
    }
  }, [handleSendMessage]);

  // 【修复 Bug 3】处理待自动发送的消息 - 第二步：触发发送
  useEffect(() => {
    // 【诊断日志 Bug 3】第二阶段 useEffect
    console.log('[DEBUG-BUG3] ========== 第二阶段 useEffect 触发 ==========');
    console.log('[DEBUG-BUG3] autoSendPending:', autoSendPending);
    console.log('[DEBUG-BUG3] inputMessage:', inputMessage ? inputMessage.slice(0, 30) + '...' : 'empty');
    console.log('[DEBUG-BUG3] isStreaming:', isStreaming);
    console.log('[DEBUG-BUG3] 条件满足 (autoSendPending && inputMessage && !isStreaming):', autoSendPending && inputMessage && !isStreaming);

    if (autoSendPending && inputMessage && !isStreaming) {
      console.log('[DEBUG-BUG3] ✓ 执行第二阶段: 调用 handleSendMessage(true)');
      setAutoSendPending(false);
      // 延迟一帧确保状态已更新
      requestAnimationFrame(() => {
        console.log('[DEBUG-BUG3] requestAnimationFrame 执行，调用 handleSendMessage');
        handleSendMessage(true); // skipWarning = true，跳过长文本警告
      });
    } else {
      console.log('[DEBUG-BUG3] ✗ 条件不满足，跳过第二阶段');
    }
    console.log('[DEBUG-BUG3] ====================================================');
  }, [autoSendPending, inputMessage, isStreaming, handleSendMessage]);

  const handleConfirmLongText = useCallback(() => {
    setLongTextWarning({ open: false, estimatedCredits: 0, estimatedTokens: 0 });
    handleSendMessage(true);
  }, [handleSendMessage]);

  // ============ 文件处理 ============
  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url, type: file.type, status: 'extracting' };
      });
      const uploaded = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploaded]);

      const extractPromises = uploaded.map(async (file) => {
        try {
          const { data } = await base44.functions.invoke('extractFileContent', {
            file_url: file.url,
            file_name: file.name,
            file_type: file.type
          });

          if (data.success) {
            setUploadedFiles(prev => prev.map((f) =>
              f.url === file.url ? { ...f, status: 'ready' } : f
            ));

            return {
              file_name: data.file_name,
              content_type: data.content_type,
              content: data.content,
              media_type: data.media_type,
              truncated: data.truncated
            };
          } else {
            throw new Error(data.error || 'Failed to extract content');
          }
        } catch (error) {
          console.error('文件内容提取失败:', error);
          setUploadedFiles(prev => prev.map((f) =>
            f.url === file.url ? { ...f, status: 'error', error: error.message } : f
          ));
          return null;
        }
      });

      const contents = await Promise.all(extractPromises);
      setFileContents(prev => [...prev, ...contents.filter(c => c !== null)]);

    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const removeUploadedFile = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ============ 导出对话 ============
  const handleExportConversation = useCallback(async () => {
    if (!currentConversation) {
      alert('请先选择一个对话');
      return;
    }

    setIsExporting(true);
    try {
      const { data } = await base44.functions.invoke('exportConversations', {
        conversation_ids: [currentConversation.id],
        format: 'markdown'
      });

      const blob = new Blob([data], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const { format } = await import('date-fns');
      a.download = `${currentConversation.title || '对话记录'}_${format(new Date(), 'yyyyMMdd_HHmm')}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      const errorData = error.response?.data || {};
      if (errorData.upgrade_required) {
        alert('您当前的会员等级不支持导出功能，请升级会员');
      } else {
        alert('导出失败: ' + (errorData.error || error.message));
      }
    } finally {
      setIsExporting(false);
    }
  }, [currentConversation]);

  // ============ 分组对话 ============
  const groupedConversations = useMemo(() => {
    const groups = { today: [], yesterday: [], thisWeek: [], older: [] };
    conversations.forEach(conv => {
      const date = new Date(conv.updated_date || conv.created_date);
      if (isToday(date)) {
        groups.today.push(conv);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conv);
      } else if (differenceInDays(new Date(), date) <= 7) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });
    return groups;
  }, [conversations]);

  return {
    // 状态
    user,
    selectedModel,
    setSelectedModel,
    selectedModule,
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
    models,
    promptModules,
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
