# Grayscale AI 对话功能后端架构诊断报告

**诊断日期**: 2026-01-11
**版本**: 2026-01-08-DEBUG-v2

---

## 1. 架构总览

### 1.1 技术栈
- **运行时**: Deno (Serverless Functions)
- **SDK**: @base44/sdk@0.8.4
- **AI Provider**: OpenRouter (主) + Anthropic API (备)
- **前端框架**: React + TanStack Query
- **主要模型**: Claude Sonnet 4.5 / Haiku 4.5

### 1.2 核心函数文件

| 文件 | 职责 | 代码行数 |
|------|------|---------|
| `smartChatWithSearch.ts` | 主入口：对话编排、搜索判断、积分扣费 | ~800行 |
| `callAIModel.ts` | AI模型调用层：支持多Provider、Prompt Caching | ~720行 |
| `taskClassifier.ts` | 任务分类器：Haiku/Sonnet模型选择 | ~140行 |
| `searchClassifier.ts` | 搜索决策器：三级分类（关键词→Haiku→上下文） | ~300行 |
| `compressConversation.ts` | 对话压缩：生成历史摘要 | ~150行 |
| `tokenBudgetManager.ts` | Token预算管理 | ~150行 |
| `smartChat.ts` | 智能对话（旧版，带缓存） | ~370行 |

---

## 2. 数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           前端 (useChatState.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. 用户输入消息                                                             │
│  2. 构建 systemPrompt (首轮对话 + PromptModule)                              │
│  3. 处理文件附件 (extractFileContent)                                        │
│  4. 调用 chatAPI.sendMessage() → base44.functions.invoke('smartChatWithSearch') │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      smartChatWithSearch.ts (主编排层)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  步骤1: 认证 & 读取系统设置                                                  │
│  步骤2: 获取AI模型配置                                                       │
│  步骤3: 调用 taskClassifier → 智能模型选择                                   │
│  步骤4: 搜索判断 (关键词匹配 / searchClassifier)                             │
│  步骤5: 加载对话历史 + 摘要 (ConversationSummary)                            │
│  步骤6: 构建消息列表 (apiMessages) + Prompt Caching 标记                     │
│  步骤7: 调用 callAIModel                                                     │
│  步骤8: 积分扣费 (Token费用 + 联网搜索费)                                    │
│  步骤9: 保存对话 + 触发压缩                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         callAIModel.ts (模型调用层)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Provider路由:                                                               │
│    ├── builtin (Core.InvokeLLM)                                              │
│    ├── openai/custom (OpenAI格式API)                                         │
│    ├── anthropic (官方API / OpenRouter)                                      │
│    └── google (Gemini)                                                       │
│                                                                              │
│  Prompt Caching策略:                                                         │
│    ├── 系统提示词 >= 1024 tokens → cache_control: ephemeral                  │
│    └── 倒数第4条消息 → cache_control: ephemeral (稳定边界)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心机制分析

### 3.1 模型路由策略 (taskClassifier.ts)

```
┌──────────────────────────────────────────────────────────┐
│                  双模型路由策略                           │
├──────────────────────────────────────────────────────────┤
│ 规则1: 内部任务 (summarize/compress) → Haiku            │
│ 规则2: 多轮对话 (>=3轮) → Sonnet (上下文稳定性)          │
│ 规则3: 简单确认词 (<10字符) → Haiku                      │
│ 规则4: 其他所有情况 → Sonnet (保证质量)                  │
└──────────────────────────────────────────────────────────┘

结论: 99%场景使用Sonnet，仅极简场景使用Haiku
```

### 3.2 系统提示词处理 (重要修复 2026-01-08)

**问题回顾**: 之前系统提示词只在首轮使用，导致后续轮次丢失角色人设

**当前逻辑**:
```
首轮对话:
  - 使用前端传来的 system_prompt
  - 保存到 Conversation.system_prompt 字段

后续轮次:
  - 从 Conversation.system_prompt 读取
  - 传递给 callAIModel
```

**代码位置**: `smartChatWithSearch.ts:483-519`

### 3.3 对话历史管理

| 配置项 | 值 | 含义 |
|--------|-----|------|
| FULL_HISTORY_LIMIT | 10轮 | 10轮内保持完整历史 |
| RECENT_MESSAGES_COUNT | 6条 | 超过限制后保留最近6条 |
| COMPRESSION_TRIGGER_MESSAGES | 20条 | 触发压缩的消息阈值 |
| COMPRESSION_CHECK_INTERVAL | 10条 | 每10条检查一次 |

**压缩策略**:
1. 使用 Haiku 生成简洁摘要 (max 300 tokens)
2. 摘要融入第一条最近消息，避免虚假assistant消息
3. 大摘要 (>=1024 tokens) 启用 Prompt Caching

### 3.4 Prompt Caching 策略

**缓存断点**:
1. 系统提示词 (>=1024 tokens)
2. 历史摘要 (>=1024 tokens)
3. 倒数第4条消息 (稳定边界)

**成本优化**:
- 缓存命中: 90% 折扣 (0.1x 原价)
- 缓存创建: 25% 溢价 (1.25x 原价)
- 5分钟有效期

### 3.5 积分计费规则

| 类型 | 费率 |
|------|------|
| 输入Token | 1000 tokens = 1 积分 |
| 输出Token | 200 tokens = 1 积分 |
| 联网搜索 | 5 积分/次 (立即扣除) |
| 缓存命中 | 90% 折扣 |

**结算逻辑**:
1. 联网搜索费 → 立即扣除
2. Token费 → 加入待结算 (pending_credits)
3. 待结算 >= 1 → 扣除整数部分

---

## 4. 数据实体

### 4.1 核心实体

| 实体 | 用途 |
|------|------|
| Conversation | 对话记录 (messages, system_prompt, model_id) |
| ConversationSummary | 对话摘要 (summary_text, covered_messages) |
| ConversationCache | 缓存状态 |
| AIModel | 模型配置 |
| User | 用户 (credits, pending_credits) |
| CreditTransaction | 积分交易记录 |
| TokenStats | Token使用统计 |
| TokenBudget | 对话Token预算 |
| SearchCache | 搜索结果缓存 |
| SearchDecision | 搜索决策记录 |
| SearchStatistics | 搜索统计 |
| SystemSettings | 系统设置 |
| PromptModule | 提示词模块 |

---

## 5. 潜在问题与优化建议

### 5.1 已知问题

#### P0 - 已修复
- [x] **对话历史不显示** (2026-01-08): 后端创建对话后前端状态同步问题
- [x] **系统提示词丢失** (2026-01-08): 后续轮次不传递system_prompt

#### P1 - 需关注
- [ ] **摘要质量**: 使用Haiku生成摘要可能丢失细节
- [ ] **缓存失效**: 5分钟有效期可能导致频繁缓存创建
- [ ] **Token估算误差**: `字符数/4` 估算与实际可能有偏差

#### P2 - 优化建议
- [ ] 添加摘要质量评估
- [ ] 考虑使用 Sonnet 生成关键对话摘要
- [ ] 实现更精确的 Token 计数 (tiktoken)

### 5.2 架构优化建议

1. **分层更清晰**
   - 当前 `smartChatWithSearch.ts` 过长 (~800行)
   - 建议拆分: 搜索决策 / 积分计费 / 对话管理

2. **缓存策略**
   - 前端 `chatAPI.js` 缓存与后端 `ConversationCache` 存在重叠
   - 建议统一到后端管理

3. **错误处理**
   - 部分函数调用失败会静默跳过
   - 建议增加失败监控和告警

4. **日志优化**
   - 当前日志详细但不结构化
   - 建议使用 JSON 格式便于分析

---

## 6. 函数调用链路

```
用户发送消息
    │
    ├──→ smartChatWithSearch
    │       │
    │       ├──→ tokenBudgetManager (check)
    │       │
    │       ├──→ taskClassifier (模型选择)
    │       │
    │       ├──→ searchClassifier (搜索判断, 可选)
    │       │
    │       ├──→ ConversationSummary (获取摘要)
    │       │
    │       ├──→ callAIModel
    │       │       │
    │       │       ├──→ OpenRouter API
    │       │       ├──→ Anthropic API
    │       │       └──→ Gemini API
    │       │
    │       ├──→ User.update (积分扣除)
    │       │
    │       ├──→ CreditTransaction.create
    │       │
    │       ├──→ Conversation.update/create
    │       │
    │       ├──→ tokenBudgetManager (consume)
    │       │
    │       └──→ compressConversation (异步, 条件触发)
    │
    └──→ 返回响应
```

---

## 7. 配置参数汇总

### 7.1 callAIModel.ts
```typescript
CACHE_MIN_TOKENS = 1024        // 最小缓存阈值
MAX_CACHE_BREAKPOINTS = 4      // Claude最多4个缓存断点
```

### 7.2 smartChatWithSearch.ts
```typescript
FULL_HISTORY_LIMIT = 10        // 完整历史轮次
RECENT_MESSAGES_COUNT = 6      // 保留最近消息数
COMPRESSION_CHECK_INTERVAL = 10
COMPRESSION_TRIGGER_MESSAGES = 20
CACHE_TTL_MINUTES = 15
WEB_SEARCH_COST = 0.005
```

### 7.3 compressConversation.ts
```typescript
SUMMARY_MAX_TOKENS = 300       // 摘要最大Token数
```

### 7.4 tokenBudgetManager.ts
```typescript
DEFAULT_BUDGET = 50000         // 默认Token预算
WARNING_THRESHOLD = 0.8        // 80%时预警
```

---

## 8. 诊断结论

### 整体评价: **B+ (良好)**

**优点**:
1. 架构分层合理，职责清晰
2. Prompt Caching 策略完善，成本控制好
3. 多Provider支持，灵活性高
4. 积分系统设计合理，支持精确计费

**待改进**:
1. 主函数过长，建议拆分
2. 缓存层次过多，有优化空间
3. 错误处理可以更健壮
4. 监控和告警机制不足

---

*报告生成时间: 2026-01-11*
*诊断工具: Claude Code*
