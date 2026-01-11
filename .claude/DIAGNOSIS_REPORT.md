# 深度诊断报告：3 个 P0 紧急 Bug

> 生成日期：2026-01-11
> 诊断版本：v1.0
> 状态：**待用户审阅**

---

## 执行摘要

经过深入分析，发现 3 个 P0 Bug 虽然表现各异，但**根本原因高度关联**：都与 **React 状态异步更新机制** 和 **TanStack Query 缓存同步** 有关。之前的修复策略（使用 `useRef` 和 `refetchQueries`）**方向正确但实现有缺陷**。

| Bug | 已实施修复 | 修复失败原因 | 置信度 |
|-----|-----------|-------------|--------|
| Bug 1: 对话历史不显示 | refetchQueries + created_by | queryKey 可能不匹配 / RLS 规则问题 | 80% |
| Bug 2: 系统提示词串联 | currentConversationRef | ref 更新时序问题 / 条件判断漏洞 | 90% |
| Bug 3: 自动发送不工作 | pendingAutoSendRef + 两阶段 useEffect | 条件检查过于严格 / 状态时序问题 | 85% |

---

## 第一部分：Bug 关联性分析

### 共同技术特征

三个 Bug 都涉及以下技术点：

```
┌─────────────────────────────────────────────────────────────────┐
│                     共同根本问题                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. React 状态异步更新 (useState)                                │
│     └─ setCurrentConversation/setSelectedModule 不是同步的        │
│                                                                   │
│  2. 组件渲染和状态更新时序                                        │
│     └─ useEffect 依赖项触发时机与预期不符                         │
│                                                                   │
│  3. TanStack Query 缓存与本地状态不同步                           │
│     └─ invalidateQueries vs refetchQueries 行为差异               │
│                                                                   │
│  4. 跨前后端数据一致性                                            │
│     └─ 前端乐观更新与后端实际状态可能不匹配                        │
└─────────────────────────────────────────────────────────────────┘
```

### Bug 相互影响分析

```
Bug 1 (对话不显示) ──┐
                     ├──→ 都使用 currentConversationRef
Bug 2 (提示词串联) ──┤
                     └──→ 都依赖 useState 异步更新后的状态
Bug 3 (自动发送) ────────→ 依赖 Bug 2 的 ref 机制 + selectedModule 状态
```

---

## 第二部分：每个 Bug 的根因假设

### Bug #1: 对话历史不显示在侧边栏

**现有修复代码** (`useChatState.js` L517-524):
```javascript
chatAPI.invalidateConversationList(user?.email);
chatAPI.invalidateConversation(backendConversationId);
await queryClient.refetchQueries({
  queryKey: ['conversations', user?.email],
  exact: true,
});
```

**根因假设 1 (置信度: 50%)** - queryKey 不匹配
- 问题：`user?.email` 可能在不同时刻有不同值
- 查询定义 (L81-88): `queryKey: ['conversations', user?.email]`
- 如果发送消息时 `user` 对象的 `email` 与查询缓存中的 `email` 有任何差异（大小写、空格等），refetchQueries 不会匹配

**根因假设 2 (置信度: 30%)** - Base44 RLS 规则问题
- 后端使用 `base44.asServiceRole.entities.Conversation.create()` 创建对话
- 前端使用 `base44.entities.Conversation.filter()` 查询
- 如果 RLS 规则配置为"只能查询自己创建的对话"但 `created_by` 字段格式不匹配，查询会返回空

**根因假设 3 (置信度: 20%)** - refetchQueries 静默失败
- `await queryClient.refetchQueries()` 可能因网络问题静默失败
- 代码没有检查 refetchQueries 的返回值或捕获异常

**验证方法**:
1. 在 `handleSendMessage` 中添加 console.log 打印 `user?.email` 值
2. 检查 Base44 后台的 RLS 规则配置
3. 在 refetchQueries 后检查 `queryClient.getQueryData(['conversations', user?.email])` 的值

---

### Bug #2: 系统提示词跨对话串联

**现有修复代码**:
- `currentConversationRef` (L44)
- `handleStartNewChat` 重置 ref (L283-284)
- `handleSendMessage` 使用 ref 判断 (L338)

**根因假设 1 (置信度: 60%)** - currentConversationRef 重置时机问题
- `handleStartNewChat` 中：`currentConversationRef.current = null;` (L284)
- 但如果用户快速操作（如双击"新对话"），可能存在竞态条件
- 验证：检查 `handleStartNewChat` 是否被重复调用

**根因假设 2 (置信度: 25%)** - 后端系统提示词读取逻辑漏洞
- `smartChatWithSearch.ts` L494-502:
  ```typescript
  if (isFirstTurn && hasNewSystemPrompt) {
    finalSystemPrompt = system_prompt;  // 使用前端传来的
  } else if (conversation && conversation.system_prompt) {
    finalSystemPrompt = conversation.system_prompt;  // 从对话记录读取
  }
  ```
- **问题**：如果 `conversation_id` 传递了旧值，`isFirstTurn` 为 false，会读取旧对话的 `system_prompt`

**根因假设 3 (置信度: 15%)** - systemPrompt 构建条件问题
- `useChatState.js` L334-348:
  ```javascript
  const isNewConversation = !currentConversationRef.current;
  if (hasModule && isFirstTurn && isNewConversation) {
    systemPrompt = `...`;
  }
  ```
- 如果任一条件为 false，systemPrompt 为空字符串
- 空字符串会被发送为 `undefined`，后端会尝试从对话记录读取

**验证方法**:
1. 在 `handleStartNewChat` 中添加 console.log 确认 ref 重置
2. 在 `handleSendMessage` 开始时打印 `currentConversationRef.current`
3. 检查后端日志中的 `[smartChatWithSearch] ===== SYSTEM PROMPT DECISION =====` 输出

---

### Bug #3: 功能模块不自动发送用户提示词

**现有修复代码**:
- 两阶段 useEffect (L250-267, L541-549)
- `pendingAutoSendRef` 和 `autoSendPending` 状态

**根因假设 1 (置信度: 50%)** - 条件检查过于严格
- 第一阶段 useEffect 条件 (L251-257):
  ```javascript
  if (
    pendingAutoSendRef.current &&      // 1. 有待发送消息
    selectedModule &&                   // 2. 已选择模块
    !currentConversationRef.current &&  // 3. 无当前对话
    messages.length === 0 &&            // 4. 消息列表为空
    !isStreaming &&                     // 5. 未在流式传输
    selectedModel                       // 6. 已选择模型
  )
  ```
- **问题**：所有 6 个条件必须**同时满足**，任一不满足就不会触发

**根因假设 2 (置信度: 35%)** - 状态更新时序问题
- 执行顺序：
  1. URL 参数解析 useEffect 运行 (L222-244)
  2. `handleStartNewChat(module)` 被调用
  3. `pendingAutoSendRef.current` 被设置
  4. 第一阶段 useEffect 检查条件
- **问题**：`handleStartNewChat` 中的 `setSelectedModule(module)` 是异步的
- 当第一阶段 useEffect 因 `selectedModule` 变化而触发时，`pendingAutoSendRef.current` 可能已经被设置（正确）或还没被设置（错误）

**根因假设 3 (置信度: 15%)** - useEffect 依赖项缺失
- 第一阶段 useEffect 依赖项：`[selectedModule, messages.length, isStreaming, selectedModel]`
- **缺失**：`pendingAutoSendRef.current` 变化不会触发 useEffect
- 因为 `useRef` 的变化不会触发重新渲染

**验证方法**:
1. 在 URL 参数处理 useEffect 中添加详细日志
2. 在第一阶段 useEffect 中打印所有 6 个条件的值
3. 检查 `pendingAutoSendRef.current` 设置时机与 useEffect 触发时机的关系

---

## 第三部分：之前修复失败的原因分析

### 修复策略评估

| 策略 | 正确性 | 实现问题 |
|------|--------|----------|
| 使用 `useRef` 同步追踪状态 | ✅ 正确 | ref 更新和读取的时序没有严格控制 |
| 使用 `refetchQueries` 刷新列表 | ✅ 正确 | queryKey 匹配问题未验证 |
| 两阶段 useEffect 处理自动发送 | ✅ 正确 | 条件检查过于严格，状态时序问题 |

### 共同的实现问题

1. **缺乏调试日志**
   - 修复代码没有添加足够的调试日志
   - 无法确定修复代码是否被执行、条件是否满足

2. **没有边界情况测试**
   - 快速连续操作（双击、快速切换）
   - 网络延迟情况
   - 组件卸载后的状态更新

3. **过于依赖 React 状态更新时序**
   - 假设 `useState` 更新后立即可用
   - 但 React 18 的并发特性可能导致更新被批处理

---

## 第四部分：系统性诊断计划

### Phase 1: 添加诊断日志（不修改逻辑）

```javascript
// Bug 1 诊断 - 在 handleSendMessage 中添加
console.log('[DEBUG-BUG1] User email:', user?.email);
console.log('[DEBUG-BUG1] Query key:', ['conversations', user?.email]);
console.log('[DEBUG-BUG1] Backend conversation_id:', backendConversationId);
console.log('[DEBUG-BUG1] Current conversations count:', conversations.length);

// Bug 2 诊断 - 在相关函数中添加
console.log('[DEBUG-BUG2] handleStartNewChat called, resetting ref');
console.log('[DEBUG-BUG2] currentConversationRef before send:', currentConversationRef.current);
console.log('[DEBUG-BUG2] isNewConversation:', !currentConversationRef.current);
console.log('[DEBUG-BUG2] systemPrompt being sent:', systemPrompt?.slice(0, 100));

// Bug 3 诊断 - 在 useEffect 中添加
console.log('[DEBUG-BUG3] Checking auto-send conditions:');
console.log('[DEBUG-BUG3]   pendingAutoSendRef:', !!pendingAutoSendRef.current);
console.log('[DEBUG-BUG3]   selectedModule:', !!selectedModule);
console.log('[DEBUG-BUG3]   currentConversationRef:', !currentConversationRef.current);
console.log('[DEBUG-BUG3]   messages.length:', messages.length);
console.log('[DEBUG-BUG3]   isStreaming:', isStreaming);
console.log('[DEBUG-BUG3]   selectedModel:', !!selectedModel);
```

### Phase 2: 验证根因假设

1. **Bug 1 验证步骤**:
   - [ ] 检查 refetchQueries 前后的缓存数据
   - [ ] 验证 Base44 RLS 规则配置
   - [ ] 测试手动调用 `queryClient.refetchQueries` 是否有效

2. **Bug 2 验证步骤**:
   - [ ] 确认 `handleStartNewChat` 正确重置 ref
   - [ ] 检查后端日志确认 conversation_id 是否正确传递
   - [ ] 验证系统提示词来源（前端新建 vs 对话记录）

3. **Bug 3 验证步骤**:
   - [ ] 逐一检查 6 个条件哪个不满足
   - [ ] 确认 `pendingAutoSendRef` 设置时机
   - [ ] 测试简化条件是否能触发自动发送

### Phase 3: 根据诊断结果制定修复方案

待 Phase 1 和 Phase 2 完成后，根据实际数据制定针对性修复方案。

---

## 第五部分：推荐的下一步行动

### 立即行动（获取用户确认后）

1. **添加 Phase 1 诊断日志** - 预计 15 分钟
   - 不修改任何业务逻辑
   - 只添加 console.log 用于收集数据

2. **部署并测试** - 预计 10 分钟
   - 在开发环境测试三个 Bug 的复现
   - 收集诊断日志

3. **分析日志确认根因** - 预计 20 分钟
   - 根据日志确认哪个根因假设正确
   - 更新诊断报告

4. **制定针对性修复方案** - 预计 15 分钟
   - 根据确认的根因制定修复方案
   - 提交用户审阅

### 可选的快速修复尝试

如果用户希望立即尝试修复，以下是**风险较低**的修复建议：

**Bug 1 快速修复**:
```javascript
// 在 refetchQueries 后添加强制刷新
await queryClient.refetchQueries({
  queryKey: ['conversations'],  // 移除 exact: true，使用模糊匹配
  type: 'active',
});
```

**Bug 2 快速修复**:
```javascript
// 在 handleSendMessage 开始时强制检查
if (messages.length === 0 && selectedModule) {
  // 这是新对话的第一条消息
  currentConversationRef.current = null;  // 强制重置
}
```

**Bug 3 快速修复**:
```javascript
// 放宽条件检查，使用 setTimeout 延迟执行
useEffect(() => {
  if (pendingAutoSendRef.current) {
    const pending = pendingAutoSendRef.current;
    pendingAutoSendRef.current = null;

    // 延迟执行，等待所有状态更新完成
    setTimeout(() => {
      if (!isStreaming) {
        setInputMessage(pending.message);
        setAutoSendPending(true);
      }
    }, 100);
  }
}, [selectedModule, selectedModel]);  // 简化依赖项
```

---

## 附录：关键代码位置参考

| 文件 | 行号 | 功能 |
|------|------|------|
| `useChatState.js` | L44 | currentConversationRef 定义 |
| `useChatState.js` | L46 | pendingAutoSendRef 定义 |
| `useChatState.js` | L81-88 | 对话列表查询定义 |
| `useChatState.js` | L250-267 | 自动发送第一阶段 useEffect |
| `useChatState.js` | L282-296 | handleStartNewChat 函数 |
| `useChatState.js` | L324-531 | handleSendMessage 函数 |
| `useChatState.js` | L541-549 | 自动发送第二阶段 useEffect |
| `smartChatWithSearch.ts` | L483-519 | 系统提示词处理逻辑 |
| `smartChatWithSearch.ts` | L707-732 | 对话创建逻辑 |

---

**报告状态**：等待用户审阅
**下一步**：请确认是否执行 Phase 1 诊断日志添加，或直接尝试快速修复方案
