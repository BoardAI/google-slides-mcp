# Quick Start Guide

## Installation

### For Development (Fastest Iteration)

```bash
# Point Claude Code to your local copy
# Edit: ~/.config/claude-code/config.json
{
  "mcpServers": {
    "google-slides-dev": {
      "command": "node",
      "args": ["/Users/michaelpolansky/Development/google-slides/dist/index.js"]
    }
  }
}

# Start development server
npm run dev
```

### For Production (Stable)

```bash
# Install from npm
npm install -g google-slides-mcp

# Or use via Claude Desktop config
{
  "mcpServers": {
    "google-slides": {
      "command": "npx",
      "args": ["-y", "google-slides-mcp"]
    }
  }
}
```

## Daily Commands

```bash
# Check sync status
npm run status

# Work on code
npm run dev              # Auto-rebuild on changes
npm test                 # Run tests

# Sync to GitHub (end of day or when done with feature)
npm run sync "feat: what I built"

# Release new version (when ready for production)
npm run release patch    # Bug fixes (1.0.0 → 1.0.1)
npm run release minor    # New features (1.0.0 → 1.1.0)
npm run release major    # Breaking changes (1.0.0 → 2.0.0)
```

## File Locations

```
Development:  ~/Development/google-slides/
GitHub:       https://github.com/michaelpolansky/google-slides-mcp
npm:          https://www.npmjs.com/package/google-slides-mcp
Credentials:  ~/Development/google-slides/config/credentials.json
Tokens:       ~/.config/google-slides-mcp/tokens.json
```

## Configuration

### Claude Code
`~/.config/claude-code/config.json`

### Claude Desktop
`~/Library/Application Support/Claude/claude_desktop_config.json`

## First Time Setup

```bash
# 1. Clone from GitHub
git clone https://github.com/michaelpolansky/google-slides-mcp.git
cd google-slides-mcp

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Add Google credentials
cp config/credentials.example.json config/credentials.json
# Edit config/credentials.json with your OAuth credentials

# 5. Configure Claude to use it (see Installation above)

# 6. Restart Claude Desktop/Code

# 7. Test it
# Ask Claude: "Create a test presentation"
```

## Troubleshooting

```bash
# Tests failing?
npm test

# Build not working?
npm run clean && npm run build

# Out of sync with GitHub?
npm run status
git pull origin main

# npm version outdated?
npm run release patch
```

## More Information

- Full workflow guide: `WORKFLOW.md`
- Setup instructions: `docs/SETUP.md`
- API reference: `docs/API.md`
- Design documents: `docs/plans/`
