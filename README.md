# Google Slides MCP Server

A Model Context Protocol (MCP) server that gives Claude comprehensive control over Google Slides. Create and edit presentations, manage slides, manipulate elements, work with tables, and more — all through natural language.

## Features

- **43 tools** across presentations, slides, elements, tables, and helpers
- **OAuth 2.0** authentication with automatic token refresh
- **Google Drive integration** — list, export, rename, and copy presentations
- **Full table support** — cell editing, formatting, rows, columns, merge/unmerge
- **Element operations** — add, style, move, duplicate, group, layer, link
- **Speaker notes** — read and write per-slide notes
- **TypeScript** with 269 unit tests

## Setup

### 1. Google Cloud credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google Slides API** and **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Configure consent screen if prompted (External, add your email as test user)
6. Application type: **Desktop app**
7. Download the JSON → save as `config/credentials.json`

### 2. Install and build

```bash
git clone <repo-url>
cd google-slides-mcp
npm install
npm run build
```

### 3. Register with Claude Code

```bash
claude mcp add google-slides -- node /absolute/path/to/google-slides-mcp/dist/index.js
```

Or for Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### 4. Authenticate

On first launch a browser window opens for the Google OAuth consent flow. After approving, tokens are cached at `~/.config/google-slides-mcp/tokens.json` and every subsequent start is instant.

## Available Tools

### Presentation
| Tool | Description |
|---|---|
| `presentation_create` | Create a new presentation |
| `presentation_get` | Get metadata and slide list |
| `presentation_list` | List presentations in Drive (optional name filter) |
| `presentation_export` | Export to PDF or PPTX file |
| `presentation_create_from_template` | Copy a presentation and replace `{{tokens}}` |
| `presentation_rename` | Rename a presentation |

### Slide
| Tool | Description |
|---|---|
| `slide_create` | Add a new slide |
| `slide_delete` | Delete a slide |
| `slide_duplicate` | Duplicate a slide |
| `slide_get` | List all elements on a slide with positions and text |
| `slide_reorder` | Move a slide to a new position |
| `slide_set_background` | Set background color or image |
| `slide_thumbnail` | Get a PNG thumbnail URL |
| `slide_get_notes` | Read speaker notes |
| `slide_set_notes` | Write speaker notes |

### Element
| Tool | Description |
|---|---|
| `element_get` | Inspect an element (position, size, type, text) |
| `element_delete` | Delete an element |
| `element_update_text` | Replace text content |
| `element_move_resize` | Move and/or resize an element |
| `element_add_shape` | Add a shape (rectangle, ellipse, star, arrow, etc.) |
| `element_style` | Set fill color, border color, border width |
| `element_format_text` | Apply text formatting (bold, font size, color, alignment, bullets, etc.) |
| `element_find` | Search elements by type, shape type, or text content |
| `element_replace_image` | Swap image content (preserves position and size) |
| `element_duplicate` | Duplicate an element |
| `element_z_order` | Change element layering (bring to front, send to back, etc.) |
| `element_group` | Group elements together |
| `element_ungroup` | Ungroup elements |
| `element_set_link` | Add or remove a hyperlink |

### Helpers
| Tool | Description |
|---|---|
| `add_text_box` | Add a text box with content and position |
| `add_image` | Insert an image from a URL |
| `add_table` | Insert a table with specified rows and columns |

### Table
| Tool | Description |
|---|---|
| `table_set_cell` | Set cell text content |
| `table_format_cell_text` | Format text within a cell |
| `table_style_cell` | Set cell background color and padding |
| `table_insert_rows` | Insert rows above or below a reference row |
| `table_delete_rows` | Delete rows by index |
| `table_set_row_height` | Set minimum row height |
| `table_insert_columns` | Insert columns left or right of a reference column |
| `table_delete_columns` | Delete columns by index |
| `table_set_column_width` | Set column width |
| `table_merge_cells` | Merge a rectangular range of cells |
| `table_unmerge_cells` | Unmerge previously merged cells |

## Coordinate System

All positions and sizes are in **points** (pt). A standard 16:9 slide is **720 × 405 pt**. Origin (0, 0) is the top-left corner.

```
1 inch = 72 points
Slide: 720pt wide × 405pt tall  (16:9)
```

## Development

```bash
npm test          # Run 269 unit tests
npm run build     # Compile TypeScript
npm run dev       # Watch mode (tsx)
npm run clean     # Remove dist/
```

## Troubleshooting

**"Credentials file not found"** — Ensure `config/credentials.json` exists with valid OAuth credentials from Google Cloud Console.

**"Not authenticated"** — Delete `~/.config/google-slides-mcp/tokens.json` and restart to trigger a new OAuth flow.

**"Permission denied"** — Check that the authenticated Google account has edit access to the presentation.

**Re-authenticate** — If you added Drive API scopes after initial setup, delete tokens and re-authenticate:
```bash
rm ~/.config/google-slides-mcp/tokens.json
```

## License

MIT
