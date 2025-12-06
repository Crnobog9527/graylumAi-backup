import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 关键词配置
const MUST_SEARCH_KEYWORDS = [
  '今天', '昨天', '最新', '现在', '当前', '实时', '近期', '最近', '刚刚',
  '本周', '本月', '今年', '2025', '2026', 
  'today', 'yesterday', 'current', 'now', 'latest', 'recent',
  '天气', 'weather', '股价', 'stock', '汇率', 'exchange rate',
  '新闻', 'news', '比分', 'score', '价格', 'price',
  '谁是', 'who is', '还在吗', '现任', '最新政策', '动态'
];

const NEVER_SEARCH_KEYWORDS = [
  '历史', 'history', '定义', 'definition', '什么是', 'what is',
  '如何', 'how to', '怎么', '为什么', 'why',
  '代码', 'code', '编程', 'programming', '函数', 'function',
  '翻译', 'translate', '写一个', 'write a', '帮我写', 'help me write',
  '故事', 'story', '文案', '原理', 'principle', '教程', 'tutorial'
];

// 计算两个字符串的余弦相似度
function cosineSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().match(/[\u4e00-\u9fa5a-z0-9]+/g) || [];
  const words2 = str2.toLowerCase().match(/[\u4e00-\u9fa5a-z0-9]+/g) || [];
  
  const allWords = [...new Set([...words1, ...words2])];
  const vector1 = allWords.map(w => words1.filter(x => x === w).length);
  const vector2 = allWords.map(w => words2.filter(x => x === w).length);
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const mag1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
}

// 生成查询哈希
function generateHash(text) {
  const normalized = text.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      user_message, 
      conversation_history = [],
      force_search = false,
      force_no_search = false 
    } = await req.json();

    if (!user_message) {
      return Response.json({ error: 'user_message is required' }, { status: 400 });
    }

    // 显式控制
    if (force_search) {
      return Response.json({
        need_search: true,
        confidence: 1.0,
        reason: 'Force search requested',
        search_type: 'general',
        decision_layer: 'explicit',
        query_hash: generateHash(user_message),
        response_time: Date.now() - startTime
      });
    }
    
    if (force_no_search) {
      return Response.json({
        need_search: false,
        confidence: 1.0,
        reason: 'Force no search requested',
        search_type: 'none',
        decision_layer: 'explicit',
        response_time: Date.now() - startTime
      });
    }

    // 第一层：关键词快速过滤
    const lowerMessage = user_message.toLowerCase();
    
    // 检查必搜关键词
    const mustSearchMatch = MUST_SEARCH_KEYWORDS.find(kw => 
      lowerMessage.includes(kw.toLowerCase())
    );
    
    if (mustSearchMatch) {
      return Response.json({
        need_search: true,
        confidence: 0.95,
        reason: `Matched must-search keyword: ${mustSearchMatch}`,
        search_type: 'general',
        decision_layer: 'keyword',
        matched_keyword: mustSearchMatch,
        query_hash: generateHash(user_message),
        response_time: Date.now() - startTime
      });
    }

    // 检查禁搜关键词
    const neverSearchMatch = NEVER_SEARCH_KEYWORDS.find(kw => 
      lowerMessage.includes(kw.toLowerCase())
    );
    
    if (neverSearchMatch) {
      return Response.json({
        need_search: false,
        confidence: 0.9,
        reason: `Matched never-search keyword: ${neverSearchMatch}`,
        search_type: 'none',
        decision_layer: 'keyword',
        matched_keyword: neverSearchMatch,
        response_time: Date.now() - startTime
      });
    }

    // 第二层：上下文联动判断
    if (conversation_history.length >= 2) {
      const lastUserMsg = conversation_history[conversation_history.length - 2];
      if (lastUserMsg?.search_decision?.need_search) {
        const similarity = cosineSimilarity(user_message, lastUserMsg.content || '');
        if (similarity > 0.4) {
          return Response.json({
            need_search: true,
            confidence: 0.85,
            reason: `Follow-up question (similarity: ${similarity.toFixed(2)})`,
            search_type: lastUserMsg.search_decision.search_type || 'general',
            decision_layer: 'context',
            similarity: similarity,
            query_hash: generateHash(user_message),
            response_time: Date.now() - startTime
          });
        }
      }
    }

    // 第三层：Haiku 语义分析
    const analysisPrompt = `分析用户消息，判断是否需要联网搜索。严格按照以下 JSON 格式回复，不要添加任何其他文字：

{
  "need_search": true或false,
  "confidence": 0到1的数字,
  "reason": "判断原因",
  "search_type": "news/data/verification/general/none"
}

【必须搜索的场景】
- 实时信息：天气、股价、汇率、比赛、新闻
- 时间敏感：包含今天、昨天、最新、现在、当前等
- 当前状态：谁是CEO、还在职吗、最新政策、现任
- 事实核查：人事任免、选举结果、公司动态
- 具体数据：价格、统计、排名、评分

【不需要搜索的场景】
- 历史知识：2024年前的历史、已故人物、基础科学
- 技术问答：编程、数学、算法、通用技术
- 创作任务：写作、代码、翻译、改写
- 分析推理：基于已有信息的分析
- 定义解释：概念、原理、教程

用户消息：${user_message}

JSON回复：`;

    try {
      const haikuResponse = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        add_context_from_internet: false
      });

      // 尝试解析 JSON
      const jsonMatch = haikuResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Haiku');
      }

      const decision = JSON.parse(jsonMatch[0]);
      
      // 验证响应格式
      if (typeof decision.need_search !== 'boolean' || 
          typeof decision.confidence !== 'number') {
        throw new Error('Invalid decision format');
      }

      return Response.json({
        need_search: decision.need_search,
        confidence: decision.confidence,
        reason: decision.reason || 'Haiku semantic analysis',
        search_type: decision.search_type || (decision.need_search ? 'general' : 'none'),
        decision_layer: 'haiku',
        query_hash: generateHash(user_message),
        response_time: Date.now() - startTime,
        haiku_response: haikuResponse
      });

    } catch (error) {
      // Haiku 分析失败，使用保守策略
      const isShortMessage = user_message.length < 50;
      const hasQuestionMark = user_message.includes('?') || user_message.includes('？');
      
      return Response.json({
        need_search: !isShortMessage && hasQuestionMark,
        confidence: 0.5,
        reason: `Haiku analysis failed, using fallback strategy: ${error.message}`,
        search_type: 'none',
        decision_layer: 'fallback',
        query_hash: generateHash(user_message),
        response_time: Date.now() - startTime
      });
    }

  } catch (error) {
    return Response.json({ 
      error: error.message,
      response_time: Date.now() - startTime
    }, { status: 500 });
  }
});