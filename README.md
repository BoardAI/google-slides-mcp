# Google Slides MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-8B5CF6?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMMTIgMjJMMjAgMTdWN0wxMiAyWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-316_passing-brightgreen?logo=jest&logoColor=white)]()
[![Tools](https://img.shields.io/badge/tools-59-orange)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP server that gives AI assistants full control over Google Slides. Create presentations, manage themes, manipulate elements, work with tables, and build entire decks from a single call.

## What it does

- **59 tools** for presentations, slides, elements, tables, themes, and a slide registry
- **Native Google Slides theming** with 10-slot master color scheme. Change one color, update everything.
- **`presentation_build`** creates an entire deck (presentation + theme + slides + elements) in one call
- **Text roles** (title, h1, stat, body, etc.) with dark/light background variants
- **Slide registry** for bookmarking and reusing your best slides
- **OAuth 2.0** with automatic token refresh
- **316 unit tests**

## Quick start

### 1. Google Cloud credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google Slides API** and **Google Drive API**
4. Go to **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**
5. Configure consent screen if prompted (External, add your email as test user)
6. Application type: **Desktop app**
7. Download the JSON, save as `config/credentials.json`

### 2. Install and build

```bash
git clone git@github.com:antondkg/google-slides-mcp.git
cd google-slides-mcp
npm install
npm run build
```

### 3. Register with Claude Code

```bash
claude mcp add google-slides -- node /absolute/path/to/google-slides-mcp/dist/index.js
```

Or add to `~/.claude.json` manually:

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

On first launch, a browser window opens for Google OAuth. After approving, tokens are cached at `~/.config/google-slides-mcp/tokens.json`. Every subsequent start is instant.

## Theme system

Every presentation uses Google Slides' native master page color scheme. Pass a `theme` object to `presentation_build` and all elements get `themeColor` references that inherit from the master.

```
presentation_build({
  title: "My Deck",
  theme: {
    colors: {
      bg_dark: "#181818",       // DARK1
      bg_light: "#FAFAFA",      // LIGHT1 (also white text on dark slides)
      text_primary: "#181818",  // DARK2
      bg_surface: "#F0EEFF",    // LIGHT2
      accent: "#4318FF",        // ACCENT1
      bg_surface_dk: "#242424", // ACCENT2
      text_secondary: "#46484D",// ACCENT3
      text_muted: "#7A7C82",    // ACCENT4
      text_muted_dk: "#B0B2B8", // ACCENT5
      divider_dk: "#3A3A3A"     // ACCENT6
    },
    fonts: { heading: "Inter", body: "Inter" }
  },
  slides: [
    { backgroundColor: "bg_dark", elements: [...] },
    { backgroundColor: "bg_light", elements: [...] }
  ]
})
```

Change the theme after creation with `presentation_set_theme({ colors: { accent: "#FF5733" } })`. All elements update instantly.

### Text roles

Roles resolve to font size, weight, family, and color. Use dark-bg roles on dark slides and light-bg roles on light slides.

| Dark bg roles | Light bg roles |
|--------------|---------------|
| `title` (32pt, white) | `h1` (24pt, dark) |
| `stat` (24pt, white) | `h2` (18pt, dark) |
| `stat_label` (12pt, muted) | `subtitle` (14pt, gray) |
| `button` (14pt, white, centered) | `body` (12pt, gray, 150% spacing) |
| | `caption` (10pt, muted) |
| | `label` (9pt, accent) |
| | `card_title` / `card_body` |

## Available tools (59)

### Presentation (9)
`presentation_create` `presentation_get` `presentation_list` `presentation_build` `presentation_export` `presentation_create_from_template` `presentation_rename` `presentation_get_theme` `presentation_set_theme` `presentation_get_design_system`

### Slide (13)
`slide_create` `slide_delete` `slide_duplicate` `slide_duplicate_batch` `slide_duplicate_modify` `slide_get` `slide_read` `slide_build` `slide_reorder` `slide_set_background` `slide_thumbnail` `slide_get_notes` `slide_set_notes`

### Element (15)
`element_get` `element_find` `element_delete` `element_update_text` `element_move_resize` `element_add_shape` `element_style` `element_format_text` `element_replace_image` `element_duplicate` `element_z_order` `element_group` `element_ungroup` `element_set_link` `add_text_box` `add_image` `add_icon`

### Table (11)
`add_table` `table_set_cell` `table_format_cell_text` `table_style_cell` `table_insert_rows` `table_delete_rows` `table_set_row_height` `table_insert_columns` `table_delete_columns` `table_set_column_width` `table_merge_cells` `table_unmerge_cells`

### Registry (4)
`registry_save_slide` `registry_list_slides` `registry_remove_slide` `registry_use_slide`

## Claude Code skill (optional)

The `skills/` folder contains a Claude Code skill with design guidelines, layout patterns, and best practices for building polished presentations.

### Install the skill

```bash
# From the repo root
cp -r skills/google-slides-designer ~/.claude/skills/
```

Then when you ask Claude Code to build a slide deck, it automatically loads the skill with:
- 10 verified slide layout patterns with exact coordinates
- Icons8 integration guide (slug mappings, styles)
- Full `presentation_build` examples
- Sales demo workflow (master deck, per-prospect duplication)
- Dark/light role selection rules
- Card, table, and stat design best practices

### Update the skill

After pulling new changes:

```bash
cp -r skills/google-slides-designer ~/.claude/skills/
```

## Coordinate system

All positions and sizes are in **points** (pt). A standard 16:9 slide is **720 x 405 pt**. Origin (0, 0) is the top-left corner.

```
1 inch = 72 points
Slide: 720pt wide x 405pt tall (16:9)
Safe area: x=60..660 (600pt wide), y=40..380 (340pt tall)
```

## Development

```bash
npm test          # Run 316 unit tests
npm run build     # Compile TypeScript
npm run dev       # Watch mode (tsx)
npm run clean     # Remove dist/
```

## Troubleshooting

**"Credentials file not found"**: Ensure `config/credentials.json` exists with valid OAuth credentials from Google Cloud Console.

**"Not authenticated"**: Delete `~/.config/google-slides-mcp/tokens.json` and restart to trigger a new OAuth flow.

**"Permission denied"**: Check that the authenticated Google account has edit access to the presentation.

**Re-authenticate** (e.g. after adding Drive API scopes):
```bash
rm ~/.config/google-slides-mcp/tokens.json
```

## License

MIT
