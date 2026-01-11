# Grayscale AI 对话功能 - 核心 API 文件分析

**分析日期**: 2026-01-11
**版本**: 2026-01-08-DEBUG-v2

---

## 项目架构说明

本项目 **不使用** 传统的 `/pages/api/` 结构，而是采用：

- **Base44 SDK** + **Deno Serverless Functions** 架构
- 后端函数位于 `/functions/` 目录
- 前端通过 `base44.functions.invoke()` 调用后端函数

---

## 核心文件分析

### 1. `functions/callAIModel.ts` - AI 模型调用层

```
/**
 * 文件: /functions/callAIModel.ts
 * 代码行数: 719 行
 * 版本: 2026-01-08-DEBUG-v2
 *
 * 1. 职责范围:
 *    - [x] API 请求解析
 *    - [x] 参数验证
 *    - [x] Claude API 调用 (Anthropic 官方 + OpenRouter)
 *    - [x] 响应处理
 *    - [x] 错误处理
 *    - [ ] 数据库操作 (无直接DB操作)
 *    - [x] 业务逻辑处理 (Token估算、缓存、计费)
 *
 * 2. 依赖关系:
 *    - 导入的模块: @base44/sdk@0.8.4
 *    - 依赖的外部服务:
 *      • OpenRouter API (主)
 *      • Anthropic API (官方)
 *      • Google Gemini API
 *      • OpenAI 兼容 API
 *    - 依赖的实体: AIModel
 *
 * 3. 状态管理:
 *    - 不直接存储对话历史 (由调用方管理)
 *    - system_prompt: 由调用方 (smartChatWithSearch) 传入
 *    - 上下文: 通过 messages 数组传递
 */
```

**关键代码段**:

```typescript
// 系统提示词处理 (L29-41)
const { model_id, messages, system_prompt, force_web_search, image_files } = await req.json();
const finalSystemPrompt = system_prompt || DEFAULT_SYSTEM_PROMPT;

// Provider 路由 (L275-714)
if (model.provider === 'builtin') { ... }  // Base44 内置集成
if (useOpenAIFormat) { ... }               // OpenAI 格式 API
if (provider === 'anthropic') { ... }      // Anthropic (官方/OpenRouter)
if (provider === 'google') { ... }         // Google Gemini
```

**Prompt Caching 策略**:

```typescript
// 缓存配置 (L47-48)
const CACHE_MIN_TOKENS = 1024;        // 最小缓存阈值
const MAX_CACHE_BREAKPOINTS = 4;      // Claude 最多4个缓存断点

// 缓存断点策略 (L139-211)
// 1. 系统提示词 >= 1024 tokens → cache_control: ephemeral
// 2. 倒数第4条消息 → cache_control: ephemeral (稳定边界)
```

---

### 2. `functions/smartChatWithSearch.ts` - 主编排层

```
/**
 * 文件: /functions/smartChatWithSearch.ts
 * 代码行数: 797 行
 * 版本: 2026-01-08-DEBUG-v2
 *
 * 1. 职责范围:
 *    - [x] API 请求解析
 *    - [x] 参数验证
 *    - [ ] Claude API 调用 (委托给 callAIModel)
 *    - [x] 响应处理
 *    - [x] 错误处理
 *    - [x] 数据库操作 (对话、用户、交易记录)
 *    - [x] 业务逻辑处理 (搜索判断、积分扣费、历史压缩)
 *
 * 2. 依赖关系:
 *    - 导入的模块: @base44/sdk@0.8.4
 *    - 调用的后端函数:
 *      • taskClassifier (模型选择)
 *      • tokenBudgetManager (预算检查)
 *      • callAIModel (AI 调用)
 *      • compressConversation (历史压缩)
 *    - 依赖的实体:
 *      • Conversation (对话)
 *      • ConversationSummary (摘要)
 *      • User (用户积分)
 *      • CreditTransaction (交易记录)
 *      • AIModel (模型配置)
 *      • SystemSettings (系统设置)
 *
 * 3. 状态管理:
 *    - 对话历史: 存储在 Conversation.messages
 *    - system_prompt:
 *      • 首轮: 从前端接收，保存到 Conversation.system_prompt
 *      • 后续: 从 Conversation.system_prompt 读取
 *    - 上下文: 通过 apiMessages 数组传递给 callAIModel
 */
```

**对话历史管理配置**:

```typescript
// L4-8
const FULL_HISTORY_LIMIT = 10;           // 10轮内保持完整历史
const RECENT_MESSAGES_COUNT = 6;         // 超过后保留最近6条
const COMPRESSION_CHECK_INTERVAL = 10;   // 每10条检查一次
const COMPRESSION_TRIGGER_MESSAGES = 20; // >=20条触发压缩
```

**系统提示词处理逻辑** (重要修复):

```typescript
// L483-543
const isFirstTurn = conversationMessages.length === 0;
const hasNewSystemPrompt = system_prompt && system_prompt.trim().length > 0;

let finalSystemPrompt = null;
let systemPromptSource = 'none';

if (isFirstTurn && hasNewSystemPrompt) {
  // 首轮对话：使用前端传来的系统提示词
  finalSystemPrompt = system_prompt;
  systemPromptSource = 'new_from_frontend';
} else if (conversation && conversation.system_prompt) {
  // 后续轮次：从对话记录中读取保存的系统提示词
  finalSystemPrompt = conversation.system_prompt;
  systemPromptSource = 'saved_in_conversation';
}
```

**积分计费流程**:

```typescript
// L586-670
// 步骤1: 联网搜索费用（立即扣除 5 积分）
// 步骤2: Token费用加入待结算 (pending_credits)
// 步骤3: 待结算 >= 1 时扣除整数部分
```

---

### 3. `src/utils/chatAPI.js` - 前端 API 封装层

```
/**
 * 文件: /src/utils/chatAPI.js
 * 代码行数: 192 行
 *
 * 1. 职责范围:
 *    - [x] API 请求封装
 *    - [x] 请求去重 (防止重复发送)
 *    - [x] 本地缓存管理
 *    - [x] 缓存失效控制
 *
 * 2. 依赖关系:
 *    - 导入的模块: @/api/base44Client
 *    - 调用的后端函数: smartChatWithSearch
 *
 * 3. 缓存策略:
 *    - 对话列表: 2分钟 TTL
 *    - 对话历史: 5分钟 TTL
 *    - 用户信息: 10分钟 TTL
 */
```

**关键方法**:

```javascript
// 发送消息 (L19-58)
async sendMessage(params) {
  // 1. 生成请求唯一键防止重复
  // 2. 调用 base44.functions.invoke('smartChatWithSearch', ...)
  // 3. 成功后清除相关缓存
}

// 获取对话历史 (带缓存) (L91-114)
async getConversationHistory(conversationId, options = {}) {
  // 检查本地缓存 → 命中返回 → 未命中调用API
}
```

---

### 4. `src/hooks/useChatState.js` - 前端状态管理

```
/**
 * 文件: /src/hooks/useChatState.js
 * 代码行数: 675 行
 *
 * 1. 职责范围:
 *    - [x] React 状态管理
 *    - [x] TanStack Query 数据获取
 *    - [x] 用户交互处理
 *    - [x] 消息发送流程
 *    - [x] 文件上传处理
 *
 * 2. 依赖关系:
 *    - React hooks (useState, useEffect, useCallback, useMemo)
 *    - TanStack Query (useQuery, useMutation)
 *    - chatAPI (消息发送)
 *    - base44 SDK (实体操作)
 *
 * 3. 系统提示词构建 (L301-313):
 *    - 仅在首轮对话 + 有选中模块时构建
 *    - 格式: 【重要约束】你现在是"${module.title}"专用助手...
 */
```

**消息发送流程**:

```javascript
// L291-483 handleSendMessage
// 1. 验证用户积分
// 2. 构建 systemPrompt (首轮 + 有模块)
// 3. 处理文件附件 (文本/图片)
// 4. 长文本预警检查
// 5. 调用 chatAPI.sendMessage()
// 6. 使用后端返回的 conversation_id 更新状态
// 7. 刷新用户积分
```

---

### 5. `functions/taskClassifier.ts` - 任务分类器

```
/**
 * 文件: /functions/taskClassifier.ts
 * 代码行数: 141 行
 *
 * 1. 职责范围:
 *    - [x] 消息复杂度分析
 *    - [x] 模型选择 (Haiku vs Sonnet)
 *
 * 2. 模型选择规则:
 *    - 规则1: 内部任务 (summarize/compress) → Haiku
 *    - 规则2: 多轮对话 (>=3轮) → Sonnet
 *    - 规则3: 简单确认词 (<10字符) → Haiku
 *    - 规则4: 其他所有情况 → Sonnet
 *
 * 3. 结论: 99% 场景使用 Sonnet，仅极简场景用 Haiku
 */
```

---

### 6. `functions/compressConversation.ts` - 对话压缩

```
/**
 * 文件: /functions/compressConversation.ts
 * 代码行数: 149 行
 *
 * 1. 职责范围:
 *    - [x] 生成对话历史摘要
 *    - [x] 使用 Haiku 降低成本
 *
 * 2. 配置:
 *    - 摘要最大 Token: 300
 *    - 模型: @preset/claude-haiku-4.5
 *
 * 3. 存储:
 *    - 摘要保存到 ConversationSummary 实体
 *    - 统计保存到 TokenStats 实体
 */
```

---

## 数据流图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          用户在前端输入消息                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       useChatState.handleSendMessage                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 验证积分                                                          │    │
│  │ 2. 构建 systemPrompt (首轮 + 有模块)                                 │    │
│  │ 3. 处理文件附件                                                       │    │
│  │ 4. 长文本预警                                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           chatAPI.sendMessage                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 请求去重                                                          │    │
│  │ 2. base44.functions.invoke('smartChatWithSearch', {...})            │    │
│  │ 3. 清除缓存                                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        smartChatWithSearch (后端)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 认证 + 读取系统设置                                               │    │
│  │ 2. 调用 taskClassifier → 选择模型                                   │    │
│  │ 3. 搜索判断 (关键词匹配)                                             │    │
│  │ 4. 加载对话历史 + 摘要                                               │    │
│  │ 5. 系统提示词处理:                                                    │    │
│  │    • 首轮: 使用前端传来的 system_prompt                              │    │
│  │    • 后续: 从 Conversation.system_prompt 读取                        │    │
│  │ 6. 构建 apiMessages                                                  │    │
│  │ 7. 调用 callAIModel                                                  │    │
│  │ 8. 积分扣费                                                          │    │
│  │ 9. 保存对话                                                          │    │
│  │ 10. 触发压缩 (条件)                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          callAIModel (后端)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 接收 model_id, messages, system_prompt, force_web_search        │    │
│  │ 2. 获取模型配置 (AIModel 实体)                                       │    │
│  │ 3. Token 截断处理                                                    │    │
│  │ 4. Prompt Caching 标记                                               │    │
│  │ 5. Provider 路由:                                                    │    │
│  │    ├── builtin → Core.InvokeLLM                                     │    │
│  │    ├── openai/custom → OpenAI API                                   │    │
│  │    ├── anthropic → Anthropic/OpenRouter                             │    │
│  │    └── google → Gemini                                               │    │
│  │ 6. 返回响应 + Token 统计                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 关键问题总结

### 已修复 (2026-01-08)

| 问题 | 原因 | 修复位置 |
|------|------|---------|
| 对话历史不显示 | 前端自己创建对话ID，与后端不同步 | `useChatState.js:449-477` |
| 系统提示词丢失 | 后续轮次不传递 system_prompt | `smartChatWithSearch.ts:483-543` |

### 当前架构优点

1. **清晰的分层**: 前端状态 → API封装 → 后端编排 → AI调用
2. **Prompt Caching**: 系统提示词 + 历史消息缓存，节省成本
3. **灵活的模型路由**: 支持多个 AI Provider
4. **完善的计费系统**: 精确到小数的积分扣费

### 潜在优化点

1. **smartChatWithSearch.ts 过长** (~800行)，建议拆分
2. **前后端缓存重叠**: chatAPI 和 ConversationCache 存在功能重复
3. **摘要质量**: Haiku 生成的摘要可能丢失细节

---

*分析完成时间: 2026-01-11*
