#!/bin/bash
#
# update-docs.sh - 知识库自动维护脚本
# 功能: 检测最近7天代码变更，生成针对性的文档更新提示词
# 用法: ./update-docs.sh [天数]
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认检查天数
DAYS=${1:-7}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📚 Grayscale 知识库维护助手${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "检查范围: 最近 ${YELLOW}${DAYS}${NC} 天的代码变更"
echo ""

# 从 README.md 动态读取监控文件列表
README_PATH=".claude/README.md"
if [ ! -f "$README_PATH" ]; then
    echo -e "${RED}错误: 找不到 $README_PATH${NC}"
    exit 1
fi

# 提取关键代码文件监控列表中的文件路径
MONITORED_FILES=$(sed -n '/^```$/,/^```$/p' "$README_PATH" | grep -E '^(src/|functions/|package\.json|vite\.config|tailwind\.config)' | grep -v '^#' || true)

echo -e "${BLUE}📋 监控的关键文件:${NC}"
echo "$MONITORED_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        echo "   - $file"
    fi
done
echo ""

# 获取最近变更的文件
echo -e "${BLUE}🔍 检测最近 ${DAYS} 天的代码变更...${NC}"
echo ""

CHANGED_FILES=$(git log --since="${DAYS} days ago" --name-only --pretty=format: | sort | uniq | grep -v '^$' || true)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${GREEN}✅ 最近 ${DAYS} 天没有代码变更${NC}"
    echo ""
    exit 0
fi

# 分类变更文件
CORE_CHANGES=""
CONFIG_CHANGES=""
DESIGN_CHANGES=""
DOC_CHANGES=""
OTHER_CHANGES=""

while IFS= read -r file; do
    case "$file" in
        src/components/hooks/useChatState.jsx|functions/smartChatWithSearch.ts|functions/callAIModel.ts|functions/compressConversation.ts)
            CORE_CHANGES="${CORE_CHANGES}${file}\n"
            ;;
        package.json|vite.config.js|tailwind.config.js)
            CONFIG_CHANGES="${CONFIG_CHANGES}${file}\n"
            ;;
        src/theme.css|src/components.css)
            DESIGN_CHANGES="${DESIGN_CHANGES}${file}\n"
            ;;
        .claude/*.md)
            DOC_CHANGES="${DOC_CHANGES}${file}\n"
            ;;
        *)
            OTHER_CHANGES="${OTHER_CHANGES}${file}\n"
            ;;
    esac
done <<< "$CHANGED_FILES"

# 统计变更
TOTAL_CHANGES=$(echo "$CHANGED_FILES" | wc -l)
echo -e "总变更文件数: ${YELLOW}${TOTAL_CHANGES}${NC}"
echo ""

# 显示需要更新文档的变更
NEEDS_UPDATE=false

if [ -n "$CORE_CHANGES" ]; then
    NEEDS_UPDATE=true
    echo -e "${RED}⚠️  核心业务文件变更 (需更新 ARCHITECTURE.md, TROUBLESHOOTING.md):${NC}"
    echo -e "$CORE_CHANGES" | while read -r f; do [ -n "$f" ] && echo "   - $f"; done
    echo ""
fi

if [ -n "$CONFIG_CHANGES" ]; then
    NEEDS_UPDATE=true
    echo -e "${YELLOW}⚠️  配置文件变更 (需更新 PROJECT_CONTEXT.md):${NC}"
    echo -e "$CONFIG_CHANGES" | while read -r f; do [ -n "$f" ] && echo "   - $f"; done
    echo ""
fi

if [ -n "$DESIGN_CHANGES" ]; then
    NEEDS_UPDATE=true
    echo -e "${YELLOW}⚠️  设计系统变更 (需更新 CODING_STANDARDS.md):${NC}"
    echo -e "$DESIGN_CHANGES" | while read -r f; do [ -n "$f" ] && echo "   - $f"; done
    echo ""
fi

if [ -n "$DOC_CHANGES" ]; then
    echo -e "${GREEN}📝 知识库文档已更新:${NC}"
    echo -e "$DOC_CHANGES" | while read -r f; do [ -n "$f" ] && echo "   - $f"; done
    echo ""
fi

# 生成更新提示词
if [ "$NEEDS_UPDATE" = true ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📋 建议的 Claude Code 提示词:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "请更新知识库文档以反映最近的代码变更："
    echo ""

    if [ -n "$CORE_CHANGES" ]; then
        echo "1. 核心业务文件已变更:"
        echo -e "$CORE_CHANGES" | while read -r f; do [ -n "$f" ] && echo "   - $f"; done
        echo "   → 请更新 ARCHITECTURE.md 和 TROUBLESHOOTING.md"
        echo ""
    fi

    if [ -n "$CONFIG_CHANGES" ]; then
        echo "2. 配置文件已变更:"
        echo -e "$CONFIG_CHANGES" | while read -r f; do [ -n "$f" ] && echo "   - $f"; done
        echo "   → 请更新 PROJECT_CONTEXT.md"
        echo ""
    fi

    if [ -n "$DESIGN_CHANGES" ]; then
        echo "3. 设计系统已变更:"
        echo -e "$DESIGN_CHANGES" | while read -r f; do [ -n "$f" ] && echo "   - $f"; done
        echo "   → 请更新 CODING_STANDARDS.md"
        echo ""
    fi

    echo "请扫描上述文件的变更内容，同步更新对应的知识库文档，"
    echo "并更新 .claude/README.md 中的知识库状态信息。"
    echo ""
else
    echo -e "${GREEN}✅ 无需更新知识库文档${NC}"
    echo "   所有监控文件在最近 ${DAYS} 天内没有变更。"
    echo ""
fi

# 显示当前知识库状态
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 当前知识库状态:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 读取知识库状态
LAST_UPDATE=$(grep "最后全面更新" "$README_PATH" | head -1 | sed 's/.*| //' | tr -d ' |')
LAST_COMMIT=$(grep "最后同步 Commit" "$README_PATH" | head -1 | sed 's/.*`//' | sed 's/`.*//')
CURRENT_COMMIT=$(git rev-parse --short HEAD)

echo -e "最后全面更新: ${YELLOW}${LAST_UPDATE}${NC}"
echo -e "最后同步 Commit: ${YELLOW}${LAST_COMMIT}${NC}"
echo -e "当前 Commit: ${YELLOW}${CURRENT_COMMIT}${NC}"

if [ "$LAST_COMMIT" != "$CURRENT_COMMIT" ]; then
    COMMITS_BEHIND=$(git rev-list --count ${LAST_COMMIT}..HEAD 2>/dev/null || echo "?")
    echo -e "${YELLOW}⚠️  知识库落后 ${COMMITS_BEHIND} 个 commit${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
