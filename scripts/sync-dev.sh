#!/bin/bash
# Development sync script - sync local changes to GitHub
# Usage: ./scripts/sync-dev.sh "commit message"

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMMIT_MSG="${1:-Update development code}"

echo -e "${GREEN}=== Syncing Development Changes ===${NC}\n"

# 1. Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test
if [ $? -ne 0 ]; then
  echo -e "${RED}Tests failed!${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 2. Build
echo -e "${YELLOW}Building...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed! Aborting.${NC}"
  exit 1
fi

# 3. Check status
echo -e "${YELLOW}Git status:${NC}"
git status -s

# 4. Add all changes
echo -e "${YELLOW}Adding changes...${NC}"
git add -A

# 5. Commit
echo -e "${YELLOW}Committing...${NC}"
git commit -m "$COMMIT_MSG" || {
  echo -e "${YELLOW}Nothing to commit${NC}"
  exit 0
}

# 6. Push to GitHub
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push origin $(git branch --show-current)

echo -e "\n${GREEN}=== Sync Complete ===${NC}"
echo -e "Branch: $(git branch --show-current)"
echo -e "Commit: $(git rev-parse --short HEAD)"
echo -e "Remote: up to date"
