# Quick Start Guide

## Prerequisites

- Node.js 18+
- A Google account
- Google OAuth credentials (see `docs/SETUP.md`)

## Installation

```bash
git clone <repo-url>
cd google-slides
npm install
npm run build
```

## Register with Claude Code

```bash
claude mcp add google-slides -- node /absolute/path/to/google-slides/dist/index.js
```

Or for Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-slides": {
      "command": "node",
      "args": ["/absolute/path/to/google-slides/dist/index.js"]
    }
  }
}
```

## Authenticate

On first use a browser window opens for Google OAuth. Sign in and approve access. Tokens are cached at `~/.config/google-slides-mcp/tokens.json`.

## Try It

Ask Claude:

```
Create a new presentation called "My First Presentation"
```

```
List my recent presentations
```

```
Add a slide to presentation <id> with a text box saying "Hello World"
```

## Development Commands

```bash
npm test          # Run 269 unit tests
npm run build     # Compile TypeScript → dist/
npm run dev       # Watch mode (auto-rebuild on save)
npm run clean     # Remove dist/
```

## File Locations

```
Source code:   src/
Built output:  dist/
Credentials:   config/credentials.json
Tokens:        ~/.config/google-slides-mcp/tokens.json
```

## More Information

- Full setup: `docs/SETUP.md`
- All 43 tools: `docs/API.md`
- Development workflow: `WORKFLOW.md`
