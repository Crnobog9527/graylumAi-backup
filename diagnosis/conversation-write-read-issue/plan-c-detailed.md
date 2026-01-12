# 方案 C：整体重构详细计划（备用方案）

## 计划日期
2026-01-12

## 方案概述
- **方案名称**: 整体重构（彻底方案）
- **预计时间**: 2-3天
- **风险等级**: 中-高
- **长期价值**: 9/10

---

## 一、重构目标

### 核心目标
1. 彻底解决 user_email 为空导致的数据隔离问题
2. 建立清晰的分层架构（Service → Repository → Entity）
3. 统一客户端使用规范
4. 完善错误处理和字段验证
5. 清理历史孤儿数据

### 架构改进目标
- 代码组织性：7/10 → 9/10
- 错误处理完整性：5/10 → 9/10
- 数据完整性保证：3/10 → 9/10
- 可维护性：7/10 → 9/10
- **总分目标**：5.4/10 → 9.0/10

---

## 二、分阶段实施计划

### 阶段 1：基础设施建设（4小时）

#### 1.1 创建 ConversationRepository

**文件**: `functions/repositories/ConversationRepository.ts`

**职责**:
- 统一封装所有 Conversation 数据库操作
- 强制使用 `asServiceRole` 客户端
- 自动填充必填字段（user_email, created_date 等）
- 提供类型安全的接口

**接口设计**:
```
ConversationRepository:
  - create(data, userEmail) → Conversation
  - update(id, data) → Conversation
  - findById(id) → Conversation | null
  - findByUserEmail(email, options) → Conversation[]
  - delete(id) → boolean
  - listAll(options) → Conversation[]
```

#### 1.2 创建 ConversationService

**文件**: `functions/services/ConversationService.ts`

**职责**:
- 封装对话相关业务逻辑
- 处理对话创建、更新、删除流程
- 协调 Repository 和其他服务
- 提供事务性操作

**接口设计**:
```
ConversationService:
  - startNewConversation(userId, userEmail, message, options) → Conversation
  - continueConversation(conversationId, message, options) → Conversation
  - archiveConversation(conversationId) → boolean
  - getUserConversations(userEmail, options) → Conversation[]
  - repairOrphanedConversation(conversationId, userEmail) → boolean
```

#### 1.3 创建 ValidatorMiddleware

**文件**: `functions/middleware/ValidatorMiddleware.ts`

**职责**:
- 统一的请求参数验证
- 用户身份验证增强
- 必填字段检查

**验证规则**:
```
UserValidator:
  - user 对象必须存在
  - user.email 必须非空
  - user.email 必须是有效邮箱格式

ConversationValidator:
  - conversation_id 格式验证（如有）
  - message 非空检查
  - system_prompt 长度限制
```

---

### 阶段 2：核心重构（8小时）

#### 2.1 重构 smartChatWithSearch.ts

**改造要点**:
1. 引入 ConversationService 替代直接数据库操作
2. 使用 ValidatorMiddleware 验证请求
3. 简化主流程，职责下沉到 Service 层
4. 统一错误处理和响应格式

**代码结构变化**:
```
改造前:
smartChatWithSearch.ts (700+ 行)
  - 直接操作 entities
  - 混合业务逻辑和数据访问
  - 分散的验证逻辑

改造后:
smartChatWithSearch.ts (~300 行)
  - 调用 ValidatorMiddleware
  - 调用 ConversationService
  - 纯粹的流程编排
```

#### 2.2 重构其他相关云函数

**需要改造的函数**:
| 函数 | 改造内容 |
|------|----------|
| taskClassifier.ts | 使用 ConversationRepository |
| compressConversation.ts | 使用 ConversationService |
| cleanupConversationHistory.ts | 使用 ConversationRepository |
| exportConversations.ts | 使用 ConversationRepository |

---

### 阶段 3：客户端使用规范（2小时）

#### 3.1 建立客户端使用规范文档

**规范内容**:
```
后端（云函数）:
- 所有写操作（CREATE/UPDATE/DELETE）使用 asServiceRole
- 所有读操作使用 asServiceRole（除非特殊安全需求）
- 必须手动设置 user_email 字段

前端（src/）:
- 所有操作使用 entities（受 RLS 保护）
- 不直接写入敏感字段
- 依赖后端保证数据完整性
```

#### 3.2 代码审查和修复

**检查清单**:
- [ ] smartChatWithSearch.ts - 全部改为 asServiceRole
- [ ] taskClassifier.ts - 确认使用 asServiceRole
- [ ] compressConversation.ts - 确认使用 asServiceRole
- [ ] cleanupConversationHistory.ts - 确认使用 asServiceRole
- [ ] exportConversations.ts - 评估是否需要改造

---

### 阶段 4：数据清理和迁移（4小时）

#### 4.1 创建孤儿数据清理脚本

**文件**: `functions/maintenance/cleanupOrphanedConversations.ts`

**功能**:
1. 扫描所有 user_email 为空的 Conversation 记录
2. 尝试通过关联数据（如 CreditTransaction）推断正确的 user_email
3. 修复可修复的记录
4. 标记或归档无法修复的记录
5. 生成清理报告

**执行方式**:
- 手动触发（一次性执行）
- 可选定时任务（每周执行）

#### 4.2 数据完整性检查脚本

**文件**: `functions/maintenance/validateConversationData.ts`

**功能**:
1. 检查所有 Conversation 记录的必填字段
2. 检查 user_email 是否有效
3. 检查消息数组完整性
4. 生成数据健康报告

---

### 阶段 5：测试和验证（4小时）

#### 5.1 单元测试

**测试文件结构**:
```
functions/__tests__/
├── repositories/
│   └── ConversationRepository.test.ts
├── services/
│   └── ConversationService.test.ts
└── middleware/
    └── ValidatorMiddleware.test.ts
```

**测试覆盖**:
- Repository CRUD 操作
- Service 业务逻辑
- Validator 边界情况
- 错误处理流程

#### 5.2 集成测试

**测试场景**:
1. 新建对话 → 验证 user_email 正确设置
2. 继续对话 → 验证消息正确追加
3. 空 email 请求 → 验证被正确拒绝
4. 孤儿数据修复 → 验证自愈逻辑
5. 前端查询 → 验证 RLS 过滤正确

#### 5.3 回归测试

**关键场景**:
- [ ] 功能模块自动发送
- [ ] 对话压缩和摘要
- [ ] 对话导出
- [ ] 积分扣除和统计

---

## 三、文件变更清单

### 新增文件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| functions/repositories/ConversationRepository.ts | 新增 | 数据访问层 |
| functions/services/ConversationService.ts | 新增 | 业务逻辑层 |
| functions/middleware/ValidatorMiddleware.ts | 新增 | 验证中间件 |
| functions/maintenance/cleanupOrphanedConversations.ts | 新增 | 数据清理 |
| functions/maintenance/validateConversationData.ts | 新增 | 数据验证 |
| functions/__tests__/repositories/*.test.ts | 新增 | 单元测试 |
| functions/__tests__/services/*.test.ts | 新增 | 单元测试 |

### 修改文件

| 文件路径 | 修改范围 | 说明 |
|----------|----------|------|
| functions/smartChatWithSearch.ts | 大 | 重构为调用 Service |
| functions/taskClassifier.ts | 中 | 使用 Repository |
| functions/compressConversation.ts | 中 | 使用 Service |
| functions/cleanupConversationHistory.ts | 中 | 使用 Repository |
| functions/exportConversations.ts | 小 | 使用 Repository |

---

## 四、风险评估和缓解

### 风险清单

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 重构引入新 Bug | 中 | 高 | 完整的测试覆盖 + 分阶段部署 |
| 数据清理误删 | 低 | 高 | 先备份 + dry-run 模式 |
| 性能下降 | 低 | 中 | 性能测试 + 监控 |
| 部署失败 | 低 | 中 | 回滚计划 + 蓝绿部署 |
| 遗漏边界情况 | 中 | 中 | Code Review + 测试用例审查 |

### 回滚计划

```
阶段 1 回滚: 删除新增文件，无影响
阶段 2 回滚: git revert 相关提交
阶段 3 回滚: 恢复原客户端使用方式
阶段 4 回滚: 从备份恢复数据
阶段 5 回滚: 不适用（仅测试）
```

---

## 五、时间线

| 阶段 | 内容 | 时间 | 依赖 |
|------|------|------|------|
| Day 1 上午 | 阶段 1：基础设施建设 | 4h | 无 |
| Day 1 下午 | 阶段 2：核心重构（smartChatWithSearch） | 4h | 阶段 1 |
| Day 2 上午 | 阶段 2：其他函数重构 | 4h | 阶段 1 |
| Day 2 下午 | 阶段 3：客户端规范 + 阶段 4：数据清理 | 6h | 阶段 2 |
| Day 3 | 阶段 5：测试验证 + 部署 | 4h | 阶段 1-4 |

**总计**: 22小时（约 2.5-3 个工作日）

---

## 六、成功标准

- [ ] 新建对话 user_email 100% 正确设置
- [ ] 前端历史列表正确显示所有对话
- [ ] 空 email 请求 100% 被拒绝
- [ ] 历史孤儿数据清理完成
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 性能无明显下降（<10% 延迟增加）
- [ ] 代码质量评分 >= 8.5/10

---

## 七、后续优化（可选）

完成方案 C 后，可考虑的进一步优化：

1. **添加缓存层** - 减少数据库查询
2. **引入事件驱动** - 解耦服务间通信
3. **添加监控指标** - 数据完整性实时监控
4. **自动化测试流水线** - CI/CD 集成
