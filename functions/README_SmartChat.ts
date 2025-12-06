# 智能 Claude API 中间层系统

## 功能概览

这是一个完整的 Claude API 智能中间层系统，实现了高级缓存管理、智能模型路由、自动对话压缩等功能。

## 核心功能

### 1. 三层缓存架构
- **系统提示词层**：永久缓存系统提示词（>1024 tokens）
- **历史摘要层**：缓存压缩后的对话历史（>2048 tokens）
- **近期对话层**：保留最近 4 轮完整对话（不缓存）

### 2. 智能模型路由
- **Haiku**：处理简单问答、对话摘要、上下文压缩
- **Sonnet**：处理复杂推理、长文本生成、专业问答
- 自动根据关键词和消息长度分类

### 3. 自动对话压缩
- 每 5 轮对话或 8000 tokens 触发
- 使用 Haiku 生成结构化摘要
- 压缩比通常在 20-30%

### 4. Token 计数与成本追踪
- 实时记录 input/output/cached tokens
- 计算实际成本和缓存节省
- 追踪缓存命中率

## API 端点

### POST /smartChat
智能对话接口，支持缓存和自动压缩

**请求体：**
```json
{
  "conversation_id": "optional",
  "message": "用户消息",
  "system_prompt": "optional",
  "force_model": "optional: @preset/claude-haiku-4.5 or @preset/claude-4-5-sonnet"
}
```

**响应：**
```json
{
  "conversation_id": "uuid",
  "response": "AI 回复",
  "model_used": "@preset/claude-4-5-sonnet",
  "stats": {
    "input_tokens": 5234,
    "output_tokens": 856,
    "cached_tokens": 3120,
    "cache_creation_tokens": 1024,
    "total_cost": "0.012500",
    "cache_savings": "0.008400",
    "cache_hit_rate": "59.6%",
    "compression_triggered": true,
    "summary_used": true
  }
}
```

### GET /getChatStats
获取统计信息

**查询参数：**
- `conversation_id` (optional): 特定对话的统计
- `time_range`: 7d, 30d, or all

**响应：**
```json
{
  "time_range": "7d",
  "summary": {
    "total_requests": 156,
    "total_input_tokens": 45230,
    "total_output_tokens": 12450,
    "total_cached_tokens": 28900,
    "total_cost": 0.234,
    "total_savings": 0.156,
    "cache_hit_rate": "63.89",
    "compression_events": 12,
    "by_model": {
      "@preset/claude-haiku-4.5": {
        "count": 98,
        "cost": 0.045
      },
      "@preset/claude-4-5-sonnet": {
        "count": 58,
        "cost": 0.189
      }
    }
  },
  "cache_info": {
    "is_active": true,
    "system_prompt_cached": true,
    "summary_cached": true,
    "cache_hit_count": 23,
    "summary": {
      "covered_messages": 15,
      "summary_tokens": 456,
      "compression_ratio": "28.3%"
    }
  }
}
```

### POST /compressConversation
手动触发对话压缩

**请求体：**
```json
{
  "conversation_id": "uuid",
  "messages_to_compress": 20
}
```

## 数据库 Schema

### ConversationCache
存储缓存状态和统计
```javascript
{
  conversation_id: string,
  user_email: string,
  system_prompt_cached: boolean,
  summary_cached: boolean,
  cache_breakpoints: array,
  last_cache_time: datetime,
  total_cached_tokens: number,
  cache_hit_count: number,
  expires_at: datetime  // 5分钟无活动自动过期
}
```

### ConversationSummary
存储对话摘要
```javascript
{
  conversation_id: string,
  user_email: string,
  summary_text: string,
  covered_messages: number,
  summary_tokens: number,
  key_topics: array,
  user_preferences: object,
  pending_tasks: array,
  compression_ratio: number
}
```

### TokenStats
存储 token 使用统计
```javascript
{
  conversation_id: string,
  user_email: string,
  model_used: string,
  input_tokens: number,
  output_tokens: number,
  cached_tokens: number,
  cache_creation_tokens: number,
  total_cost: number,
  cache_savings: number,
  request_type: enum(simple, complex, compression),
  compression_triggered: boolean
}
```

## 配置说明

### 环境变量
```bash
OPENROUTER_API_KEY=your_api_key_here
```

### 缓存阈值
- `SYSTEM_CACHE_THRESHOLD`: 1024 tokens
- `SUMMARY_CACHE_THRESHOLD`: 2048 tokens
- `COMPRESSION_TRIGGER_ROUNDS`: 5 轮对话
- `COMPRESSION_TOKEN_THRESHOLD`: 8000 tokens
- `CACHE_EXPIRY_MINUTES`: 5 分钟
- `RECENT_MESSAGES_COUNT`: 4 轮（8条消息）

### 成本配置（per 1M tokens）
- **Haiku**: Input $1.00, Output $5.00, Cached $0.10
- **Sonnet**: Input $3.00, Output $15.00, Cached $0.30

## 使用示例

### 前端集成
```javascript
import { base44 } from '@/api/base44Client';

// 发送消息
const response = await base44.functions.invoke('smartChat', {
  conversation_id: currentConversationId,
  message: userInput,
  system_prompt: 'You are a helpful assistant...'
});

console.log('AI Response:', response.data.response);
console.log('Model Used:', response.data.model_used);
console.log('Cache Hit Rate:', response.data.stats.cache_hit_rate);
console.log('Cost:', response.data.stats.total_cost);

// 获取统计
const stats = await base44.functions.invoke('getChatStats', {
  conversation_id: currentConversationId,
  time_range: '7d'
});

console.log('Total Requests:', stats.data.summary.total_requests);
console.log('Total Cost:', stats.data.summary.total_cost);
console.log('Cache Savings:', stats.data.summary.total_savings);

// 手动压缩
const compression = await base44.functions.invoke('compressConversation', {
  conversation_id: currentConversationId,
  messages_to_compress: 20
});

console.log('Compression Ratio:', compression.data.summary.compression_ratio);
console.log('Tokens Saved:', compression.data.summary.tokens_saved);
```

## 性能优化建议

1. **缓存命中率优化**
   - 保持对话连续性
   - 避免频繁切换系统提示词
   - 合理设置压缩阈值

2. **成本优化**
   - 简单问答使用 Haiku
   - 及时压缩长对话
   - 监控缓存过期时间

3. **压缩策略**
   - 每 5 轮对话压缩一次
   - 保留最近 4 轮完整对话
   - 压缩后的摘要应包含所有关键信息

## 监控指标

- **缓存命中率**：目标 >50%
- **压缩比**：目标 20-30%
- **平均成本/请求**：Haiku <$0.0001, Sonnet <$0.0005
- **缓存节省比例**：目标 >40%

## 故障排查

1. **缓存未生效**
   - 检查 token 数是否达到阈值
   - 确认缓存未过期
   - 验证 OpenRouter API key

2. **压缩失败**
   - 检查消息数量是否足够
   - 确认 Haiku 模型可用
   - 查看错误日志

3. **成本异常**
   - 检查模型选择是否正确
   - 确认缓存配置
   - 查看 token 统计