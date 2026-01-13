# GraylumAI 迁移执行指南与风险评估

**文档版本**: 1.0
**生成日期**: 2026-01-14

---

## 1. 执行指南

本指南为《模块化任务清单》中的每个任务提供了具体的执行命令、验证方法和应急预案。您只需将 **“Claude Code 执行命令”** 部分的内容复制并交给 Claude Code 执行即可。

### **任务 S1: 初始化项目与依赖**
- **Claude Code 执行命令**:
  ```
  请执行以下操作：
  1. 在项目根目录创建一个名为 `.env` 的文件。
  2. 在 `.env` 文件中写入以下内容，并将占位符替换为我提供的真实 Supabase 信息：
     VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
     VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
  3. 运行 `npm install @supabase/supabase-js` 命令来安装新的依赖库。
  ```
- **测试验证方法** (非技术人员):
  - 询问 Claude Code 是否成功创建了 `.env` 文件，并确认 `package.json` 文件中新增了 `@supabase/supabase-js` 这一行。
- **常见问题处理**:
  - **问题**: 安装失败。 **解决方案**: 检查网络连接，或尝试使用 `npm cache clean --force` 清理缓存后重试。
- **回滚方案**:
  - 运行 `npm uninstall @supabase/supabase-js` 并删除 `.env` 文件。

### **任务 S2: 移除 Base44 依赖**
- **Claude Code 执行命令**:
  ```
  请执行以下操作：
  1. 运行 `npm uninstall @base44/sdk @base44/vite-plugin` 命令。
  2. 编辑 `vite.config.js` 文件，删除文件顶部所有包含 `@base44/vite-plugin` 的 `import` 语句，并从 `plugins` 数组中移除 `base44()`。
  ```
- **测试验证方法** (非技术人员):
  - 询问 Claude Code 在 `package.json` 文件中是否已找不到 `@base44/sdk`。然后让它尝试运行 `npm run dev`，应用应该能启动，但页面会因为缺少后续代码而报错，这是正常现象。
- **常见问题处理**:
  - **问题**: 卸载后项目启动失败，提示找不到模块。 **解决方案**: 这是预期行为，因为后续任务会修复这些缺失的模块调用。确认卸载成功即可。
- **回滚方案**:
  - 运行 `npm install @base44/sdk @base44/vite-plugin` 并恢复 `vite.config.js` 的修改。

### **任务 DB1 & DB2: 创建数据库 Schema 并启用 RLS**
- **Claude Code 执行命令**:
  ```
  这项任务需要在 Supabase 平台手动完成，无需代码操作。请指导我完成以下步骤：
  1. 登录 Supabase 项目，进入 “SQL Editor”。
  2. 将您提供的 SQL 脚本（用于创建表和启用 RLS）粘贴进去并点击 “RUN”。
  ```
- **测试验证方法** (非技术人员):
  - 在 Supabase 的 “Table Editor” 中，您应该能看到新创建的 `profiles`, `conversations` 等表。点击表的 “Row Level Security” 标签，应该能看到已启用的策略。
- **常见问题处理**:
  - **问题**: SQL 脚本执行报错。 **解决方案**: 仔细检查 SQL 语法错误，或分段执行，确认是哪一句导致的问题。
- **回滚方案**:
  - 在 “SQL Editor” 中执行 `DROP TABLE public.conversations;` 等命令来删除创建的表。

### **任务 AUTH1: 创建 Supabase 客户端与认证上下文**
- **Claude Code 执行命令**:
  ```
  请执行以下操作：
  1. 在 `src/lib/` 目录下创建一个新文件 `supabaseClient.js`。
  2. 将以下代码写入 `supabaseClient.js`：
     import { createClient } from '@supabase/supabase-js';
     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
     const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  3. 完全重写 `src/lib/AuthContext.jsx` 文件，移除所有 base44 的逻辑，并使用 React Hooks 和 Supabase 的方法（如 `supabase.auth.onAuthStateChange`）来监听和管理用户登录状态。
  ```
- **测试验证方法** (非技术人员):
  - 此时应用会因为大量代码不兼容而无法正常运行。只需询问 Claude Code 是否已按要求创建和修改了文件。
- **常见问题处理**:
  - **问题**: `VITE_SUPABASE_URL` 未定义。 **解决方案**: 确认 `.env` 文件已正确创建并且项目已重新启动以加载环境变量。
- **回滚方案**:
  - 删除 `src/lib/supabaseClient.js` 并从 Git 历史中恢复 `src/lib/AuthContext.jsx` 的旧版本。

### **任务 API2: 迁移 `smartChatWithSearch` 核心函数**
- **Claude Code 执行命令**:
  ```
  请执行以下操作：
  1. 在项目根目录创建 `api/` 文件夹。
  2. 在 `api/` 目录下创建一个新文件 `smart-chat.ts`。
  3. 将旧的 `functions/smartChatWithSearch.ts` 文件中的业务逻辑（例如，如何构建 prompt、如何调用外部 AI 模型 API）复制到 `smart-chat.ts` 中。
  4. 将所有数据库操作（如 `base44.entities.Conversation.filter()`）替换为 Supabase 的等效查询（如 `supabase.from('conversations').select().eq('user_id', ...)`）。
  5. 确保函数从请求头中获取用户身份，并使用 Vercel 的环境变量来访问 Supabase 的服务密钥。
  ```
- **测试验证方法** (非技术人员):
  - 在后续前端适配完成后，您应该能像以前一样使用聊天功能。在 Supabase 的 `conversations` 表中，您会看到新的聊天记录被实时插入。
- **常见问题处理**:
  - **问题**: API 返回 401 未授权错误。 **解决方案**: 检查前端请求是否正确携带了 Supabase 的 JWT，以及后端函数是否正确解析了该 Token。
- **回滚方案**:
  - 删除 `api/smart-chat.ts` 文件。在 Vercel 控制台中回滚到上一个成功的部署版本。

---

## 2. 风险评估与应对方案

迁移过程中存在多种潜在风险。提前识别并制定应对方案是成功的关键。

| 风险类别 | 风险描述 | 可能性 | 影响程度 | 应对与缓解方案 |
|---|---|---|---|---|
| **数据迁移** | 在从 Base44 导出和导入到 Supabase 的过程中，发生数据丢失、损坏或格式错误。 | **高** | **严重** | 1. **完整备份**: 在操作前，务必从 Base44 导出所有数据的完整备份。
2. **分阶段迁移**: 先迁移非核心数据，最后迁移用户和对话等核心数据。
3. **验证脚本**: 编写脚本，在迁移后自动比对新旧数据库的数据行数、关键字段总和等，确保一致性。
4. **试运行**: 在正式迁移前，进行至少一次完整的演练。 |
| **认证系统** | 用户迁移后无法登录；新注册用户流程失败；旧的 `access_token` 失效导致用户体验中断。 | **中** | **严重** | 1. **用户沟通**: 提前通知用户认证系统将升级，并说明可能需要重置密码。
2. **密码重置流程**: 确保 Supabase 的密码重置邮件模板和流程工作正常。
3. **分批迁移用户**: 如果用户量大，可以考虑分批次迁移用户数据，降低单次操作的风险。 |
| **业务逻辑** | 核心功能（如 AI 聊天、积分计算）在迁移后出现 Bug 或行为不一致。 | **中** | **高** | 1. **单元测试**: 为新的 Vercel Serverless Functions 编写单元测试，特别是针对复杂计算逻辑。
2. **端到端测试**: 建立一个包含所有核心功能的测试用例清单，在上线前由专人完整测试一遍。
3. **功能开关**: 考虑为重要的新功能引入功能开关（Feature Flag），一旦出现问题可以快速禁用，而不影响系统其他部分。 |
| **性能问题** | 新架构下的 API 响应时间变长，或数据库查询效率低下，影响用户体验。 | **中** | **中** | 1. **数据库索引**: 为 Supabase 数据库中经常被查询的字段（如 `user_id`, `created_at`）创建索引。
2. **负载测试**: 使用工具（如 k6, Artillery）对核心 API 进行负载测试，模拟高并发场景。
3. **查询优化**: 使用 Supabase 的 `explain` 功能分析慢查询，并进行优化。 |
| **安全漏洞** | Supabase 的行级安全（RLS）策略配置错误，导致用户数据泄露；服务密钥意外暴露。 | **低** | **严重** | 1. **代码审查**: 对所有 RLS 策略和后端特权操作进行严格的代码审查。
2. **密钥管理**: 严格遵守规范，绝不将私有密钥硬编码在代码中，全部使用 Vercel 的环境变量管理。
3. **最小权限原则**: 确保 API 和数据库用户只拥有完成其任务所需的最小权限。 |

### **总体回滚策略**

在整个迁移过程中，原有的 Base44 应用将保持只读或维护模式，直到新平台完全验证通过。如果新平台出现严重问题无法在短时间内解决，最终的回滚方案是：

1.  将 DNS 解析切回原 Base44 应用。
2.  通知用户系统暂时回退到旧版。
3.  在新平台的独立环境中修复问题，然后重新规划上线时间。
