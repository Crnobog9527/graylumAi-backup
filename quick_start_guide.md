# 🚀 快速开始 - 如何使用 Claude Code 执行重构

**文档版本**: 1.0
**生成日期**: 2026-01-14

---

## 第一步：准备工作

在开始之前，请确保您已经完成以下准备工作：

### 1. 创建 Supabase 项目

访问 [Supabase 官网](https://supabase.com/)，创建一个新项目，并记录以下信息：

- **Project URL**: `https://xxxxx.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Database Connection String**: `postgresql://postgres:...`

### 2. 创建 Vercel 账号

访问 [Vercel 官网](https://vercel.com/)，使用 GitHub 账号登录。

---

## 第二步：开始执行

打开完整的执行手册：`claude_code_instructions.md`

### 如何使用这个手册？

1. **找到任务块**：每个任务都以 `### ## 任务 X.X` 开头。
2. **复制整个任务块**：从 `### ## 任务` 到下一个 `### ## 任务` 之前的所有内容。
3. **粘贴给 Claude Code**：在 Claude Code 的对话框中粘贴这个任务块。
4. **等待执行完成**：Claude Code 会自动执行所有命令。
5. **验证结果**：根据【验证方法】检查输出是否正确。
6. **继续下一个任务**：重复以上步骤。

---

## 第三步：执行顺序

请严格按照以下顺序执行所有任务：

### **阶段一：环境搭建与项目初始化** (1-2天)
- 任务 1.1：环境准备与清理
- 任务 1.2：初始化 Monorepo
- 任务 1.3：创建 Next.js 前端应用
- 任务 1.4：创建共享包
- 任务 1.5：安装依赖并配置工作区
- 任务 1.6：提交初始化成果

### **阶段二：数据库与认证** (2-3天)
- 任务 2.1：创建数据库包并安装依赖
- 任务 2.2：配置 Drizzle ORM
- 任务 2.3：生成并执行数据库迁移
- 任务 2.4：集成 Supabase Auth
- 任务 2.5：创建登录页面
- 任务 2.6：提交第二阶段成果

### **阶段三：后端 API 重构** (5-7天)
- 任务 3.1：创建 API 包并安装依赖
- 任务 3.2：搭建 tRPC 服务
- 任务 3.3：在前端集成 tRPC Provider
- 任务 3.4：测试 tRPC 调用
- 任务 3.5：提交第三阶段成果

### **阶段四：前端 UI 与逻辑重构** (7-10天)
- 任务 4.1：集成 Shadcn/ui
- 任务 4.2：重构登录页面

### **阶段五：测试、部署与优化** (3-5天)
- 任务 5.1：配置 Vercel 部署
- 任务 5.2：提交所有代码并完成

---

## 第四步：示例 - 执行第一个任务

让我为您演示如何执行第一个任务。

### 复制以下内容给 Claude Code：

```
请执行以下 shell 命令，为项目重构做准备：

1.  进入 /home/ubuntu 目录。
2.  克隆 `Crnobog9527/graylumAi-backup` 仓库。
3.  进入仓库目录。
4.  创建一个名为 `refactor` 的新分支并切换到该分支。
5.  删除所有旧文件和目录（除了 .git 目录）。
6.  创建一个 README.md 文件，内容为 "# GraylumAI Modern Architecture Refactor"。
7.  提交这次清理工作。
8.  将新的 `refactor` 分支推送到远程仓库。

请按顺序执行以下命令：

cd /home/ubuntu && \
git clone https://github.com/Crnobog9527/graylumAi-backup.git graylumAi-refactor && \
cd graylumAi-refactor && \
git checkout -b refactor && \
git ls-files -z | xargs -0 rm -f && \
rm -rf .github/ migration_docs/ architecture_refactoring/ && \
echo "# GraylumAI Modern Architecture Refactor" > README.md && \
git add README.md && \
git commit -m "chore: initial setup for architecture refactor" && \
git push -u origin refactor
```

### Claude Code 会执行这些命令，并显示输出。

完成后，您可以在 GitHub 上看到一个新的 `refactor` 分支。

---

## 常见问题

### Q1: 如果某个任务执行失败怎么办？

**A**: 请将错误信息完整地复制给我（Manus），我会帮您诊断问题并提供解决方案。

### Q2: 我可以跳过某些任务吗？

**A**: 不建议跳过，因为任务之间存在依赖关系。如果您确实需要跳过，请先咨询我。

### Q3: 执行过程中需要填入密钥的地方怎么办？

**A**: 在任务 2.2 和 2.4 中，您需要手动替换 `YOUR_DATABASE_CONNECTION_STRING`, `YOUR_SUPABASE_URL`, `YOUR_SUPABASE_ANON_KEY` 为您自己的值。请在复制给 Claude Code 之前先修改这些占位符。

### Q4: 我可以一次性执行所有任务吗？

**A**: 不建议。最好分阶段执行，每完成一个阶段后验证结果，确保一切正常再继续。

---

## 需要帮助？

如果在执行过程中遇到任何问题，请随时联系我（Manus）。我会全程为您提供支持！

祝您重构顺利！🎉
