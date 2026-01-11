# Grayscale 项目知识库

> **Claude Code 快速参考指南**
> 每次新对话开始时，请首先阅读此文件

---

## 📊 知识库状态

| 状态项 | 值 |
|--------|-----|
| **最后全面更新** | 2026-01-11 |
| **最后同步 Commit** | `40c171e` |
| **知识库版本** | 2.0 |
| **核心文件数** | 8个 |

### 待更新项

<!-- 当代码变更时，在此记录需要同步的文档 -->
| 状态 | 待更新项 | 原因 |
|------|----------|------|
| ✅ | 无待更新项 | 文档与代码已同步 |

### 关键代码文件监控列表

> **重要**: 以下文件变更时需同步更新知识库

```
# 核心业务文件 (变更时更新 ARCHITECTURE.md, TROUBLESHOOTING.md)
src/components/hooks/useChatState.jsx
functions/smartChatWithSearch.ts
functions/callAIModel.ts
functions/compressConversation.ts

# 配置文件 (变更时更新 PROJECT_CONTEXT.md)
package.json
vite.config.js
tailwind.config.js

# 设计系统 (变更时更新 CODING_STANDARDS.md)
src/theme.css
src/components.css
```

---

## 🔧 知识库维护清单

### 每次代码修改后

- [ ] 检查是否涉及"关键代码文件监控列表"中的文件
- [ ] 更新 CHANGELOG.md 记录变更
- [ ] 如有 Bug 修复，更新 TROUBLESHOOTING.md

### 每周审查

- [ ] 运行 `./update-docs.sh` 检查代码变更
- [ ] 核对"待更新项"是否已清空
- [ ] 检查 HEALTH_REPORT.md 问题状态

### 每月审查

- [ ] 验证核心文件行数是否与文档一致
- [ ] 检查 P1/P2 问题进度
- [ ] 更新项目健康度评分

---

## 1. 文档导航表

| 文档 | 用途 | 何时阅读 |
|------|------|----------|
| **README.md** | 快速参考指南（本文件） | 每次对话开始时 |
| **PROJECT_CONTEXT.md** | 项目全貌、技术栈、功能模块 | 需要了解项目背景时 |
| **ARCHITECTURE.md** | 系统架构、数据流、AI 系统 | 开发新功能或重构时 |
| **CODING_STANDARDS.md** | 编码规范、命名规则、设计系统 | 编写代码前 |
| **CHANGELOG.md** | 变更日志、当前状态 | 了解最近变更时 |
| **TROUBLESHOOTING.md** | 故障排查、问题解决方案 | 遇到 Bug 或问题时 |
| **MAINTENANCE_WORKFLOW.md** | 维护流程、操作规范 | 执行维护任务时 |
| **HEALTH_REPORT.md** | 项目健康度评估、改进建议、修复路线图 | 规划工作或评估时 |

> **已整合文档**：历史文档已归档到 `archive/` 目录

---

## 2. 新对话快速启动流程（30秒）

### 步骤 1：读取最近状态
```
读取 .claude/CHANGELOG.md 最近 3 条变更
```

### 步骤 2：了解任务相关规范
| 任务类型 | 必读文档 |
|----------|----------|
| Bug 修复 | TROUBLESHOOTING.md |
| 新功能 | ARCHITECTURE.md + CODING_STANDARDS.md |
| UI 调整 | CODING_STANDARDS.md (设计系统部分) |
| AI 优化 | ARCHITECTURE.md (AI 章节) |
| **问题修复规划** | **HEALTH_REPORT.md** |
| **优先级评估** | **HEALTH_REPORT.md** |

### 步骤 3：开始工作
确认理解后，执行任务并更新 CHANGELOG.md

---

## 3. 项目核心信息速查

### 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + Vite 6 + Tailwind CSS |
| **UI 库** | shadcn/ui (Radix UI) |
| **状态管理** | @tanstack/react-query + 自定义 Hooks |
| **后端** | Base44 BaaS 云函数 (TypeScript) |
| **AI** | Claude API (Sonnet 4.5 / Haiku 4.5) |
| **部署** | Base44 平台自动部署 |

### 关键文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `ProfileComponents.jsx` | 1,348 | 用户资料组件 |
| `AdminAnnouncements.jsx` | 1,116 | 公告管理 |
| `smartChatWithSearch.ts` | 801 | 智能搜索聊天核心 |
| `callAIModel.ts` | 718 | AI 模型调用封装 |
| `useChatState.jsx` | 737 | 聊天状态管理（位于 components/hooks/）|

### 设计系统要点

- **组件库**: shadcn/ui (49 个基础组件)
- **主题**: CSS Variables (支持暗色模式)
- **图标**: lucide-react
- **图表**: recharts

### 核心 SaaS 功能

1. AI 聊天机器人（多模型路由）
2. 用户系统（注册/登录/邀请）
3. 积分/Credits 系统
4. 套餐订阅管理
5. 工单支持系统
6. 管理后台（12个页面）

---

## 4. 当前已知问题（优先处理）

### P0 紧急问题 🔴 - ✅ 全部已修复

> **2026-01-11 更新**：所有 P0 问题已修复完成

| 问题 | 状态 | 解决方案 |
|------|------|----------|
| **系统提示词跨对话串联** | ✅ 已修复 | `handleStartNewChat` 清除 URL 参数 |
| **功能模块不自动发送提示词** | ✅ 已修复 | 自动发送逻辑 + `autoSentRef` 防重复 |
| **对话历史不显示** | ✅ 已修复 | `refetchConversations()` 多次刷新 |
| **聊天上下文丢失** | ✅ 已修复 | 修复消息过滤逻辑处理数组格式 |
| **AI 响应缓慢或超时** | ⏳ 待验证 | 已有重试机制，需要监控 |

**详细修复方案**: 见 `TROUBLESHOOTING.md` 和 `CHANGELOG.md`

### P1 高优先级 🟡 （本月内）

| 问题 | 位置 | 状态 |
|------|------|------|
| Token 消耗优化 | `callAIModel.ts` | 待优化 |
| 前端代码分割 | `pages.config.js` | 待实现 |
| 图片懒加载 | 各图片组件 | 待实现 |

### P2 中优先级 🟢 （本季度）

| 问题 | 位置 | 状态 |
|------|------|------|
| 文档整合 | 旧文档与 .claude/ 系统 | 待整合 |
| 暗色模式优化 | CSS Variables | 待优化 |
| 空文件 | `AdminFeatured.jsx` | 待确认是否需要 |

---

## 5. 常用任务快捷指令

### Bug 修复
```
1. 查看 TROUBLESHOOTING.md 是否有类似问题
2. 定位问题代码
3. 修复并测试
4. 更新 TROUBLESHOOTING.md（如果是新问题）
5. 更新 CHANGELOG.md
```

### 添加新功能
```
1. 阅读 ARCHITECTURE.md 了解相关模块
2. 阅读 CODING_STANDARDS.md 确认规范
3. 编写代码（遵循命名规范、文件大小限制）
4. 测试功能和暗色模式
5. 更新 CHANGELOG.md
```

### 性能优化
```
1. 阅读 ARCHITECTURE.md 性能优化章节
2. 识别瓶颈（大文件、慢请求）
3. 实施优化（代码分割、缓存）
4. 对比优化前后性能
5. 更新 CHANGELOG.md
```

### UI 调整
```
1. 确认使用 shadcn/ui 组件
2. 使用 CSS Variables（不硬编码颜色）
3. 测试亮色和暗色模式
4. 确保响应式布局
5. 更新 CHANGELOG.md
```

### AI 功能优化
```
1. 阅读 ARCHITECTURE.md AI 系统章节
2. 理解 callAIModel.ts 模型路由逻辑
3. 修改时记录 Token 使用
4. 测试成本影响
5. 更新 CHANGELOG.md
```

---

## 6. 每次修改后必做事项

### CHANGELOG.md 更新格式

```markdown
## YYYY-MM-DD

### 修复 🐛
- ✅ [问题描述] - [解决方案]

### 新功能 ✨
- ✅ [功能名称] - [功能描述]

### 优化 ⚡
- ✅ [优化项] - [效果]
```

### 代码规范检查清单

- [ ] 命名规范（PascalCase/camelCase）
- [ ] 文件大小 < 1000 行
- [ ] 使用 shadcn/ui 组件
- [ ] 支持暗色模式
- [ ] 包含错误处理
- [ ] 无硬编码配置

### 功能测试检查清单

- [ ] 功能正常工作
- [ ] 未破坏现有功能
- [ ] 暗色模式显示正常
- [ ] 响应式布局正常
- [ ] 性能无明显劣化

---

## 7. 给非技术人员的使用建议

### 开始对话时的标准提示词

**推荐使用（可直接复制）**：
```
请先阅读 .claude/README.md 和 .claude/CHANGELOG.md，
了解项目当前状态后，帮我 [描述你的需求]
```

### 如何清楚描述需求

**好的示例** ✅
```
聊天页面的发送按钮在暗色模式下看不清，
请修复按钮在暗色模式下的显示问题。
```

**不好的示例** ❌
```
按钮有问题，帮我修一下。
```

### 如何确认工作完成

1. 查看 Claude 是否更新了 CHANGELOG.md
2. 确认代码已提交到 Git
3. 测试功能是否正常
4. 检查暗色模式显示

---

## 8. 遇到问题时的解决方案

### 问题类型与文档对应表

| 问题类型 | 首先查看 |
|----------|----------|
| 功能 Bug | TROUBLESHOOTING.md |
| 不知道代码在哪 | ARCHITECTURE.md |
| 不确定规范 | CODING_STANDARDS.md |
| AI 响应问题 | TROUBLESHOOTING.md (AI 章节) |
| UI 样式问题 | CODING_STANDARDS.md (设计系统部分) |
| 性能问题 | ARCHITECTURE.md (性能章节) |
| **多个问题需要排序** | **HEALTH_REPORT.md** |
| **制定修复计划** | **HEALTH_REPORT.md** |
| **评估问题紧急程度** | **HEALTH_REPORT.md** |

### 快速查找方式

```
在 TROUBLESHOOTING.md 中搜索关键词：
- "超时" / "timeout"
- "上下文" / "context"
- "暗色模式" / "dark"
- "Token"
```

---

## 10. 关键原则（5条）

### 1. 文档驱动开发 📝
> 先读文档，再写代码。代码变更必须同步更新文档。

### 2. 保持一致性 🎯
> 遵循现有代码风格和架构。使用 shadcn/ui 组件。

### 3. 记录变更 📋
> 所有修改必须记录在 CHANGELOG.md。

### 4. 质量优先 ✨
> 宁可慢一点，也要写规范的代码。

### 5. 成本意识 💰
> AI 调用必须考虑 Token 成本，优先使用 Haiku 处理简单任务。

---

## 11. 代码位置速查

### 前端代码结构
```
src/
├── api/              # Base44 SDK 封装
├── components/       # React 组件
│   ├── ui/           # shadcn/ui 基础组件 (49个)
│   ├── chat/         # 聊天组件 (15个)
│   ├── admin/        # 管理后台组件 (9个)
│   └── [其他模块]/
├── hooks/            # 全局 Hooks
│   └── use-mobile.jsx   # 移动端检测
├── pages/            # 页面组件 (18个)
├── lib/              # 工具库
└── utils/            # 工具函数
```

### 后端代码结构
```
functions/
├── smartChatWithSearch.ts   # AI 聊天核心
├── callAIModel.ts           # 模型调用封装
├── compressConversation.ts  # 对话压缩
├── taskClassifier.ts        # 任务分类
└── [其他云函数].ts
```

### 配置文件位置
```
根目录/
├── package.json        # 依赖配置
├── vite.config.js      # Vite 构建配置
├── tailwind.config.js  # Tailwind 配置
├── jsconfig.json       # 路径别名配置
└── components.json     # shadcn/ui 配置
```

### 文档系统位置
```
.claude/                     # 核心知识库 (8个文件)
├── README.md               # 快速参考（本文件）
├── PROJECT_CONTEXT.md      # 项目上下文
├── ARCHITECTURE.md         # 系统架构
├── CODING_STANDARDS.md     # 编码规范 + 设计系统
├── CHANGELOG.md            # 变更日志
├── TROUBLESHOOTING.md      # 故障排查 + 解决方案
├── MAINTENANCE_WORKFLOW.md # 维护流程
└── HEALTH_REPORT.md        # 健康报告 + 修复路线图

archive/                     # 历史文档归档
├── DIAGNOSIS_REPORT_P0_bugs.md
├── FIX_ROADMAP_completed.md
├── DESIGN_SYSTEM_PROGRESS.md
└── [其他历史文档]
```

---

## 12. 常见场景处理流程

### 场景 1：修复用户报告的 Bug

```
1. 在 TROUBLESHOOTING.md 搜索类似问题
2. 如有解决方案 → 直接应用
3. 如无 → 定位问题代码
4. 修复并测试
5. 在 TROUBLESHOOTING.md 添加新问题
6. 在 CHANGELOG.md 记录修复
7. 提交代码
```

### 场景 2：添加新的 UI 组件

```
1. 检查 shadcn/ui 是否有现成组件
2. 如有 → 直接使用
3. 如无 → 基于 Radix UI 创建
4. 使用 CSS Variables 定义颜色
5. 测试暗色模式
6. 在 CHANGELOG.md 记录新增
7. 提交代码
```

### 场景 3：优化 AI 功能

```
1. 阅读 ARCHITECTURE.md AI 章节
2. 理解现有逻辑：
   - callAIModel.ts: 模型调用
   - smartChatWithSearch.ts: 智能搜索
   - useChatState.jsx: 状态管理（位于 components/hooks/）
3. 修改时记录 Token 影响
4. 测试成本变化
5. 在 CHANGELOG.md 记录优化
6. 提交代码
```

### 场景 4：性能优化

```
1. 识别性能瓶颈
2. 阅读 ARCHITECTURE.md 性能章节
3. 选择优化方案：
   - 代码分割 (React.lazy)
   - 缓存策略
   - 文件拆分
4. 实施并测量效果
5. 在 CHANGELOG.md 记录优化
6. 提交代码
```

---

## 13. 项目健康指标

### 当前状态（2026-01-11）

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 总体健康度 | 7.0/10 | 8/10 | 🟢 |
| 最大文件行数 | 1,348 | <1,500 | 🟢 |
| 组件数量 | 105 | - | 🟢 |
| UI 基础组件 | 49 | - | 🟢 |
| 云函数数量 | 28 | - | 🟢 |

### 优先改进项

| 优先级 | 任务 | 预期影响 | 状态 |
|--------|------|----------|------|
| **P0** | 修复 P0 核心问题 | 核心功能恢复 | ✅ **已完成** |
| P1 | Token 消耗优化 | 成本降低 | 本月内 |
| P1 | 前端代码分割 | 首屏加载 -40% | 本月内 |
| P2 | 整合文档系统 | 维护效率 +30% | 本季度 |
| P2 | 清理重复文件 | 维护性提升 | 本季度 |

---

## 14. 🎉 知识库建立完成！

### 现在你拥有的能力

✅ **记忆能力** - 通过 CHANGELOG.md 记住所有变更
✅ **规范能力** - 通过 CODING_STANDARDS.md 保持代码一致
✅ **诊断能力** - 通过 TROUBLESHOOTING.md 快速解决问题
✅ **架构理解** - 通过 ARCHITECTURE.md 理解系统全貌
✅ **流程规范** - 通过 MAINTENANCE_WORKFLOW.md 规范操作

### 解决的核心问题

**之前**: 每次对话都是"失忆"状态，需要重新了解项目
**现在**: 30秒内读取文档，立即进入工作状态

---

## 14. 开始使用指南

### 第一次使用的完整提示词

```
我是这个项目的新维护者。请：
1. 阅读 .claude/README.md 了解项目概况
2. 阅读 .claude/PROJECT_CONTEXT.md 了解技术栈
3. 阅读 .claude/CHANGELOG.md 了解最近变更
4. 告诉我项目当前状态和待处理事项
```

### 日常维护的标准提示词

```
请先阅读 .claude/README.md 和 .claude/CHANGELOG.md，
然后帮我 [具体任务描述]
```

### 处理特定问题的提示词

```
请阅读 .claude/TROUBLESHOOTING.md，
然后帮我解决 [问题描述]
```

---

## 15. 获取帮助

### 遇到问题的处理步骤

```
1. 首先搜索 TROUBLESHOOTING.md
2. 其次查看 ARCHITECTURE.md 相关章节
3. 检查 CODING_STANDARDS.md 规范
4. 如果是新问题，记录到 TROUBLESHOOTING.md
```

### 文档的重要性

> **重要**: 文档是这个项目的"记忆"。
> 每次修改后更新文档，下次对话才能记住。
> 不更新文档 = 下次对话会"忘记"这次的工作。

---

## 快速命令参考

```bash
# 开发服务器
npm run dev

# 构建
npm run build

# 代码检查
npm run lint
npm run lint:fix

# 类型检查
npm run typecheck
```

---

*本文件是 Grayscale 项目知识库的入口。请每次对话开始时阅读此文件。*

**知识库版本**: 1.0
**建立日期**: 2026-01-11
**维护团队**: Grayscale Development Team
