# GraylumAI 故障排除指南

本文档记录项目中遇到的常见问题、根本原因分析和解决方案。

---

## 问题列表

### 1. 系统提示词跨对话串联问题

**案例背景**
- 原问题描述：用户在对话 A 中使用功能模块的系统提示词后，新建对话 B 仍然继承了对话 A 的系统提示词
- 第一次修复尝试：创建 `listMyConversations` 后端函数绕过 RLS，同时修改前端 refs 清除逻辑
- 引入的新问题：第一次修复被回滚，但核心的对话隔离问题仍未解决

**根本原因**
1. **`processedModuleRef` 未被清除**：在 `handleStartNewChat(null)` 时，只清除了 `selectedModuleRef` 和 `currentConversationRef`，但 `processedModuleRef` 保留了之前的模块 ID
2. **模块检查条件不够严格**：原检查 `hasModule = currentModule !== null && currentModule !== undefined` 只验证非空，没有验证模块的实际有效性（必须有 `id` 和 `system_prompt`）
3. **状态同步问题**：React 状态更新是异步的，而 refs 是同步的，但在切换对话时没有全面清除所有相关 refs

**正确的解决方案**
```javascript
// 1. handleStartNewChat 中清除所有相关 refs
const handleStartNewChat = useCallback((module = null) => {
  currentConversationRef.current = null;
  selectedModuleRef.current = module || null;
  // 【关键】如果不是从模块启动，也清除已处理模块标记
  if (!module) {
    processedModuleRef.current = null;
  }
  // ... 其他代码
}, [models]);

// 2. handleSelectConversation 中也清除 processedModuleRef
const handleSelectConversation = useCallback(async (conv) => {
  // ...
  processedModuleRef.current = null;
  // ...
}, [models, queryClient]);

// 3. 使用更严格的模块验证
const hasValidModule = !!(currentModule && currentModule.id && currentModule.system_prompt);
```

**经验教训**
1. **全面清除状态**：切换对话/新建对话时，必须清除所有相关的 refs 和 state，不能遗漏任何一个
2. **严格验证条件**：检查对象有效性时，不仅要检查非空，还要验证必需的属性存在
3. **添加详细日志**：在关键节点添加日志，便于追踪状态变化和问题定位
4. **渐进式修复**：每次只修改必要的代码，避免引入新问题

**相关文件**
- `src/hooks/useChatState.js` - 前端状态管理钩子
- `functions/smartChatWithSearch.ts` - 后端聊天处理函数

---

### 2. 对话历史不显示问题（已解决）

**案例背景**
- 原问题描述：新建对话后，对话不出现在侧边栏的对话列表中
- 根本原因：Base44 SDK 使用 `asServiceRole` 创建对话时，`created_by` 字段不会设置为当前用户，导致前端按 `created_by` 查询时匹配不到

**正确的解决方案**
```typescript
// 后端：使用 entities 创建（而非 asServiceRole）
const newConv = await base44.entities.Conversation.create(createData);

// 前端：按 created_by 查询
const result = await base44.entities.Conversation.filter(
  { created_by: user?.email, is_archived: false },
  '-updated_date'
);
```

**经验教训**
- Base44 SDK 的 `asServiceRole` 绕过用户上下文，不会自动设置 `created_by`
- 创建记录时使用 `entities`（普通客户端），查询时可以使用 `asServiceRole`（如果需要完整字段）

**相关文件**
- `functions/smartChatWithSearch.ts` - 后端对话创建逻辑

---

### 3. 系统提示词在后续轮次失效问题（已解决）

**案例背景**
- 原问题描述：使用功能模块创建对话后，第一轮对话正常遵循系统提示词，但后续轮次 AI 不再遵循
- 根本原因：后端查询对话时使用普通客户端，可能因 RLS 字段级权限不返回 `system_prompt` 字段

**正确的解决方案**
```typescript
// 使用 asServiceRole 查询对话，获取完整字段
const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
```

**经验教训**
- Base44 的 RLS 可能影响返回的字段
- 查询需要完整字段时，使用 `asServiceRole` 绕过 RLS 限制

**相关文件**
- `functions/smartChatWithSearch.ts` - 后端对话查询逻辑

---

### 4. 修复代码应用到错误文件（重要案例）

**案例背景**
- 原问题描述：两个 P0 级别 Bug：(1) 系统提示词跨对话串联 (2) 功能模块「立即使用」不自动发送用户提示词
- 第一次修复尝试：在 `src/hooks/useChatState.js` 中进行修复
- 引入的新问题：修复代码完全无效，Bug 仍然存在

**根本原因**
项目中存在两个同名的状态管理文件：
```
src/hooks/useChatState.js           ← 修复代码写在这里（错误）
src/components/hooks/useChatState.jsx  ← 实际被 Chat.jsx 使用（正确）
```

`Chat.jsx` 的导入语句：
```javascript
import { useChatState } from '@/components/hooks/useChatState';
```

开发者修改了错误的文件，导致所有修复都没有生效。

**正确的解决方案**

**Bug 1 修复**（系统提示词串联）- 在正确的文件 `useChatState.jsx` 中：
```javascript
const handleStartNewChat = useCallback(() => {
  setCurrentConversation(null);
  setMessages([]);
  setInputMessage('');
  // ...其他清除代码

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

**Bug 2 修复**（自动发送）- 该文件已有自动发送逻辑，添加诊断日志确认工作正常。

**经验教训**
1. **确认导入路径**：修改任何模块前，先确认哪个文件被实际导入使用
2. **避免重复文件**：项目中不应存在同名但路径不同的模块，容易造成混淆
3. **部署后验证**：修改代码后必须验证日志输出，确认代码确实被执行
4. **诊断日志价值**：添加详细日志（如 `[AutoSend]` 前缀）可以快速定位问题
5. **使用 grep 搜索导入**：`grep -r "import.*useChatState" src/` 可以快速找到实际导入关系

**相关文件**
- `src/components/hooks/useChatState.jsx` - **实际使用的**前端状态管理钩子
- `src/hooks/useChatState.js` - 未使用的旧文件（应考虑删除或整合）
- `src/pages/Chat.jsx` - 导入 useChatState 的页面组件

---

## 调试技巧

### 1. 前端调试
- 打开浏览器控制台（F12）
- 搜索 `[handleStartNewChat]`、`[handleSendMessage]`、`[handleSelectConversation]` 等日志前缀
- 检查 refs 的值是否符合预期

### 2. 后端调试
- 在 Base44 后台查看函数日志
- 搜索 `[smartChatWithSearch]` 前缀的日志
- 检查 `SYSTEM PROMPT DECISION` 部分的日志

### 3. 常见问题排查步骤
1. 确认问题是前端还是后端导致
2. 检查相关 refs 和 state 的值
3. 检查 API 请求参数
4. 检查后端日志中的决策逻辑
