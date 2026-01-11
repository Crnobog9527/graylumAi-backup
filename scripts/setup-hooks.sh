#!/bin/bash
#
# 安装 Git Hooks
# 运行此脚本将项目的 Git hooks 安装到 .git/hooks 目录
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "📦 安装 Git Hooks..."

# 检查 .git 目录是否存在
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ 错误: 未找到 .git 目录"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

# 复制 commit-msg hook
if [ -f "$SCRIPT_DIR/commit-msg" ]; then
    cp "$SCRIPT_DIR/commit-msg" "$HOOKS_DIR/commit-msg"
    chmod +x "$HOOKS_DIR/commit-msg"
    echo "✅ commit-msg hook 已安装"
else
    echo "⚠️  未找到 commit-msg hook"
fi

echo ""
echo "🎉 Git Hooks 安装完成!"
echo ""
echo "已安装的 hooks:"
echo "  - commit-msg: 检查提交信息格式"
echo ""
echo "提交信息规范:"
echo "  格式: <type>: <subject>"
echo "  示例: feat: 添加用户登录功能"
echo ""
