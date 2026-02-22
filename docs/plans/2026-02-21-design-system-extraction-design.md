# Design: `presentation_get_design_system` Tool

**Date:** 2026-02-21
**Status:** Approved

## Problem

Extracting a design system from a presentation via the MCP server exhausts conversation
context limits. The `presentation_get` tool returns the full raw API blob — masters,
layouts, slides — which floods the context window before the AI can summarize it.

## Solution

A single dedicated tool `presentation_get_design_system` that:
1. Calls `presentations.get()` once server-side
2. Processes the raw response in TypeScript — the raw blob never enters the conversation
3. Returns a compact, structured design-token object (~30–60 lines of JSON)

## Tool Interface

**Name:** `presentation_get_design_system`
**Input:** `presentationId: string` (required)
**Output:** Structured design system object (see schema below)

## Output Schema

```json
{
  "slideSize": {
    "widthPt": 720,
    "heightPt": 405
  },
  "typography": {
    "title": {
      "fontFamily": "Google Sans",
      "fontSizePt": 40,
      "bold": false,
      "color": "#202124",
      "lineSpacing": 115,
      "spaceAbovePt": 0,
      "spaceBelowPt": 8
    },
    "centeredTitle": { "..." : "..." },
    "subtitle": { "..." : "..." },
    "body": {
      "fontFamily": "Google Sans",
      "fontSizePt": 18,
      "bold": false,
      "color": "#5F6368",
      "lineSpacing": 150,
      "spaceAbovePt": 0,
      "spaceBelowPt": 6
    }
  },
  "lists": {
    "bullet": {
      "glyphType": "DISC",
      "indentPt": 18,
      "levels": [
        { "level": 0, "glyphType": "DISC", "indentPt": 18 },
        { "level": 1, "glyphType": "CIRCLE", "indentPt": 36 }
      ]
    },
    "numbered": {
      "glyphType": "DECIMAL",
      "indentPt": 18
    }
  },
  "shapeStyles": {
    "common": [
      {
        "fillColor": "#F8F9FA",
        "borderColor": "#DADCE0",
        "borderWidthPt": 1,
        "dashStyle": "SOLID",
        "shadowBlurPt": 4,
        "shadowColor": "#00000033",
        "shadowOffsetX": 0,
        "shadowOffsetY": 2,
        "paddingPt": { "top": 12, "right": 16, "bottom": 12, "left": 16 },
        "verticalAlignment": "MIDDLE",
        "count": 8
      }
    ]
  },
  "tableStyles": {
    "found": true,
    "headerFill": "#1A73E8",
    "rowFill": "#FFFFFF",
    "alternateFill": "#F8F9FA",
    "borderColor": "#DADCE0",
    "borderWidthPt": 1,
    "dashStyle": "SOLID",
    "defaultColumnWidthPt": 120,
    "defaultRowHeightPt": 30,
    "cellPaddingPt": { "top": 5, "right": 5, "bottom": 5, "left": 5 }
  },
  "colors": {
    "fills": ["#1A73E8", "#FFFFFF", "#F8F9FA"],
    "text": ["#FFFFFF", "#202124", "#5F6368"],
    "backgrounds": ["#1A73E8", "#FFFFFF"],
    "borders": ["#DADCE0", "#1A73E8"]
  },
  "layout": {
    "marginLeftPt": 48,
    "marginTopPt": 36,
    "marginRightPt": 48,
    "marginBottomPt": 36,
    "verticalRhythmPt": 24
  }
}
```

## Data Extraction Strategy

### Typography
- Source: `layouts[].pageElements` placeholder elements (TITLE, CENTERED_TITLE, SUBTITLE, BODY)
- For each placeholder: read `textElements[].textRun.style` for the first non-empty run
- Fields: `fontFamily`, `fontSize.magnitude`, `bold`, `foregroundColor.rgbColor`,
  and paragraph style `lineSpacing`, `spaceAbove.magnitude`, `spaceBelow.magnitude`
- Fall back to `masters[].pageElements` if layouts have no explicit styles

### Lists / Bullets
- Source: `slides[].lists` map (list definitions live on each slide page)
- Also check `masters[].lists` and `layouts[].lists`
- For each list definition, extract per-level `glyphType`, `glyphFormat`, `indentStart`, `indentFirstLine`
- Deduplicate by glyph type to surface bullet vs numbered variants

### Shape Styles
- Source: `slides[].pageElements` where `element.shape` exists
- For each shape: extract `shapeProperties.shapeBackgroundFill.solidFill`,
  `shapeProperties.outline.outlineFill.solidFill`, `shapeProperties.outline.weight`,
  `shapeProperties.outline.dashStyle`, `shapeProperties.shadow`,
  `shapeProperties.contentAlignment`, `shapeProperties.contentInsets`
- Build a "fingerprint" string from these values
- Group by fingerprint, count occurrences, return top N (by count) as `common` array
- Omit shapes with no fill AND no border (invisible/structural shapes)

### Table Styles
- Source: `slides[].pageElements` where `element.table` exists
- If no tables found: `tableStyles.found = false`, omit all other fields
- Extract from first table encountered: row 0 (header) fill, row 1 fill, row 2 fill
  (if row 1 ≠ row 2, set `alternateFill`)
- Border: read `tableCellProperties` from cell (0,0)
- Column widths and row heights: read from `tableColumns` and `tableRows`
- Padding: read `contentInsets` from cell (0,0)

### Colors
- Source: all of the above extractions
- Aggregate all hex colors by category (fill, text, background, border)
- Deduplicate within each category
- Sort by frequency (most used first)
- Convert RGB floats → hex throughout: `Math.round(r * 255).toString(16).padStart(2, '0')`

### Layout
- `pageSize`: read `presentation.pageSize.width/height.magnitude`, convert EMU → points
- Margins: scan all slide elements, find `min(translateX)` and `min(translateY)` as
  estimated left/top margins; derive right/bottom from `slideWidth - max(translateX + width)`
- Vertical rhythm: compute gaps between elements sorted by Y position,
  find the modal gap value as the dominant vertical rhythm unit

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/tools/presentation/design-system.ts` | New file — full extraction logic |
| `src/tools/presentation/index.ts` | Re-export `presentationGetDesignSystemTool` |
| `src/tools/registry.ts` | Add tool schema entry |
| `src/index.ts` | Add `case 'presentation_get_design_system':` to handler |

## Helper: RGB → Hex

Reuse pattern from existing codebase. The API returns colors as
`{ red: 0–1, green: 0–1, blue: 0–1 }`. Conversion:
```ts
function rgbToHex(r = 0, g = 0, b = 0): string {
  return '#' + [r, g, b]
    .map(c => Math.round(c * 255).toString(16).padStart(2, '0'))
    .join('').toUpperCase();
}
```

## Non-Goals

- Writing the design system back to any file on disk
- Extracting from slide master theme colors (user opted for actual element data)
- Corner radius (not exposed in Google Slides REST API)
- Animations, transitions
