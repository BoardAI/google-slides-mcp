#!/bin/bash
# Check sync status across all environments

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Sync Status ===${NC}\n"

# 1. Local version
LOCAL_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
echo -e "${YELLOW}LOCAL:${NC}"
echo -e "  Directory: $(pwd)"
echo -e "  Version: v$LOCAL_VERSION"
echo -e "  Branch: $(git branch --show-current)"
echo -e "  Last commit: $(git log -1 --format='%h - %s')"
if [[ -n $(git status -s) ]]; then
  echo -e "  Status: ${RED}Uncommitted changes${NC}"
  git status -s | head -5
else
  echo -e "  Status: ${GREEN}Clean${NC}"
fi
echo ""

# 2. Remote (GitHub)
echo -e "${YELLOW}GITHUB:${NC}"
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "not configured")
echo -e "  Repository: $REMOTE_URL"

# Check if ahead/behind
git fetch origin $(git branch --show-current) 2>/dev/null
AHEAD=$(git rev-list --count origin/$(git branch --show-current)..HEAD 2>/dev/null || echo "0")
BEHIND=$(git rev-list --count HEAD..origin/$(git branch --show-current) 2>/dev/null || echo "0")

if [ "$AHEAD" -gt 0 ]; then
  echo -e "  Status: ${RED}$AHEAD commits ahead${NC} (need to push)"
elif [ "$BEHIND" -gt 0 ]; then
  echo -e "  Status: ${RED}$BEHIND commits behind${NC} (need to pull)"
else
  echo -e "  Status: ${GREEN}In sync${NC}"
fi

# Latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "no tags")
echo -e "  Latest tag: $LATEST_TAG"
echo ""

# 3. npm registry
echo -e "${YELLOW}NPM REGISTRY:${NC}"
PACKAGE_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "unknown")

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm view $PACKAGE_NAME version 2>/dev/null || echo "not published")
  echo -e "  Package: $PACKAGE_NAME"
  echo -e "  Published: v$NPM_VERSION"

  if [ "$NPM_VERSION" = "not published" ]; then
    echo -e "  Status: ${YELLOW}Not published${NC}"
  elif [ "$NPM_VERSION" = "$LOCAL_VERSION" ]; then
    echo -e "  Status: ${GREEN}In sync with local${NC}"
  else
    echo -e "  Status: ${YELLOW}Local: v$LOCAL_VERSION, npm: v$NPM_VERSION${NC}"
  fi
else
  echo -e "  ${RED}npm not found${NC}"
fi
echo ""

# 4. Recommendations
echo -e "${BLUE}=== Recommendations ===${NC}"
if [[ -n $(git status -s) ]]; then
  echo -e "  ${YELLOW}→${NC} Commit and push your changes: ./scripts/sync-dev.sh \"message\""
elif [ "$AHEAD" -gt 0 ]; then
  echo -e "  ${YELLOW}→${NC} Push to GitHub: git push origin $(git branch --show-current)"
elif [ "$BEHIND" -gt 0 ]; then
  echo -e "  ${YELLOW}→${NC} Pull from GitHub: git pull origin $(git branch --show-current)"
elif [ "$NPM_VERSION" != "$LOCAL_VERSION" ] && [ "$NPM_VERSION" != "not published" ]; then
  echo -e "  ${YELLOW}→${NC} Version mismatch - consider releasing: ./scripts/release.sh"
else
  echo -e "  ${GREEN}✓${NC} Everything in sync!"
fi
