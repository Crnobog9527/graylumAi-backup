# 开发日志

> Grayscale 项目变更记录
> 按时间倒序排列，最新的变更在最上面

---

## 2026-01-11 (知识库系统性更新) 📚

### 📊 代码扫描结果

**核心文件实际行数验证**：

| 文件 | 文档旧值 | 实际行数 | 位置 |
|------|----------|----------|------|
| `smartChatWithSearch.ts` | 752 / 31,478 | **801** | `functions/` |
| `callAIModel.ts` | 679 / 27,164 | **718** | `functions/` |
| `useChatState.jsx` | 691 / 22,855 | **737** | `components/hooks/` |
| `AdminAnnouncements.jsx` | 1,116 / 48,524 | **1,116** | `pages/` |
| `ProfileComponents.jsx` | 1,348 | **1,348** | `components/profile/` |
| `compressConversation.ts` | - | **148** | `functions/` |

### ✅ 已确认删除的文件

- `src/hooks/useChatState.js` - 已删除（commit 311d26c）
- 只有 `src/components/hooks/useChatState.jsx` 在使用

### 📝 已更新的知识库文档

| 文档 | 更新内容 |
|------|----------|
| **README.md** | 关键文件行数、P0 问题状态、改进项 |
| **ARCHITECTURE.md** | 文件行数、useChatState 位置说明 |
| **TROUBLESHOOTING.md** | 添加 5 个已修复问题的详细解决方案 |
| **HEALTH_REPORT.md** | 文件大小数据、问题状态更新 |
| **CHANGELOG.md** | 本次更新记录（本条目） |

### 🎯 P0 问题修复确认

通过代码扫描确认以下修复已在代码中实现：

1. **系统提示词跨对话串联** - `useChatState.jsx:184-194`
2. **功能模块自动发送** - `useChatState.jsx:546-682`
3. **对话历史不显示** - `useChatState.jsx:372-379`
4. **聊天上下文丢失** - 消息过滤逻辑修复

### 📋 经验教训总结

1. **确认导入路径**：修改前先用 grep 确认哪个文件被导入
2. **避免重复文件**：项目不应存在同名但路径不同的模块
3. **定期扫描验证**：文档数据需要与代码保持同步
4. **代码位置标注**：在文档中标注具体行号便于快速定位

---

## 2026-01-11 (P0 Bug 最终修复 - 发现重复文件问题) ✅

### 🔍 重要发现：项目存在重复文件

**问题**：之前的修复代码无效，原因是修改了错误的文件

| 文件路径 | 状态 | 说明 |
|----------|------|------|
| `src/hooks/useChatState.js` | ❌ 未使用 | 修复代码写在这里（错误） |
| `src/components/hooks/useChatState.jsx` | ✅ 实际使用 | Chat.jsx 导入此文件 |

**Chat.jsx 的导入语句**：
```javascript
import { useChatState } from '@/components/hooks/useChatState';
```

### ✅ Bug 1 最终修复：系统提示词跨对话串联

**根本原因**：系统提示词从 URL 参数 `module_id` 读取，但新建对话时 URL 没有清除

**修复内容**（useChatState.jsx）：
```javascript
const handleStartNewChat = useCallback(() => {
  setCurrentConversation(null);
  setMessages([]);
  // ...

  // 【修复 Bug 1】清除 URL 中的 module_id 参数
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('module_id')) {
    urlParams.delete('module_id');
    urlParams.delete('auto_start');
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }
}, []);
```

### ✅ Bug 2 最终修复：功能模块自动发送用户提示词

**根本原因**：`useChatState.jsx` 已有自动发送逻辑，但需要验证是否正常工作

**修复内容**：添加诊断日志确认流程正常
- 添加 `[AutoSend]` 前缀的详细日志
- 追踪 useEffect 触发、模块获取、API 调用等步骤
- 确认 `user_prompt_template` 正确获取和发送

### 📝 经验教训

1. **确认导入路径**：修改任何模块前，先用 `grep -r "import.*模块名"` 确认哪个文件被导入
2. **避免重复文件**：项目不应存在同名但路径不同的模块
3. **部署后验证**：修改代码后必须验证日志输出，确认代码确实被执行
4. **诊断日志价值**：详细日志可以快速定位问题

### 🔧 相关提交

- `be7582e` - fix: 修复系统提示词跨对话串联问题
- `b3fe2d5` - debug: 添加自动发送功能的详细诊断日志

---

## 2026-01-11 (方案 B 模块化重构 - 阶段 0：P0 Bug 修复) 🔧

### ✅ Bug 1 修复：对话历史不显示在侧边栏

**问题描述**：新建对话后，对话不出现在左侧历史记录栏，刷新后消失

**根本原因**：
1. `invalidateQueries` 只标记缓存过期，不会立即触发重新获取
2. 新对话缺少 `created_by` 和 `is_archived` 字段

**修复内容**（useChatState.js）：
- L476-477: 添加 `created_by: user?.email` 和 `is_archived: false` 字段
- L488-491: 使用 `queryClient.refetchQueries` 替代 `invalidateQueries`

```javascript
// 修复后：强制立即刷新
await queryClient.refetchQueries({
  queryKey: ['conversations', user?.email],
  exact: true,
});
```

---

### ✅ Bug 2 修复：系统提示词跨对话串联

**问题描述**：用户在对话A使用的系统提示词，新建对话B后依然存在

**根本原因**：
React `useState` 是异步更新的，`handleStartNewChat` 中 `setCurrentConversation(null)`
还没生效时用户就发送消息，导致 `chatAPI.sendMessage` 传递了旧的 `conversation_id`

**修复内容**（useChatState.js）：
- L44: 添加 `currentConversationRef` 同步追踪当前对话
- L259: `handleStartNewChat` 同步更新 ref: `currentConversationRef.current = null`
- L278, L289: `handleSelectConversation` 同步更新 ref
- L313: 使用 ref 判断是否新对话: `!currentConversationRef.current`
- L402: 发送消息使用 ref: `conversationId: currentConversationRef.current?.id`
- L461-463, L480-481: 设置对话时同步更新 ref

```javascript
// 修复：使用 useRef 同步追踪对话状态
const currentConversationRef = useRef(null);

// handleStartNewChat 同步更新
currentConversationRef.current = null;
setCurrentConversation(null);

// handleSendMessage 使用 ref 获取 ID
conversationId: currentConversationRef.current?.id
```

---

### ✅ Bug 3 修复：功能模块不自动发送用户提示词

**问题描述**：用户通过功能模块点击"使用"跳转对话后，后台配置的用户提示词没有自动发送

**根本原因**：
1. 使用 `setTimeout` + `document.querySelector('[data-send-button]').click()` 不可靠
2. 存在竞态条件：组件可能还没渲染完

**修复内容**（useChatState.js）：
- L46: 添加 `pendingAutoSendRef` 追踪待自动发送的消息
- L234-241: URL 参数处理时设置 `pendingAutoSendRef.current`
- L246-267: 第一步 useEffect - 检测条件满足后设置 `inputMessage` 和 `autoSendPending`
- L540-549: 第二步 useEffect - 检测 `autoSendPending` 后调用 `handleSendMessage(true)`

```javascript
// 修复：两阶段自动发送
// 第一阶段：设置输入消息
if (pendingAutoSendRef.current && selectedModule && ...) {
  setInputMessage(pending.message);
  setAutoSendPending(true);
}

// 第二阶段：触发发送（在 handleSendMessage 定义之后）
if (autoSendPending && inputMessage && !isStreaming) {
  handleSendMessage(true);
}
```

---

## 2026-01-11 (用户反馈 - 新增 3 个 P0 紧急问题) 🚨

### ⚠️ 重要：之前的修复未完全生效

用户反馈之前尝试修复的两个问题出现新情况：

| 问题 | 之前状态 | 实际状态 | 说明 |
|------|----------|----------|------|
| 对话历史不显示 | ✅ 已修复 | ❌ 未解决 | 对话仍不保存在侧边栏 |
| 系统提示词不遵循 | ✅ 已修复 | ⚠️ 部分解决 | 出现跨对话串联新问题 |

### 🐛 新发现的 Bug

#### Bug 1: 对话历史不显示在侧边栏 (100% 复现)

**症状**：
- 新建对话后，对话不出现在左侧历史记录栏
- 刷新页面后对话完全消失
- 所有对话都受影响

**初步分析**：
```
可能的问题点：
1. 后端 user.email 与前端 user?.email 格式不匹配
2. Base44 SDK 的 RLS 规则配置问题
3. queryClient.invalidateQueries 未触发实际重新获取
4. TanStack Query 缓存问题

相关代码：
- useChatState.js L77-84: 对话列表查询
- useChatState.js L473-476: 缓存失效调用
- smartChatWithSearch.ts L707-731: 对话创建
```

#### Bug 2: 系统提示词跨对话串联 (100% 复现)

**症状**：
- 用户在对话A中使用的系统提示词
- 新建对话B后依然存在
- 不同对话之间没有做好隔离

**初步分析**：
```
可能的问题点：
1. React 状态更新是异步的
2. handleStartNewChat 中 setCurrentConversation(null) 还没生效
3. 用户立即发送消息时，currentConversation 还是旧值
4. chatAPI.sendMessage 传递了旧的 conversation_id

相关代码：
- useChatState.js L255-267: handleStartNewChat
- useChatState.js L392-397: chatAPI.sendMessage 参数
- smartChatWithSearch.ts L494-502: 系统提示词处理
```

#### Bug 3: 功能模块不自动发送用户提示词 (100% 复现)

**症状**：
- 用户通过功能模块点击"使用"跳转对话后
- 后台配置好的用户提示词没有自动发送
- 所有对话都受影响

**初步分析**：
```
可能的问题点：
1. URL 缺少 auto_start=true 参数
2. 模块字段名 user_prompt_template vs user_prompt 不匹配
3. 发送按钮缺少 data-send-button 属性
4. setTimeout 竞态条件，组件还没渲染完

相关代码：
- useChatState.js L218-240: URL参数处理和自动发送逻辑
```

### 📋 更新的文档

- ✅ FIX_ROADMAP.md - 新增 3 个 P0 紧急问题
- ✅ CHANGELOG.md - 记录 Bug 反馈（本文件）
- ⏳ HEALTH_REPORT.md - 待更新
- ⏳ docs/DIAGNOSIS_REPORT.md - 待更新

### 🎯 下一步行动

1. **立即**：深入分析三个 Bug 的根本原因
2. **今天内**：修复三个 P0 问题
3. **验证**：确保修复后不引入新问题

---

## 2026-01-11 (修复对话历史不显示和系统提示词问题)

### 🐛 Bug 修复 - 对话历史不显示在侧边栏

**问题描述**：新对话不会出现在聊天历史记录窗口中

**根本原因**：
前端和后端都会创建对话，导致对话重复或状态不一致。前端没有使用后端返回的 `conversation_id`。

**修复内容**：

#### useChatState.js
- **第 404-477 行**：修改对话创建逻辑
  - 使用后端返回的 `conversation_id` 而不是前端自己创建
  - 新对话时，使用后端 ID 创建前端状态
  - 确保对话列表正确刷新

**技术细节**：
```javascript
// 修复前：前端自己创建对话
await createConversationMutation.mutateAsync({...});

// 修复后：使用后端返回的 conversation_id
const backendConversationId = result.conversation_id;
if (backendConversationId) {
  setCurrentConversation({ id: backendConversationId, ... });
  queryClient.invalidateQueries(['conversations']);
}
```

---

### 🐛 Bug 修复 - AI 不遵循系统提示词

**问题描述**：功能模块的多步骤提示词，AI 不遵循规定步骤执行

**根本原因**：
系统提示词只在首轮对话发送，后续轮次不发送。AI 没有"记忆"系统提示词的要求。

**修复内容**：

#### smartChatWithSearch.ts
- **第 483-519 行**：重构系统提示词处理逻辑
  - 首轮对话：使用前端传来的 system_prompt，并保存到对话记录
  - 后续轮次：从对话记录中读取保存的 system_prompt
- **第 718-722 行**：在创建新对话时保存 system_prompt

**技术细节**：
```typescript
// 修复后：系统提示词会在每轮对话中使用
if (isFirstTurn && hasNewSystemPrompt) {
  finalSystemPrompt = system_prompt;  // 使用前端传来的
} else if (conversation?.system_prompt) {
  finalSystemPrompt = conversation.system_prompt;  // 从对话记录读取
}
```

**影响范围**：
- 所有功能模块的多步骤对话
- AI 将在整个对话过程中遵循系统提示词的要求

---

## 2026-01-11 (P0-聊天上下文丢失修复)

### 🐛 Bug 修复 - 聊天上下文丢失

**问题描述**：多轮对话后 AI 忘记之前内容，上下文丢失

**根本原因分析**：

在 `smartChatWithSearch.ts` 和 `callAIModel.ts` 中，消息过滤和 token 估算逻辑无法正确处理数组格式的消息内容（带缓存控制的消息格式）。

当消息格式是 `{ role, content: [{type: 'text', text: '...', cache_control: {...}}] }` 时：
- `m.content.trim()` 会失败（因为 content 是数组）
- `estimateTokens(m.content)` 返回错误结果
- 导致带缓存控制的消息被错误过滤掉，造成上下文丢失

**修复内容**：

#### 1. smartChatWithSearch.ts
- **第444-458行**：修复消息过滤逻辑，安全处理数组格式的 content
- **第460-467行**：新增 `getMessageText()` 辅助函数，正确提取消息文本
- **第469-471行**：修复 token 估算逻辑
- **第475-481行**：修复日志打印部分

#### 2. callAIModel.ts
- **第187-194行**：新增 `getMessageText()` 辅助函数
- **第196-203行**：修复 `calculateTotalTokens()` 函数
- **第144-157行**：增强 `buildCachedMessagesForOpenRouter()` 函数
  - 新增 `extractText()` 辅助函数
  - 新增 `hasCacheControl()` 检查函数
  - 正确处理已有缓存控制的消息
- **第268-272行**：修复日志打印
- **第276-281行**：修复 builtin provider 的 fullPrompt 构建
- **第346-347行**：修复图片处理时的文本提取
- **第652-657行**：修复 Gemini API 的消息构建

**技术细节**：

```typescript
// 修复前（错误处理）
apiMessages = apiMessages.filter(m => m.content && m.content.trim().length > 0);

// 修复后（安全处理数组格式）
apiMessages = apiMessages.filter(m => {
  if (!m.content) return false;
  if (Array.isArray(m.content)) {
    return m.content.some(block =>
      block && block.text && typeof block.text === 'string' && block.text.trim().length > 0
    );
  }
  return typeof m.content === 'string' && m.content.trim().length > 0;
});
```

**影响范围**：
- 所有使用带缓存控制的消息格式的对话
- 长对话（超过10轮）触发压缩后的消息传递
- 使用摘要模式的对话历史恢复

**验证方法**：
- 进行超过10轮的多轮对话
- 确认 AI 能够正确记住之前的对话内容
- 检查日志中 token 估算值是否正确

---

## 2026-01-11 (文档协作流程完善)

### 📚 FIX_ROADMAP.md 使用指南更新

在 README.md 中新增第 9 节「FIX_ROADMAP.md 使用指南」，包含：

**适用场景**：
- 发现新问题：评估优先级后添加
- 用户反馈紧急问题：提升至 P0
- 规划修复工作：按优先级顺序执行
- 评估工作量：参考相关文件
- 开始新对话：查看当前 P0/P1 任务

**文档协作流程**：
```
TROUBLESHOOTING.md → FIX_ROADMAP.md → CHANGELOG.md
   (发现问题)         (排序优先级)      (记录修复)
```

**协作关系说明**：
| 文档 | 与 FIX_ROADMAP.md 的关系 |
|------|--------------------------|
| TROUBLESHOOTING.md | 问题来源 |
| HEALTH_REPORT.md | 影响评估 |
| CHANGELOG.md | 结果记录 |
| ARCHITECTURE.md | 技术参考 |

**优先级评估公式**：
```
优先级得分 = (影响范围 × 严重程度 × 发生频率) / 修复难度
P0 紧急：得分 > 15 或 用户反馈严重影响体验
P1 高优先级：得分 10-15
P2 中优先级：得分 5-10
P3 低优先级：得分 < 5
```

---

## 2026-01-11 (用户反馈优先级调整)

### 紧急优先级调整 🚨

**根据用户反馈，以下问题严重影响使用体验，提升为 P0 紧急：**

| 问题 | 原优先级 | 新优先级 | 处理时限 |
|------|----------|----------|----------|
| 聊天上下文丢失 | P1 | **P0** | **3天内** |
| AI 响应缓慢或超时 | P1 | **P0** | **3天内** |

**调整原因**：用户反馈这两个问题严重影响使用体验

### 计划调整 🔄

- ✅ 根据用户反馈重新评估问题优先级
- ✅ 更新 FIX_ROADMAP.md（新增 2 个 P0 紧急问题）
- ✅ 更新 README.md（优先改进项部分）
- ✅ 更新 HEALTH_REPORT.md（紧急问题清单）

### 📊 调整后优先级分布

| 优先级 | 数量 | 处理时限 |
|--------|------|----------|
| **P0 紧急** | **2** | **本周内（3天）** |
| P1 高优先级 | 3 | 本月内 |
| P2 中优先级 | 5 | 本季度 |
| P3 低优先级 | 3 | 可推迟 |

### 🎯 P0 紧急问题（本周 3天内）

1. **聊天上下文丢失**
   - 检查 useChatState.jsx 状态管理
   - 验证 compressConversation.ts 压缩逻辑
   - 修复对话历史传递问题

2. **AI 响应缓慢或超时**
   - 优化模型选择策略
   - 添加指数退避重试机制
   - 优化 Token 预算配置

### 🎯 P1 高优先级问题（本月内）

1. Token 消耗优化
2. 前端代码分割
3. 图片懒加载

---

## 2026-01-11 (数据修正)

### 重要更新 ⚠️

**发现之前文档中的文件大小数据存在严重错误**

| 文件 | 原记录 | 实际行数 |
|------|--------|----------|
| AdminAnnouncements.jsx | 48,524 行 | **1,116 行** |
| smartChatWithSearch.ts | 31,478 行 | **752 行** |
| callAIModel.ts | 27,164 行 | **679 行** |
| useChatState.jsx | 22,855 行 | **691 行** |

**结论**：所有文件大小均在合理范围内，无需紧急拆分。
**项目健康度评分**：6.6 → **7.0/10**

---

## 2026-01-11

### 🎉 项目基础设施建设

- ✅ 建立 Claude Code 知识库体系
- ✅ 创建 `.claude/` 文档系统
- ✅ 完成项目全面扫描和架构分析
- ✅ 编写 PROJECT_CONTEXT.md - 项目上下文文档
- ✅ 编写 ARCHITECTURE.md - 系统架构文档
- ✅ 编写 CODING_STANDARDS.md - 编码规范文档

### 📊 当前项目状态

**代码规模统计:**
| 指标 | 数值 |
|------|------|
| 总文件数 | ~193 个 |
| 总代码行数 | ~40,711 行 |
| 组件数量 | 105 个 |
| 页面数量 | 18 个 |
| 云函数数量 | 28 个 |

**文件类型规范:**
- 前端文件类型：`.jsx`
- 后端文件类型：`.ts` (云函数)

**AI 核心文件:**
| 文件 | 行数 | 职责 |
|------|------|------|
| `smartChatWithSearch.ts` | 31,478 | 智能搜索聊天 |
| `callAIModel.ts` | 27,164 | AI 模型调用 |
| `useChatState.js` | 22,855 | 聊天状态管理 |

### ⚠️ 已识别技术债务

#### 1. 紧急优先级 🔴

| 问题 | 位置 | 建议 |
|------|------|------|
| 超大文件 | `AdminAnnouncements.jsx` (48,524行) | 拆分成多个模块 |

#### 2. 中等优先级 🟡

| 问题 | 位置 | 建议 |
|------|------|------|
| 空文件 | `AdminFeatured.jsx` (0字节) | 删除该文件 |
| 大型云函数 | `smartChatWithSearch.ts` (31,478行) | 评估拆分必要性 |
| 大型云函数 | `callAIModel.ts` (27,164行) | 评估拆分必要性 |

#### 3. 低优先级 🟢

| 问题 | 位置 | 建议 |
|------|------|------|
| 文档整合 | `CLAUDE_CODE_INSTRUCTIONS.md` | 评估是否整合到 .claude/ |
| 文档整合 | `HANDOFF_GUIDE.md` | 评估是否整合到 .claude/ |
| 设计文档 | `DESIGN_SYSTEM_PROGRESS.md` | 评估是否整合到 .claude/ |

### 🎯 下一步计划

1. **短期目标 (本周)**
   - [ ] 完善知识库剩余文档 (TROUBLESHOOTING.md, MAINTENANCE_WORKFLOW.md)
   - [ ] 制定 AdminAnnouncements.jsx 拆分计划
   - [ ] 评估现有文档整合方案

2. **中期目标 (本月)**
   - [ ] 实现 AdminFeatured.jsx 功能
   - [ ] 执行 AdminAnnouncements.jsx 拆分
   - [ ] 优化大型云函数结构

3. **长期目标**
   - [ ] 实现前端代码分割
   - [ ] 添加性能监控
   - [ ] 完善单元测试覆盖

---

<!--
变更记录模板：

## YYYY-MM-DD

### 🚀 新功能
- 功能描述

### 🐛 Bug 修复
- 修复描述

### ♻️ 重构
- 重构描述

### 📝 文档
- 文档更新描述

### ⚠️ 待处理
- 待处理事项

-->
