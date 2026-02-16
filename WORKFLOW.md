# Development Workflow Guide

This document explains how to keep your local development, GitHub, and npm registry in sync.

## Quick Reference

```bash
# Check sync status across all environments
./scripts/status.sh

# Daily development - commit and push to GitHub
./scripts/sync-dev.sh "feat: add new feature"

# Release - version bump, tag, push, and publish to npm
./scripts/release.sh patch   # 1.0.0 → 1.0.1
./scripts/release.sh minor   # 1.0.0 → 1.1.0
./scripts/release.sh major   # 1.0.0 → 2.0.0
```

## The Three Environments

### 1. Local Development (`~/Development/mcp-servers/google-slides/`)

**Purpose:** Active development and testing

**When to use:**
- Making changes to the code
- Running tests locally
- Debugging issues
- Testing with Claude Code during development

**Claude Code configuration:**
```json
{
  "mcpServers": {
    "google-slides-dev": {
      "command": "node",
      "args": ["/Users/michaelpolansky/Development/mcp-servers/google-slides/dist/index.js"]
    }
  }
}
```

### 2. GitHub (Source of Truth)

**Purpose:** Version control, collaboration, and CI/CD

**When to sync:**
- After completing a feature (daily)
- Before switching tasks
- When sharing code with others

**How to sync:**
```bash
./scripts/sync-dev.sh "feat: description of changes"
```

### 3. npm Registry (Distribution)

**Purpose:** Versioned releases for production use

**When to publish:**
- After thorough testing
- When ready for others to use
- For production deployments
- After significant features or bug fixes

**How to publish:**
```bash
./scripts/release.sh patch  # Bug fixes
./scripts/release.sh minor  # New features
./scripts/release.sh major  # Breaking changes
```

## Daily Development Workflow

### Starting Work

```bash
# 1. Check current status
./scripts/status.sh

# 2. Pull latest changes (if needed)
git pull origin main

# 3. Create a feature branch (optional)
git checkout -b feature/new-feature

# 4. Start development server (watches for changes)
npm run dev
```

### During Development

```bash
# Run tests frequently
npm test

# Build to test locally
npm run build

# Test with Claude Code
# (Claude Code points to your local dist/index.js)
```

### Finishing Work

```bash
# 1. Check what changed
git status

# 2. Run tests one final time
npm test

# 3. Commit and push
./scripts/sync-dev.sh "feat: add new feature"

# Or manually:
git add .
git commit -m "feat: add new feature"
git push origin main
```

## Release Workflow

### When to Release

Release when you have:
- ✅ Completed features ready for production
- ✅ All tests passing
- ✅ Code reviewed and approved
- ✅ Documentation updated
- ✅ CHANGELOG entries written

### Semantic Versioning

- **Patch** (1.0.0 → 1.0.1): Bug fixes, small improvements
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

### Release Steps

```bash
# 1. Ensure you're on main and everything is synced
git checkout main
git pull origin main
./scripts/status.sh

# 2. Run the release script
./scripts/release.sh patch  # or minor/major

# The script automatically:
# - Runs tests
# - Builds production bundle
# - Bumps version in package.json
# - Creates git tag
# - Pushes to GitHub
# - Creates GitHub release
# - Prompts to publish to npm
```

### After Release

```bash
# Update local Claude configs to use the new version
# Option A: Keep using local development version (no change needed)

# Option B: Use published npm version
# Update config to:
{
  "google-slides": {
    "command": "npx",
    "args": ["-y", "google-slides-mcp@1.0.1"]
  }
}
```

## Configuration Strategies

### Development vs Production

**During Active Development:**
```json
{
  "google-slides-dev": {
    "command": "node",
    "args": ["/Users/michaelpolansky/Development/mcp-servers/google-slides/dist/index.js"]
  }
}
```
- Fast iteration
- See changes immediately after rebuild
- Full debugging access

**For Stable Use:**
```json
{
  "google-slides": {
    "command": "npx",
    "args": ["-y", "google-slides-mcp@1.0.0"]
  }
}
```
- Versioned and stable
- Easy to rollback
- Cleaner installation

**Both at Once (Recommended):**
```json
{
  "google-slides-dev": {
    "command": "node",
    "args": ["/Users/michaelpolansky/Development/mcp-servers/google-slides/dist/index.js"],
    "description": "Development version"
  },
  "google-slides": {
    "command": "npx",
    "args": ["-y", "google-slides-mcp@1.0.0"],
    "description": "Stable version"
  }
}
```
- Use `-dev` for testing changes
- Use stable version for real work
- Compare behavior between versions

## Private npm Registry

If using a private npm registry (like GitHub Packages or npm private):

### Setup Authentication

```bash
# For npm private packages
npm login

# For GitHub Packages
npm login --registry=https://npm.pkg.github.com --scope=@michaelpolansky
```

### Update package.json

```json
{
  "name": "google-slides-mcp",
  "private": false,
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "restricted"
  }
}
```

For GitHub Packages:
```json
{
  "name": "@michaelpolansky/google-slides-mcp",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### Publishing

```bash
# The release script will automatically use the configured registry
./scripts/release.sh patch
```

## Troubleshooting

### "Uncommitted changes" Error

```bash
# See what changed
git status

# Either commit them
./scripts/sync-dev.sh "description"

# Or stash them temporarily
git stash
# ... do release ...
git stash pop
```

### Version Conflicts

```bash
# Check versions
./scripts/status.sh

# If local and npm don't match:
# - Option A: Publish new version from local
./scripts/release.sh patch

# - Option B: Reset local to match npm
git checkout package.json
npm install
```

### GitHub Push Rejected

```bash
# Someone else pushed first
git pull --rebase origin main

# Resolve any conflicts
# Then push again
git push origin main
```

### npm Publish Failed

```bash
# Check if version already published
npm view google-slides-mcp versions

# If version exists, bump and retry
npm version patch
npm publish
```

## Best Practices

1. **Check status regularly:** Run `./scripts/status.sh` frequently
2. **Commit often:** Small, focused commits are better than large ones
3. **Test before pushing:** Always run tests before syncing to GitHub
4. **Use semantic versioning:** Follow patch/minor/major conventions
5. **Keep GitHub as source of truth:** Always push commits to GitHub
6. **Tag releases:** Every npm publish should have a corresponding git tag
7. **Document changes:** Update CHANGELOG.md with each release

## Summary

```
Local Dev → Git → npm
   ↓         ↓      ↓
  Work    History  Distribute
```

- **Work locally** with fast iteration
- **Sync to GitHub** frequently for backup and collaboration
- **Publish to npm** when ready for production use
- **Use scripts** to automate and prevent mistakes
