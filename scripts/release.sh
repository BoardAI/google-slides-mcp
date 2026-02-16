#!/bin/bash
# Release script - keeps local, git, and npm in sync
# Usage: ./scripts/release.sh [patch|minor|major]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version bump type (default: patch)
BUMP_TYPE=${1:-patch}

echo -e "${GREEN}=== Google Slides MCP Release ===${NC}\n"

# 1. Check we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${RED}Error: Must be on main branch to release${NC}"
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

# 2. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}Error: You have uncommitted changes${NC}"
  git status -s
  exit 1
fi

# 3. Pull latest from remote
echo -e "${YELLOW}Pulling latest from origin...${NC}"
git pull origin main

# 4. Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test
if [ $? -ne 0 ]; then
  echo -e "${RED}Tests failed! Aborting release.${NC}"
  exit 1
fi

# 5. Build production bundle
echo -e "${YELLOW}Building production bundle...${NC}"
npm run clean
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed! Aborting release.${NC}"
  exit 1
fi

# 6. Bump version in package.json and create git tag
echo -e "${YELLOW}Bumping version ($BUMP_TYPE)...${NC}"
npm version $BUMP_TYPE -m "chore: release v%s"

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: $NEW_VERSION${NC}"

# 7. Push to GitHub (with tags)
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push origin main
git push origin --tags

# 8. Create GitHub release
echo -e "${YELLOW}Creating GitHub release...${NC}"
if command -v gh &> /dev/null; then
  gh release create "v$NEW_VERSION" \
    --title "v$NEW_VERSION" \
    --generate-notes \
    --notes "Release v$NEW_VERSION of Google Slides MCP Server"
else
  echo -e "${YELLOW}GitHub CLI not found, skipping GitHub release${NC}"
  echo "Create release manually at: https://github.com/michaelpolansky/google-slides-mcp/releases/new"
fi

# 9. Publish to npm
echo -e "${YELLOW}Publishing to npm...${NC}"
read -p "Publish to npm? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm publish
  echo -e "${GREEN}Published to npm!${NC}"
else
  echo -e "${YELLOW}Skipped npm publish${NC}"
fi

echo -e "\n${GREEN}=== Release Complete ===${NC}"
echo -e "Version: ${GREEN}v$NEW_VERSION${NC}"
echo -e "Git: ${GREEN}https://github.com/michaelpolansky/google-slides-mcp${NC}"
echo -e "npm: ${GREEN}https://www.npmjs.com/package/google-slides-mcp${NC}"
echo -e "\nTo use this version locally:"
echo -e "  ${YELLOW}npm install -g google-slides-mcp@$NEW_VERSION${NC}"
