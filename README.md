# Google Slides MCP Server

A Model Context Protocol (MCP) server that provides comprehensive Google Slides management capabilities. Create, read, update, and delete presentations, slides, and elements programmatically through Claude.

## Features

- 🔐 **OAuth 2.0 Authentication** - Secure user consent flow with automatic token refresh
- 📊 **Presentation Management** - Create and retrieve presentations
- 📄 **Slide Operations** - Create, delete, duplicate, and inspect slides
- 🔍 **Element Inspection** - Read element IDs, types, positions, and content
- ✏️ **Element Manipulation** - Add text boxes, update text, move and resize elements, delete elements
- 🎨 **Helper Tools** - Convenient shortcuts for common operations
- 🔄 **Smart Retry Logic** - Automatic retry with exponential backoff for rate limits
- ✅ **Type Safety** - Full TypeScript implementation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with Slides API enabled
- OAuth 2.0 credentials (see [Setup Guide](docs/SETUP.md))

### Installation

1. Clone and install dependencies:

```bash
git clone <repo-url>
cd google-slides-mcp
npm install
```

2. Set up Google OAuth credentials:

```bash
cp config/credentials.example.json config/credentials.json
# Edit config/credentials.json with your OAuth credentials
```

3. Build the project:

```bash
npm run build
```

4. Run the server:

```bash
node dist/index.js
```

On first run, a browser window will open for OAuth authentication. Once authenticated, tokens are stored securely in `~/.config/google-slides-mcp/tokens.json`.

## Usage with Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "google-slides": {
      "command": "node",
      "args": ["/absolute/path/to/google-slides-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. You'll now have access to Google Slides tools!

## Available Tools

### Presentation Tools
- `create_presentation` - Create new presentation
- `get_presentation` - Retrieve presentation metadata

### Slide Tools
- `create_slide` - Add new slide
- `delete_slide` - Remove slide
- `duplicate_slide` - Copy slide
- `slide_get` - List all elements on a slide (ID, type, position, text)

### Element Tools
- `element_delete` - Delete any element
- `element_get` - Inspect a single element by ID (position, size, content)
- `element_update_text` - Replace the text content of an existing element
- `element_move_resize` - Move and/or resize an element (position and size in points)
- `add_text_box` - Add text box with positioning

See [API Documentation](docs/API.md) for detailed tool parameters.

## Development

```bash
# Run tests
npm test

# Watch mode for development
npm run dev

# Build TypeScript
npm run build

# Clean build artifacts
npm run clean
```

## Project Structure

```
google-slides-mcp/
├── src/
│   ├── auth/           # OAuth authentication
│   ├── google/         # Google Slides API client
│   ├── tools/          # MCP tool implementations
│   └── utils/          # Utilities (response formatting, etc.)
├── tests/              # Unit, integration, and E2E tests
├── config/             # OAuth credentials
└── docs/               # Documentation
```

## Troubleshooting

**"Credentials file not found"**
- Ensure `config/credentials.json` exists with valid OAuth credentials

**"Not authenticated"**
- Delete `~/.config/google-slides-mcp/tokens.json` and re-run to trigger OAuth flow

**"Permission denied"**
- Check presentation sharing settings in Google Slides
- Verify OAuth scopes include `https://www.googleapis.com/auth/presentations`

**Rate limit errors**
- Server automatically retries with exponential backoff
- If persistent, wait a few minutes before retrying

See [Setup Guide](docs/SETUP.md) for detailed troubleshooting.

## Known Limitations

- **List presentations**: Requires Google Drive API (planned for Phase 2)
- **Delete presentations**: Requires Google Drive API (planned for Phase 2)
- **Copy presentations**: Requires Google Drive API (planned for Phase 2)
- **Image upload**: Currently requires image URLs (local file upload planned)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT
