---
name: google-slides-designer
description: |
  Create beautiful, well-designed Google Slides presentations using the google-slides MCP server.
  Use this skill whenever the user asks to create a presentation, build a slide deck, make slides,
  design a pitch deck, or anything involving Google Slides creation via the MCP tools. Also use
  when the user says "make me a deck", "create slides for", "presentation about", or references
  the google-slides MCP. This skill contains critical workarounds for MCP tool bugs that will
  cause broken output if not followed. Always use this skill when google-slides MCP tools are involved.
---

# Google Slides Designer

Create polished presentations via the `google-slides` MCP server. This skill covers the
complete workflow: theme, layout, element creation, icons, tables, and visual QA.

## References

Read these when you need specific details. You don't need all of them for every task.

**Skill resources** (bundled with this skill):

| File | When to read |
|------|-------------|
| `references/layouts.md` | Choosing and building slide layouts (10 verified patterns with exact coordinates) |
| `references/icons.md` | Adding icons to slides (Icons8 system, slug mappings, color/style variants) |
| `references/examples.md` | Full presentation_build examples, theme objects, role usage, auto-layout patterns |
| `references/demo-flow.md` | Sales demo workflow: master deck setup, per-prospect duplication, recap updates, multi-deal management |

**Design skills**: `/ui-ux-pro-max` (palettes, font pairings, styles), `/design-consultation` (full design system from scratch), `/frontend-design` (bold, non-generic aesthetics).

When building a deck for a specific company, scrape their website for logos and images. Most Framer/Webflow/CDN URLs work directly. Append ?width=1600 to resize large images.

**Recommended workflow**: Pick palette/fonts from `~/.claude/skills/ui-ux-pro-max/data/colors.csv` and `typography.csv`, map them to the 10 theme color keys, then pass the full `theme` object to `presentation_build`. This writes colors to the Google Slides master page so the entire deck uses native theme references.

## Theme System (Google Slides Master Theming)

**CRITICAL: Always pass a `theme` object to `presentation_build`. Without it, color keys like "bg_dark" and "accent" won't resolve and colors will be broken.**

This MCP server uses Google Slides' native color scheme on the presentation's master page. When you pass `theme.colors` to `presentation_build`, the server:
1. Writes those colors into the master page's ThemeColorType slots (DARK1, LIGHT1, ACCENT1, etc.)
2. Creates every element with `themeColor` references that inherit from the master
3. Merges your theme with built-in defaults, so you only need to pass colors and fonts (roles are provided automatically)

Changing the theme via `presentation_set_theme` instantly recolors the entire deck, just like editing a theme in the Google Slides UI.

### The 10 theme color slots

| Theme key | Google slot | Purpose | Vallor default |
|-----------|------------|---------|----------------|
| `bg_dark` | DARK1 | Dark slide backgrounds | `#181818` |
| `bg_light` | LIGHT1 | Light slide backgrounds, **white text on dark slides** | `#FAFAFA` |
| `text_primary` | DARK2 | Primary text/headings on light bg | `#181818` |
| `bg_surface` | LIGHT2 | Card/surface backgrounds | `#F0EEFF` |
| `accent` | ACCENT1 | Accent bars, buttons, labels, CTA | `#4318FF` |
| `bg_surface_dk` | ACCENT2 | Dark card/surface backgrounds | `#242424` |
| `text_secondary` | ACCENT3 | Body text on light bg | `#46484D` |
| `text_muted` | ACCENT4 | Caption/muted text on light bg | `#7A7C82` |
| `text_muted_dk` | ACCENT5 | Muted text on dark bg, subtitles | `#B0B2B8` |
| `divider_dk` | ACCENT6 | Dividers on dark bg | `#3A3A3A` |

**`bg_light` serves double duty**: it's the light slide background AND the white/light text color on dark slides. Both map to LIGHT1 on the master. This means changing `bg_light` updates both backgrounds and white text across the deck.

### Managing themes

| Tool | Purpose |
|------|---------|
| `presentation_get_theme` | Read current theme colors from the presentation's master page |
| `presentation_set_theme` | Update master theme colors (partial updates supported, only pass what you want to change) |

```json
// Read current master theme
presentation_get_theme({ presentationId: "..." })

// Change just the accent on the master (every ACCENT1 element updates instantly)
presentation_set_theme({ presentationId: "...", colors: { accent: "#F5327F" } })
```

### How colors flow

1. `presentation_build` writes `theme.colors` to the master color scheme, then creates elements with `themeColor` references
2. When you pass a color key (e.g. `"accent"`, `"bg_dark"`) as a fillColor, fontColor, or backgroundColor, it resolves to the corresponding `themeColor` reference
3. If a hex value matches a theme color, it also resolves to a `themeColor` reference
4. Any other hex falls back to static `rgbColor` (won't update with theme changes)

**Always use theme keys, not hex values.** Theme keys become native Google Slides theme references. Hex values become static colors that don't update when the theme changes.

## Text Roles: Dark vs Light Background

There is NO auto-swap logic. Each role has a fixed color. **You must pick the right role for the slide background.**

### Dark background roles (use on `bg_dark` slides)

| Role | Size | Weight | Color token | Renders as |
|------|------|--------|-------------|-----------|
| `title` | 32pt | Bold | `bg_light` (LIGHT1) | White text |
| `stat` | 24pt | Bold | `bg_light` (LIGHT1) | White text |
| `stat_label` | 12pt | Regular | `text_muted_dk` (ACCENT5) | Light gray text |
| `button` | 14pt | Bold | `bg_light` (LIGHT1) | White text (centered) |

### Light background roles (use on `bg_light` slides)

| Role | Size | Weight | Color token | Renders as |
|------|------|--------|-------------|-----------|
| `h1` | 24pt | Bold | `text_primary` (DARK2) | Dark text |
| `h2` | 18pt | Bold | `text_primary` (DARK2) | Dark text |
| `subtitle` | 14pt | Regular | `text_secondary` (ACCENT3) | Medium gray text |
| `body` | 12pt | Regular | `text_secondary` (ACCENT3) | Medium gray, 150% line spacing |
| `caption` | 10pt | Regular | `text_muted` (ACCENT4) | Light gray text |
| `label` | 9pt | Bold | `accent` (ACCENT1) | Accent/purple text |
| `card_title` | 14pt | Bold | `text_primary` (DARK2) | Dark text |
| `card_body` | 12pt | Regular | `text_secondary` (ACCENT3) | Medium gray, 150% line spacing |

### Quick reference: which role for which background

- **Dark slide heading?** Use `title` (not `h1`)
- **Light slide heading?** Use `h1` (not `title`)
- **Text on accent button?** Use `button` (gets white text)
- **Stats on dark slide?** Use `stat` + `stat_label`
- **Label/tag on any bg?** Use `label` (accent color works on both)

Usage: `{"type": "textbox", "role": "h1", "text": "My Title", "x": 60, "y": 40, "width": 600, "height": 50}`

Per-element overrides always win (explicit fontSize on element beats the role).

## Coordinate System

```
Slide: 720pt wide x 405pt tall (16:9)
1 inch = 72 points. Origin (0,0) = top-left.
Safe content area: x=60..660 (600pt wide), y=40..380 (340pt tall)
```

## Build Sequence (Recommended)

Use `presentation_build` to create the entire deck in one call. **Always pass a `theme` object.** You only need `colors` and `fonts`. Default roles are merged automatically.

```
presentation_build({
  title: "My Deck",
  theme: {
    colors: {
      bg_dark: "#181818",      // DARK1 - dark backgrounds + white text base
      bg_light: "#FAFAFA",     // LIGHT1 - light backgrounds + white text on dark
      text_primary: "#181818", // DARK2 - headings on light bg
      bg_surface: "#F0EEFF",   // LIGHT2 - card backgrounds
      accent: "#4318FF",       // ACCENT1 - accent bars, buttons, labels
      bg_surface_dk: "#242424",// ACCENT2 - dark card backgrounds
      text_secondary: "#46484D",// ACCENT3 - body text
      text_muted: "#7A7C82",   // ACCENT4 - captions
      text_muted_dk: "#B0B2B8",// ACCENT5 - muted text on dark bg
      divider_dk: "#3A3A3A"    // ACCENT6 - dividers on dark bg
    },
    fonts: { heading: "Inter", body: "Inter" }
  },
  slides: [
    { backgroundColor: "bg_dark", elements: [...], notes: "Speaker notes" },
    { backgroundColor: "bg_light", elements: [...] }
  ]
})
```

Returns: presentationId, URL, per-slide IDs, and element IDs with positions.

**After presentation_build:**
1. **Add tables**: If needed, `add_table` + `table_set_cell` + `table_style_cell` + `table_format_cell_text`
2. **Optional**: `presentation_export` to generate a PDF download link
3. **Visual QA**: Use `slide_thumbnail` to get PNG URLs for each slide, download and review

### Fallback: Manual Multi-step Build

When `presentation_build` is unavailable, use separate calls:
1. `presentation_create` to make the deck
2. `presentation_set_theme` to set master colors
3. `slide_get` index 0, then `slide_delete` (remove default slide)
4. `slide_create` with backgroundColor for each slide (parallelize all)
5. `slide_build` with elements array, passing `theme` for role resolution (parallelize independent slides)
6. `slide_set_notes` for speaker notes

When calling `slide_build` standalone, pass the theme object so roles resolve correctly:
```json
slide_build({
  presentationId: "...",
  slideId: "...",
  theme: { colors: {...}, fonts: {...} },
  elements: [...]
})
```

## Building Slides with slide_build

`slide_build` creates a single slide's content in one API call. When using `presentation_build`, each slide's elements array works the same way.

### Element types

| Type | What it creates | Key params |
|------|----------------|------------|
| `shape` | Cards, backgrounds, dividers, circles | shapeType, fillColor, borderColor, borderWidth, text, boldRange, verticalAlignment |
| `textbox` | Titles, body text, labels | text, fontSize, fontColor, bold, italic, alignment, lineSpacing, boldRange, autoFit, **role** |
| `image` | Photos, screenshots | imageUrl (public HTTPS) |
| `icon` | Professional icons from Icons8 | icon (slug), iconColor (hex no #), iconStyle |

All types accept an optional `id` field and an optional `role` field.

### Auto-layout

Elements without x/y/width/height get auto-positioned by the layout engine. Elements with explicit coordinates are placed manually. Mix both on the same slide.

```json
{
  "layout": {"type": "grid", "columns": 3, "gap": 15, "y": 100},
  "elements": [
    {"type": "textbox", "role": "h1", "text": "Features", "x": 60, "y": 40, "width": 600, "height": 50},
    {"type": "shape", "text": "Card 1", "fillColor": "bg_surface"},
    {"type": "shape", "text": "Card 2", "fillColor": "bg_surface"},
    {"type": "shape", "text": "Card 3", "fillColor": "bg_surface"}
  ]
}
```

The title has explicit position so it's placed manually. The 3 cards have no position so they flow into a 3-column grid starting at y=100. Layout types: `row`, `column`, `grid`.

### Validation

Pass `validate: true` on slide_build or presentation_build to get warnings about element overlap, elements outside the safe area, and small text.

### Key features

**boldRange**, **verticalAlignment**, **autoFit**, **Icons**, **Buttons**, **borderWidth**: same behavior as before. See `references/examples.md` for detailed patterns.

- autoFit: only on textboxes. Do NOT use on shapes (causes API "read-only fields" error).
- borderWidth minimum is 0.5. Hide borders by setting borderColor = fillColor.
- `alignment: "LEFT"` is rejected. Omit it or use `"START"`. CENTER and RIGHT work.

### slide_build response

Returns element summary with positions:
```
Elements:
  hero_title (textbox, role: title) at 60,80 600x115
  accent_line (shape, RECTANGLE) at 310,205 100x3
```

## Element IDs and Editing

### During creation: set IDs on key elements

Always set custom `id` on elements the user is likely to want changed later (titles, CTAs, stats, hero images). Elements without custom IDs get auto-generated semantic IDs.

### Editing existing slides

**slide_read** returns a slide's content as ElementSpec-compatible JSON. This enables round-trip editing:
1. `slide_read` to get current element specs
2. Modify the returned specs as needed
3. `element_delete` old elements + `slide_build` with modified specs

**slide_duplicate_modify** clones a slide and applies targeted changes in one call. Great for series slides (e.g. multiple team member bios, repeated card layouts with different data). Supports text, font, color, fill, border, and **image replacement** in one call:
```json
{
  "presentationId": "...",
  "sourceSlideId": "...",
  "changes": [
    { "elementId": "name_text", "text": "Jane Doe", "fontColor": "text_primary" },
    { "elementId": "headshot_img", "imageUrl": "https://example.com/jane.jpg" },
    { "elementId": "card_bg", "fillColor": "bg_surface" }
  ]
}
```

**Individual element edits** (for small changes, no need to rebuild):
- `element_update_text` to change text
- `element_format_text` to restyle (color, size, bold)
- `element_style` to change fill/border colors
- `element_move_resize` to reposition or resize
- `element_delete` to remove
- `element_duplicate` to clone an element (with optional `offsetX`/`offsetY` in points so the copy doesn't land on top)
- `add_image` / `add_icon` to add new elements

## Duplication

### Single slide duplication
- `slide_duplicate`: simple copy within a presentation
- `slide_duplicate_modify`: copy + apply changes (text, colors, fonts, images) in one call. Use original element IDs; they're auto-mapped to the new slide's elements.

### Batch duplication
- `slide_duplicate_batch`: duplicate multiple slides in one call. Pass an array of `slideIds`, get back all new slide IDs. Optional `insertionIndex` to position the copies.

```json
{
  "presentationId": "...",
  "slideIds": ["slide_001", "slide_002", "slide_003"],
  "insertionIndex": 5
}
```

### Element duplication
- `element_duplicate`: clone any element on a slide. Use `offsetX`/`offsetY` (points) to shift the copy.

```json
{ "presentationId": "...", "elementId": "card_1", "offsetX": 200, "offsetY": 0 }
```

### Full presentation duplication
- `presentation_create_from_template`: copy an entire presentation via Drive API, then replace `{{tokens}}` throughout. Great for templatized client decks.

## Slide Registry (Reusable Slide Library)

Bookmark and version your best slides. The registry is a local JSON file at `~/.config/google-slides-mcp/slide-registry.json`. Both the user and AI can manage it.

**Primary use: archive and reference.** Save great slides so you can find them later when updating master decks or rebuilding layouts. The registry is not designed for runtime injection into live decks (cross-presentation slide copy is limited by Google's API). For the recommended sales workflow, see `references/demo-flow.md`.

### Registry tools

| Tool | Purpose |
|------|---------|
| `registry_save_slide` | Save a slide to the registry (upserts by name) |
| `registry_list_slides` | List all saved slides, optionally filter by name/description/tag |
| `registry_remove_slide` | Remove a slide from the registry by name |
| `registry_use_slide` | Copy a registered slide into a target presentation |

### Saving slides

After building a great slide, save it:
```json
{
  "name": "pricing-enterprise-v2",
  "presentationId": "abc123",
  "slideId": "slide_007",
  "description": "Enterprise pricing with 3-tier table",
  "tags": ["pricing", "enterprise", "table"]
}
```

### Using saved slides

```json
{ "name": "pricing-enterprise-v2", "targetPresentationId": "xyz789", "insertionIndex": 2 }
```

**Same-presentation**: direct duplicate, returns `newSlideId` and `elementIdMapping`. Combine with `slide_duplicate_modify` to customize immediately.

**Cross-presentation**: creates a temporary single-slide presentation (Google API limitation). Returns `tempPresentationId` and URL for reference.

**Best practice for repeatable decks**: keep a superset master deck with all slides you might need, duplicate it per use case, then `slide_delete` what you don't need. This avoids cross-presentation limitations entirely. See `references/demo-flow.md` for the full pattern.

## Tables

Tables use separate MCP tools (not slide_build or presentation_build). The workflow:

1. Build the slide title/subtitle via `slide_build` or `presentation_build`
2. `add_table` with x, y, width, height, rows, columns
3. `table_set_cell` for each cell (parallelize all)
4. `table_style_cell` for header bg (backgroundColor="bg_dark", columnSpan=all) and alternating rows
5. `table_format_cell_text` for header (bold, 12pt, fontColor="bg_light") and data cells

Known bugs:
- `table_style_cell` padding params are rejected by the API. Don't use them.
- Color-code values: green (#16A34A) positive, red (#EF4444) negative, muted neutral.

## Visual QA

**Quick check**: `slide_get` to verify positions, sizes, text.

**Thumbnail check** (fastest, no login required):
```
slide_thumbnail({ presentationId: "...", slideIndex: 0, size: "LARGE" })
```
Returns a temporary PNG URL (valid ~30 min). Download and review each slide.

**Browser check** (for detailed inspection):
```bash
gog drive share <id> --to anyone --role reader -a <account> -y
browse goto "https://docs.google.com/presentation/d/<id>/embed?start=false&loop=false&delayms=60000"
sleep 3
browse screenshot /tmp/slide1.png
```

Check for: contrast, sizing, alignment, text overflow, overall balance.

## Design Rules

### Accent lines / separators

Never hardcode accent Y positions. Calculate them:
```
accent_y = title_y + title_height + 10
subtitle_y = accent_y + 15
```

Title height by font size (per line):
- 44-48pt: ~55pt/line. 1 line = 60pt, 2 lines = 115pt, 3 lines = 170pt
- 28-32pt: ~38pt/line. 1 line = 42pt, 2 lines = 80pt
- 20pt: ~28pt/line.

### Card borders

Always set `borderColor` = `fillColor` on cards to hide the default border. Without this, cards get a visible dark outline.

### Other rules

- Cards: ROUND_RECTANGLE with verticalAlignment=MIDDLE (no autoFit).
- Z-order: elements created first appear behind later ones. Create backgrounds before text.
- Spacing: minimum 15pt between elements. Leave white space.
- Center formula: x = (720 - width) / 2
- Dark/light variety: aim for 30-40% dark slides
- Dark bg text: use `title`, `stat`, `stat_label`, `button` roles. These use `bg_light` (LIGHT1) for white text. Do NOT use `h1` or `body` on dark slides (they use dark text colors).
- Stat cards: default 24pt fits most card widths. For larger standalone stats, override with `fontSize: 32` or `fontSize: 36`.
- All font sizes are designed for the 720x405pt slide canvas. Override with explicit `fontSize` when you need something different.
- Image max size: ~4000px on longest edge. Append ?width=1600 to resize.
- Rate limiting: when building 8+ slides in parallel, batch in groups of 4-5.
