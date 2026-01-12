import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ========== 简化的双模型路由策略 ==========
// 原则：宁可多用 Sonnet 保证质量，也不要因误判用 Haiku 导致体验下降

// 模型 ID 映射
const MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',  // 默认主力模型（99% 场景）
  haiku: 'claude-haiku-4-5-20251001'     // 仅用于极简单场景（1% 场景）
};

// 简单确认词列表（仅这些场景使用 Haiku）
const SIMPLE_CONFIRMATIONS = [
  '好的', '好', '是的', '是', '知道了', '明白了', '收到', '谢谢', '谢了', '嗯', '啊',
  'ok', 'okay', 'yes', 'yeah', 'yep', 'sure', 'got it', 'thanks', 'thank you', 'thx'
];

// 内部任务关键词（摘要等后台任务）
const INTERNAL_TASK_KEYWORDS = ['summarize', 'compress', 'extract', 'classify'];

/**
 * 简化的模型选择函数
 * @param message - 用户消息内容
 * @param conversationTurns - 对话轮次（完整往返次数）
 * @param isInternalTask - 是否为内部任务（摘要、压缩等）
 * @returns 选择的模型 ID
 */
const selectModel = (message: string, conversationTurns: number, isInternalTask: boolean = false): string => {
  // 规则 1: 内部摘要/压缩任务用 Haiku（用户不可见，只需要提取信息）
  if (isInternalTask) {
    const lowerMessage = message.toLowerCase();
    const isInternalOp = INTERNAL_TASK_KEYWORDS.some(kw => lowerMessage.includes(kw));
    if (isInternalOp) {
      console.log('[taskClassifier] Internal task detected, using Haiku');
      return MODELS.haiku;
    }
  }

  // 规则 2: 多轮对话（>=3 轮）永远用 Sonnet 保持稳定性和上下文理解
  if (conversationTurns >= 3) {
    console.log(`[taskClassifier] Multi-turn conversation (${conversationTurns} turns), using Sonnet for stability`);
    return MODELS.sonnet;
  }

  const trimmedMessage = message.trim();
  const lowerMessage = trimmedMessage.toLowerCase();

  // 规则 3: 消息太短且是纯确认词 -> Haiku（极少数场景）
  if (trimmedMessage.length < 10) {
    const isSimpleConfirmation = SIMPLE_CONFIRMATIONS.some(word =>
      lowerMessage === word || lowerMessage === word + '。' || lowerMessage === word + '!'
    );

    if (isSimpleConfirmation) {
      console.log('[taskClassifier] Simple confirmation word, using Haiku');
      return MODELS.haiku;
    }
  }

  // 规则 4: 其他所有情况默认用 Sonnet（保证质量）
  // 包括：首轮对话、需要理解上下文、需要遵循系统提示词、正常问答等
  console.log('[taskClassifier] Default to Sonnet for quality assurance');
  return MODELS.sonnet;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversation_id, is_internal_task } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // 获取会话上下文（计算对话轮次）
    let conversationTurns = 0;

    if (conversation_id) {
      try {
        // 【修复】使用 .get() 方法按 ID 获取对话
        const conversation = await base44.asServiceRole.entities.Conversation.get(conversation_id);
        if (conversation) {
          const messages = conversation.messages || [];
          conversationTurns = Math.floor(messages.length / 2); // 一问一答 = 1 轮
        }
      } catch (e) {
        console.log('[taskClassifier] Failed to load conversation:', e.message);
      }
    }

    // 执行模型选择
    const selectedModelId = selectModel(message, conversationTurns, is_internal_task || false);
    const modelType = selectedModelId === MODELS.haiku ? 'haiku' : 'sonnet';

    // 构建响应
    const response = {
      task_type: 'dialogue',  // 简化：所有任务统一为 dialogue
      recommended_model: modelType,
      model_id: selectedModelId,
      conversation_turns: conversationTurns,
      message_length: message.length,
      reason: `Model: ${modelType}, Turns: ${conversationTurns}, Length: ${message.length}`,
      // 保持向后兼容的字段
      complexity_score: conversationTurns >= 3 ? 5 : 1,
      confidence: 0.95,
      should_update_session_task_type: false,  // 简化：不再维护 session_task_type
      is_continuation: false,
      inherited_from_session: false
    };

    // 详细日志
    console.log('[taskClassifier] ===== MODEL SELECTION =====');
    console.log('[taskClassifier] Message preview:', message.substring(0, 50) + (message.length > 50 ? '...' : ''));
    console.log('[taskClassifier] Conversation turns:', conversationTurns);
    console.log('[taskClassifier] Message length:', message.length);
    console.log('[taskClassifier] Is internal task:', is_internal_task || false);
    console.log('[taskClassifier] Selected model:', modelType, `(${selectedModelId})`);
    console.log('[taskClassifier] ================================');

    return Response.json(response);

  } catch (error) {
    console.error('[taskClassifier] Error:', error);

    // 出错时默认使用 Sonnet（保证质量）
    return Response.json({
      task_type: 'dialogue',
      recommended_model: 'sonnet',
      model_id: MODELS.sonnet,
      error: error.message,
      reason: 'Error occurred, defaulting to Sonnet for safety'
    });
  }
});
