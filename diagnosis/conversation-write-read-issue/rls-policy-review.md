# Row Level Security 策略审查报告

## 审查日期
2026-01-12

---

## 第一部分：RLS 策略定位

### 策略存储位置

| 检查项 | 结果 |
|--------|------|
| 项目内 migration 文件 | ❌ 未找到 |
| 项目内 policy 定义 | ❌ 未找到 |
| 项目内 RLS 配置 | ❌ 未找到 |
| **结论** | RLS 在 Base44 平台层面配置，非代码控制 |

### Base44 平台特性

根据代码和历史文档分析：

```javascript
// src/api/base44Client.js
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false  // 客户端不强制认证
});
```

**Base44 客户端类型**：

| 客户端 | 用途 | RLS 行为 |
|--------|------|----------|
| `base44.entities` | 用户操作 | ✅ 受 RLS 限制 |
| `base44.asServiceRole.entities` | 服务操作 | ❌ 绕过 RLS |
| `base44.auth` | 认证操作 | 不适用 |

---

## 第二部分：推测的 RLS 策略

### Conversation 表策略推测

根据观察到的行为，推测 Base44 的 Conversation 表 RLS 策略：

```sql
-- 推测的策略定义（非实际代码）
CREATE POLICY conversation_user_isolation ON Conversation
  FOR ALL
  USING (user_email = current_user.email);

-- 或者更严格的版本
CREATE POLICY conversation_user_isolation ON Conversation
  FOR ALL
  USING (
    user_email IS NOT NULL
    AND user_email = current_user.email
  );
```

### 策略行为验证

| 场景 | user_email | 当前用户 | 匹配结果 | 能否查询 |
|------|------------|----------|----------|----------|
| 正常 | "a@b.com" | "a@b.com" | ✅ 匹配 | ✅ 能 |
| 正常 | "a@b.com" | "c@d.com" | ❌ 不匹配 | ❌ 不能 |
| **异常** | **null** | "a@b.com" | ❌ null ≠ string | ❌ 不能 |
| **异常** | **""** | "a@b.com" | ❌ "" ≠ "a@b.com" | ❌ 不能 |
| 服务角色 | 任意 | asServiceRole | 跳过检查 | ✅ 能 |

---

## 第三部分：场景分析

### Scenario 1: 创建后立即查询失败

**操作序列**：
```
1. base44.entities.Conversation.create({user_email: ""})  // user.email 为空
2. base44.entities.Conversation.filter({id: "xxx"})       // 用户身份查询
```

**分析**：

| 步骤 | 客户端 | RLS 影响 | 结果 |
|------|--------|----------|------|
| 创建 | entities | 受限 | 成功（创建不受 RLS 限制？） |
| 查询 | entities | 受限 | 失败（user_email 不匹配） |

**根因**：
- 创建可能不检查 RLS，或 RLS 仅在 SELECT 时生效
- 查询时 RLS 检查 `user_email = current_user.email`
- 空的 user_email 无法匹配任何用户
- 结果：404 Not Found

### Scenario 2: user_email 为空的记录查询

**数据库状态**：
```
| id | title | user_email |
|----|-------|------------|
| 1 | "对话A" | "a@b.com" |
| 2 | "对话B" | "a@b.com" |
| 3 | "123123" | null       |  ← 问题记录
```

**查询**：`base44.entities.Conversation.list()`

**RLS 过滤过程**：
```sql
-- 实际执行的查询（推测）
SELECT * FROM Conversation
WHERE user_email = 'a@b.com';  -- 当前用户

-- 结果：只返回 id=1 和 id=2
-- id=3 因为 null ≠ 'a@b.com' 被过滤
```

**结论**：用户永远无法通过 `entities` 客户端查询到 user_email 为空的记录

### Scenario 3: 后端 asServiceRole 查询

**操作**：`base44.asServiceRole.entities.Conversation.filter({id: "xxx"})`

**RLS 影响**：无 - 服务角色绕过 RLS

**结果**：
- 后端能查到所有记录（包括 user_email 为空的）
- 这解释了为什么日志显示创建成功，但前端查询失败

---

## 第四部分：历史问题回顾

### 从项目文档中提取的 RLS 相关问题

| 来源文件 | 问题描述 | 解决状态 |
|----------|----------|----------|
| FIX_ROADMAP_completed.md | "Base44 SDK 的 RLS 规则不允许查询自己创建的对话" | 已识别 |
| TROUBLESHOOTING_old.md | "后端查询对话时使用普通客户端，可能因 RLS 字段级权限不返回 system_prompt 字段" | 已修复 |
| TROUBLESHOOTING_old.md | "查询需要完整字段时，使用 asServiceRole 绕过 RLS 限制" | 已采用 |
| DIAGNOSIS_REPORT_P0_bugs.md | "如果 RLS 规则配置为只能查询自己创建的对话但 created_by 字段格式不匹配" | 未验证 |

### 历史修复尝试

```
1. 创建 listMyConversations 后端函数绕过 RLS ← 曾尝试
2. 后端统一使用 asServiceRole 查询 ← 已实施
3. 确保 user_email 字段正确写入 ← 未实施（当前问题）
```

---

## 第五部分：RLS 与客户端交互矩阵

### 完整交互矩阵

| 操作 | 客户端 | RLS 检查 | user_email 空时 | user_email 正确时 |
|------|--------|----------|-----------------|-------------------|
| 创建 | entities | ？ | ⚠️ 创建成功但无法查询 | ✅ 正常 |
| 创建 | asServiceRole | 跳过 | ✅ 创建成功 | ✅ 正常 |
| 查询 | entities | ✅ | ❌ 返回空 | ✅ 正常 |
| 查询 | asServiceRole | 跳过 | ✅ 能查到 | ✅ 正常 |
| 更新 | entities | ✅ | ❌ 无法更新 | ✅ 正常 |
| 更新 | asServiceRole | 跳过 | ✅ 能更新 | ✅ 正常 |
| 删除 | entities | ✅ | ❌ 无法删除 | ✅ 正常 |
| 删除 | asServiceRole | 跳过 | ✅ 能删除 | ✅ 正常 |

### 当前代码的问题

```
smartChatWithSearch.ts 当前状态：

创建: entities        ← user_email 空时，记录成为"孤儿"
查询: asServiceRole   ← 后端能查到
更新: asServiceRole   ← 后端能更新

前端 useChatState.jsx：

查询: entities        ← user_email 空时，查不到！
更新: entities        ← user_email 空时，改不了！
删除: entities        ← user_email 空时，删不掉！
```

---

## 第六部分：RLS 策略影响总结

### 问题根因确认

```
1. smartChatWithSearch.ts:623 使用 entities 创建
       ↓
2. user.email 可能为空
       ↓
3. 创建成功（RLS 可能不检查 INSERT）
       ↓
4. 记录的 user_email 为空
       ↓
5. 前端用 entities 查询
       ↓
6. RLS 检查: user_email = current_user.email
       ↓
7. null/空 ≠ "simonni@grayscalegroup.cn"
       ↓
8. 记录被过滤，返回 0 条
```

### RLS 策略的"陷阱"

| 陷阱 | 说明 | 影响 |
|------|------|------|
| **创建不受限** | INSERT 可能不检查 RLS | 可以创建不属于自己的记录 |
| **查询受限** | SELECT 严格检查 RLS | 空 user_email 的记录无法查询 |
| **无法自愈** | 一旦 user_email 为空 | 用户永远无法访问该记录 |
| **后端可见** | asServiceRole 绕过 | 造成前后端数据不一致的假象 |

### 需要 Base44 平台确认的问题

| 问题 | 重要性 | 目前状态 |
|------|--------|----------|
| Conversation 表的实际 RLS 策略是什么？ | HIGH | 未知 |
| INSERT 操作是否受 RLS 限制？ | HIGH | 推测不受限 |
| 是否有字段级 RLS（如 system_prompt）？ | MEDIUM | 历史文档提及 |
| 是否可以自定义 RLS 策略？ | LOW | 未知 |

---

## 第七部分：修复建议

### 短期修复（不依赖平台）

| 优先级 | 修复项 | 说明 |
|--------|--------|------|
| **P0** | 验证 user.email 非空 | 拒绝空 email 的请求 |
| **P0** | 创建改用 asServiceRole | 确保完全控制字段 |
| **P1** | 添加 user_email 回填逻辑 | 更新时检查并修复空值 |

### 长期建议（需平台支持）

| 建议 | 说明 |
|------|------|
| 请求 Base44 提供 RLS 策略文档 | 了解实际规则 |
| 考虑添加 userId 字段作为备用 | 不完全依赖 user_email |
| 定期清理孤儿记录 | 使用 asServiceRole 批量修复 |

---

## 附录：相关代码位置

| 功能 | 文件 | 行号 |
|------|------|------|
| 创建 Conversation | smartChatWithSearch.ts | 623 |
| 查询 Conversation（后端） | smartChatWithSearch.ts | 294 |
| 查询 Conversation（前端） | useChatState.jsx | 134 |
| user 获取 | smartChatWithSearch.ts | 114 |
| user 验证 | smartChatWithSearch.ts | 116-118 |
