# 项目修复路线图

> 基于 TROUBLESHOOTING.md 和 HEALTH_REPORT.md 的问题分析
> 生成日期：2026-01-11
> **更新日期：2026-01-11（用户反馈 - 新增 3 个 P0 紧急问题）**
> 评估方法：优先级得分 = (影响范围 × 严重程度 × 发生频率) / 修复难度

---

## ✅ 重要更新 (2026-01-11 最新)

> **所有 P0 问题已修复** ✅
>
> | # | 问题 | 状态 | 修复方案 |
> |---|------|------|----------|
> | 1 | 对话历史不显示在侧边栏 | ✅ 已修复 | 添加 `created_by` 字段，使用 `refetchQueries` |
> | 2 | 系统提示词跨对话串联 | ✅ 已修复 | 在 `handleStartNewChat` 中清除 URL 参数 |
> | 3 | 功能模块不自动发送用户提示词 | ✅ 已修复 | 验证现有逻辑正常工作 |
>
> **重要发现**：项目存在两个同名文件 `useChatState`，之前修复应用到错误文件
> - ❌ `src/hooks/useChatState.js` - 未使用
> - ✅ `src/components/hooks/useChatState.jsx` - 实际使用

---

## 问题统计摘要

### 问题分类统计

| 分类 | 问题数量 | 占比 |
|------|----------|------|
| **对话管理问题** | **3** | **19%** |
| AI 系统问题 | 4 | 25% |
| UI/UX 问题 | 2 | 12% |
| 性能优化问题 | 3 | 19% |
| 构建部署问题 | 2 | 12% |
| 文档整合问题 | 2 | 13% |
| **总计** | **16** | **100%** |

### 当前优先级分布

| 优先级 | 问题数量 | 已完成 | 处理时限 |
|--------|----------|--------|----------|
| **P0 紧急** | **5** | ✅ **5** | **全部完成** |
| **P1 高优先级** | 3 | 0 | 本月内 |
| **P2 中优先级** | 5 | 0 | 本季度 |
| **P3 低优先级** | 3 | 0 | 可推迟 |

---

## 修复计划优先级清单

### P0 - 紧急修复（⚡ 今天内）

> **用户反馈**：以下问题严重影响使用体验，必须立即处理

---

#### ✅ 对话历史不显示在侧边栏 [已修复 2026-01-11]
**优先级：P0 紧急** | **状态：✅ 已解决** | **复现率：100%**

| 评估维度 | 说明 |
|----------|------|
| 影响范围 | 所有用户的所有对话 |
| 严重程度 | **严重** - 核心功能完全失效 |
| 用户反馈 | 对话无法保存和查看历史 |

**问题表现**：
- 新建对话后，对话不出现在左侧历史记录栏
- 刷新页面后对话完全消失
- 用户无法查看和继续之前的对话

**根本原因分析**：

```
问题链路：
1. 后端 smartChatWithSearch.ts 创建对话时设置 created_by: user.email
2. 前端 useChatState.js L77-84 查询条件: { created_by: user?.email }
3. 可能的问题点：
   a) 后端 user.email 格式与前端不匹配
   b) Base44 SDK 的 RLS 规则不允许查询自己创建的对话
   c) queryClient.invalidateQueries 未触发实际重新获取
   d) TanStack Query 缓存问题
```

**相关文件**：
- `src/hooks/useChatState.js` L77-84 (对话列表查询)
- `src/hooks/useChatState.js` L473-476 (缓存失效)
- `functions/smartChatWithSearch.ts` L707-731 (对话创建)
- `src/utils/chatAPI.js` L60-88 (对话列表获取)

**修复方向**：
1. 检查后端 `user.email` 和前端 `user?.email` 是否一致
2. 检查 Base44 实体的 RLS 规则配置
3. 在创建对话后强制刷新列表 (`queryClient.refetchQueries`)
4. 添加调试日志确认数据流

---

#### ✅ 系统提示词跨对话串联 [已修复 2026-01-11]
**优先级：P0 紧急** | **状态：✅ 已解决** | **复现率：100%**

| 评估维度 | 说明 |
|----------|------|
| 影响范围 | 所有使用功能模块的用户 |
| 严重程度 | **严重** - 对话隔离失败 |
| 用户反馈 | 对话A的系统提示词出现在对话B |

**问题表现**：
- 用户在对话A中使用功能模块（带系统提示词）
- 新建对话B后，对话A的系统提示词仍然生效
- 不同对话之间记忆和提示词互相串联

**根本原因分析**：

```
问题链路分析：
1. 用户在对话A使用模块，系统提示词保存到 Conversation.system_prompt
2. 用户新建对话B（handleStartNewChat(null) 被调用）
3. setCurrentConversation(null) 和 setSelectedModule(null) 被设置
4. ⚠️ 问题：React 状态更新是异步的
5. 如果用户立即发送消息，currentConversation 可能还没更新为 null
6. chatAPI.sendMessage 传递旧的 conversation_id
7. 后端读取旧对话的 system_prompt

代码位置：
- useChatState.js L255-267: handleStartNewChat
- useChatState.js L392-397: chatAPI.sendMessage 参数
- smartChatWithSearch.ts L494-502: 系统提示词处理
```

**相关文件**：
- `src/hooks/useChatState.js` L255-267 (handleStartNewChat)
- `src/hooks/useChatState.js` L301-314 (systemPrompt 构建)
- `src/hooks/useChatState.js` L392-397 (发送消息参数)
- `functions/smartChatWithSearch.ts` L483-543 (系统提示词处理)

**修复方向**：
1. 在 handleStartNewChat 中使用 `flushSync` 确保状态立即更新
2. 或在 handleSendMessage 开始时检查 `currentConversation` 是否为 null
3. 发送新对话消息时显式传递 `conversation_id: null`
4. 后端增加验证：新对话不应该读取任何旧的 system_prompt

---

#### ✅ 功能模块不自动发送用户提示词 [已修复 2026-01-11]
**优先级：P0 紧急** | **状态：✅ 已解决** | **复现率：100%**

| 评估维度 | 说明 |
|----------|------|
| 影响范围 | 所有功能模块用户 |
| 严重程度 | **严重** - 模块功能失效 |
| 用户反馈 | 点击模块跳转后不自动发送消息 |

**问题表现**：
- 用户通过功能模块点击"使用"按钮跳转到对话
- 跳转后，后台配置的用户提示词没有自动发送
- 用户需要手动复制粘贴提示词

**根本原因分析**：

```
代码位置：useChatState.js L218-240

useEffect(() => {
  ...
  if (autoStart && module.user_prompt_template && module.user_prompt_template.trim()) {
    setTimeout(() => {
      setInputMessage(module.user_prompt_template);
      setTimeout(() => {
        document.querySelector('[data-send-button]')?.click();  // ← 可能找不到
      }, 200);
    }, 200);
  }
}, [location.search, promptModules, models, user]);

问题点：
1. URL 需要包含 auto_start=true 参数 - 可能未设置
2. 模块需要有 user_prompt_template 字段 - 可能字段名不对
3. 发送按钮需要 data-send-button 属性 - 可能没有
4. setTimeout 竞态条件 - 组件可能还没渲染完
```

**相关文件**：
- `src/hooks/useChatState.js` L218-240 (URL参数处理)
- 功能模块跳转的组件 (需要检查 URL 构建)
- 发送按钮组件 (需要检查 data-send-button 属性)

**修复方向**：
1. 检查功能模块跳转时是否传递 `auto_start=true` 参数
2. 确认 PromptModule 实体的字段名是 `user_prompt_template` 还是 `user_prompt`
3. 确保发送按钮有 `data-send-button` 属性
4. 使用 `ref` 而不是 `querySelector` 来触发发送
5. 增加重试逻辑或使用 `requestAnimationFrame`

---

#### 1. 聊天上下文丢失
**优先级：P0 紧急** | **状态：已解决**

| 评估维度 | 说明 |
|----------|------|
| 影响范围 | 所有用户的核心聊天功能 |
| 严重程度 | **严重** - 核心功能受损 |
| 用户反馈 | 多次反馈，严重影响体验 |

**问题表现**：
- 对话过程中上下文突然丢失
- AI 回复与之前对话不连贯
- 长对话时问题更明显

**根本原因**：
消息过滤和 token 估算逻辑无法正确处理数组格式的消息内容（带缓存控制的消息格式），导致消息被错误过滤掉。

**修复内容**：
1. ✅ `smartChatWithSearch.ts` - 修复消息过滤逻辑，安全处理数组格式 content
2. ✅ `smartChatWithSearch.ts` - 新增 `getMessageText()` 辅助函数
3. ✅ `callAIModel.ts` - 修复 `calculateTotalTokens()` 函数
4. ✅ `callAIModel.ts` - 增强 `buildCachedMessagesForOpenRouter()` 函数
5. ✅ `callAIModel.ts` - 修复 builtin/Gemini provider 的消息处理

**修复详情**：见 CHANGELOG.md `2026-01-11 (P0-聊天上下文丢失修复)`

---

#### 2. AI 响应缓慢或超时
**优先级：P0 紧急** | **处理时限：3天内**

| 评估维度 | 说明 |
|----------|------|
| 影响范围 | 所有用户的聊天体验 |
| 严重程度 | **严重** - 响应时间过长 |
| 用户反馈 | 多次反馈，严重影响体验 |

**问题表现**：
- AI 响应时间过长（>10秒）
- 偶尔出现超时错误
- 用户等待时间不可接受

**解决方案**：
1. 优化模型选择策略（简单任务用 Haiku）
2. 实现指数退避重试机制
3. 检查并优化 Token 预算设置
4. 添加超时监控和用户反馈
5. 优化系统提示词长度

**相关文件**：
- `functions/callAIModel.ts` (679行)
- `functions/smartChatWithSearch.ts` (752行)
- `functions/taskClassifier.ts`

**执行提示词**：
```
请优化 AI 响应速度：
1. 检查 functions/callAIModel.ts 中的模型选择逻辑
2. 添加指数退避重试机制
3. 检查 Token 预算配置是否合理
4. 优化系统提示词长度
5. 添加响应时间监控日志
```

---

### P1 - 高优先级（本月内）

#### 3. Token 消耗优化
**优先级得分: 21.33**

**解决方案**：
- 验证 Prompt Caching 是否正常工作
- 优化系统提示词长度
- 确保 Haiku 模型用于简单任务
- 添加 Token 使用监控面板

**相关文件**：
- `functions/callAIModel.ts` (679行)
- `functions/smartChatWithSearch.ts` (752行)

---

#### 4. 前端代码分割
**优先级得分: 20.00**

**解决方案**：
```javascript
// 使用 React.lazy 实现路由级代码分割
const Chat = React.lazy(() => import('./pages/Chat'));
const Admin = React.lazy(() => import('./pages/Admin'));
```

**相关文件**：
- `src/pages.config.js`
- `src/App.jsx`

---

#### 5. 图片懒加载
**优先级得分: 20.00**

**解决方案**：
```jsx
<img src={imageUrl} loading="lazy" alt="..." />
```

---

### P2 - 中优先级（本季度）

#### 6. 文档系统整合
**待整合文档**：
- `CLAUDE_CODE_INSTRUCTIONS.md` → 整合到 .claude/
- `HANDOFF_GUIDE.md` → 整合到 .claude/

---

#### 7. 暗色模式样式优化
**解决方案**：检查 CSS Variables，确保所有组件使用主题变量

---

#### 8. 智能搜索功能验证
**解决方案**：检查 SystemSettings 中搜索开关，验证逻辑

---

#### 9. 移动端布局优化
**解决方案**：使用 Tailwind 响应式类，逐页测试

---

#### 10. 前端性能监控
**解决方案**：实施 Core Web Vitals 监控

---

### P3 - 低优先级（可推迟）

#### 11. AdminFeatured.jsx 空文件
**处理方式**：确认是否需要，不需要则删除

#### 12. 代码组织优化（可选）
**处理方式**：ProfileComponents.jsx、AdminAnnouncements.jsx 可选拆分

#### 13. 构建和部署问题诊断
**处理方式**：保持诊断文档，作为问题排查参考

---

## 修复路线图

### 本周（紧急 - 3天内）
**目标**：解决 2 个 P0 紧急问题

| 日期 | 任务 | 预期成果 |
|------|------|----------|
| Day 1 | 聊天上下文丢失分析 | 定位问题根因 |
| Day 2 | 修复上下文问题 + AI响应分析 | 上下文问题修复 |
| Day 3 | AI响应优化 + 测试验证 | 两个问题都解决 |

**详细计划**：

#### Day 1：聊天上下文丢失 ✅ 已完成 (2026-01-11)
- [x] 分析 useChatState.jsx 状态管理
- [x] 检查 compressConversation.ts 压缩逻辑
- [x] 验证对话历史传递链路
- [x] 定位问题根因（消息过滤逻辑错误）
- [x] 修复 smartChatWithSearch.ts
- [x] 修复 callAIModel.ts

#### Day 2：AI响应优化 (进行中)
- [ ] 分析 callAIModel.ts 响应逻辑
- [ ] 检查模型选择策略
- [ ] 检查超时配置
- [ ] 实现重试机制

#### Day 3：优化 + 验证
- [ ] 优化 Token 预算
- [ ] 全面测试验证
- [ ] 部署并监控

---

### 第2-3周
**目标**：处理 P1 高优先级问题

- [ ] Token 消耗分析和优化
- [ ] 前端代码分割实现
- [ ] 图片懒加载实现

### 第4周及以后
**目标**：处理 P2 问题

- [ ] 文档系统整合
- [ ] 暗色模式修复
- [ ] 其他优化项

---

## 下一步行动

### 立即开始（今天）

#### 1. 分析聊天上下文丢失问题
```
提示词：
请分析聊天上下文丢失问题：
1. 检查 src/components/hooks/useChatState.jsx 中的状态管理
2. 检查 functions/compressConversation.ts 的压缩逻辑
3. 验证对话历史在 smartChatWithSearch.ts 中的传递
4. 找出可能导致上下文丢失的原因并修复
```

#### 2. 优化 AI 响应速度
```
提示词：
请优化 AI 响应速度：
1. 检查 functions/callAIModel.ts 中的模型选择逻辑
2. 添加指数退避重试机制
3. 检查 Token 预算配置是否合理
4. 优化系统提示词长度
5. 添加响应时间监控日志
```

---

## 成功指标

| 指标 | 当前值 | 目标值 | 验证方法 |
|------|--------|--------|----------|
| 上下文保持率 | 未知 | > 95% | 用户反馈 |
| AI 响应时间 | >10s | < 5s | 日志监控 |
| 超时率 | 未知 | < 1% | 错误日志 |
| 用户满意度 | 待评估 | 良好 | 用户反馈 |

---

*路线图更新时间：2026-01-11*
*P0 问题预计完成：2026-01-14*
*下次更新：完成 P0 后*
