import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 任务类型定义
const TASK_TYPES = {
  // Haiku 适用 - 轻量级任务
  SUMMARIZATION: 'summarization',
  INTENT_DETECTION: 'intent_detection',
  KEYWORD_EXTRACTION: 'keyword_extraction',
  SIMPLE_QA: 'simple_qa',
  
  // Sonnet 适用 - 标准任务（默认）
  CONTENT_CREATION: 'content_creation',
  DIALOGUE: 'dialogue',
  EDITING: 'editing',
  TRANSLATION: 'translation',
  
  // Opus 适用 - 复杂任务
  COMPLEX_ANALYSIS: 'complex_analysis',
  PROFESSIONAL_WRITING: 'professional_writing',
  CODE_GENERATION: 'code_generation',
  RESEARCH: 'research'
};

// 模型映射
const TASK_TO_MODEL_TIER = {
  [TASK_TYPES.SUMMARIZATION]: 'haiku',
  [TASK_TYPES.INTENT_DETECTION]: 'haiku',
  [TASK_TYPES.KEYWORD_EXTRACTION]: 'haiku',
  [TASK_TYPES.SIMPLE_QA]: 'haiku',
  
  [TASK_TYPES.CONTENT_CREATION]: 'sonnet',
  [TASK_TYPES.DIALOGUE]: 'sonnet',
  [TASK_TYPES.EDITING]: 'sonnet',
  [TASK_TYPES.TRANSLATION]: 'sonnet',
  
  [TASK_TYPES.COMPLEX_ANALYSIS]: 'opus',
  [TASK_TYPES.PROFESSIONAL_WRITING]: 'opus',
  [TASK_TYPES.CODE_GENERATION]: 'opus',
  [TASK_TYPES.RESEARCH]: 'opus'
};

// 快速规则匹配
const classifyByRules = (message) => {
  const lowerMsg = message.toLowerCase();
  
  // Haiku 任务特征
  if (lowerMsg.match(/^(总结|摘要|概括|归纳)/) || 
      lowerMsg.includes('关键词') ||
      lowerMsg.includes('主要观点') ||
      lowerMsg.match(/^(是|否|对|错|好|不好)/)) {
    return { taskType: TASK_TYPES.SUMMARIZATION, confidence: 0.85 };
  }
  
  // Opus 任务特征
  if (lowerMsg.includes('代码') || lowerMsg.includes('编程') ||
      lowerMsg.includes('深度分析') || lowerMsg.includes('专业') ||
      lowerMsg.length > 500 && (lowerMsg.includes('详细') || lowerMsg.includes('全面'))) {
    return { taskType: TASK_TYPES.COMPLEX_ANALYSIS, confidence: 0.8 };
  }
  
  // 默认 Sonnet
  return { taskType: TASK_TYPES.DIALOGUE, confidence: 0.7 };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { message, conversation_context } = await req.json();
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // 使用规则分类
    const classification = classifyByRules(message);
    const modelTier = TASK_TO_MODEL_TIER[classification.taskType];
    
    // 获取该层级的活跃模型
    const models = await base44.asServiceRole.entities.AIModel.filter({ is_active: true });
    let selectedModel = models.find(m => m.name.toLowerCase().includes(modelTier));
    
    // 如果没有找到对应模型，使用默认模型
    if (!selectedModel) {
      selectedModel = models.find(m => m.is_default) || models[0];
    }
    
    return Response.json({
      task_type: classification.taskType,
      confidence: classification.confidence,
      recommended_model_tier: modelTier,
      selected_model_id: selectedModel?.id,
      selected_model_name: selectedModel?.name,
      reasoning: `Classified as ${classification.taskType} based on message patterns`
    });
    
  } catch (error) {
    console.error('Task classifier error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});