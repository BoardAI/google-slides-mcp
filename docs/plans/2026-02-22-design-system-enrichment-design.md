# Design System Enrichment — Design Doc

**Date:** 2026-02-22
**Status:** Approved
**Context:** Extends `presentation_get_design_system` to produce richer, contextually annotated tokens optimised for AI slide recreation.

---

## Problem

The current extractor captures only two typography roles (title, body from placeholder types), an anonymous top-5 shape style array, and no column grid data. An AI agent recreating slides from this output lacks the information to:

- Choose the correct font size for non-placeholder text (card labels, captions, callout text)
- Position elements into the correct column structure
- Identify what each shape style is *for* (card vs callout vs ghost box)

---

## Goals

1. **Full type scale** — derive all distinct text styles used across the presentation, annotated with inferred semantic context.
2. **Column grid** — detect multi-column layout patterns from element X-position clustering.
3. **Annotated shape roles** — extend shape style fingerprinting with corner radius and inferred role labels.

---

## Output Shape

### `typeScale` (replaces `typography`)

Array sorted largest → smallest font size. Each entry:

```json
{
  "sizePt": 26,
  "fontFamily": "Figtree",
  "bold": false,
  "color": "#FFFFFF",
  "occurrences": 18,
  "roles": ["placeholder:TITLE"],
  "context": "slide title"
}
```

- `roles`: one or more of `"placeholder:TITLE"`, `"placeholder:BODY"`, `"freeform"`, `"freeform:amber"` (freeform inside a named fill)
- `context`: human-readable inferred label (see Extraction Logic)
- Styles with fewer than 2 occurrences are dropped as noise

### `layout.grid` (added to existing `layout`)

```json
{
  "columnCount": 3,
  "columns": [
    { "xPt": 17,  "widthPt": 210 },
    { "xPt": 255, "widthPt": 210 },
    { "xPt": 493, "widthPt": 210 }
  ],
  "gutterPt": 28
}
```

### `shapeStyles` (replaces anonymous array)

Role-keyed object instead of positional array:

```json
{
  "card":        { "fillColor": "#FFFFFF", "borderColor": "#000000", "cornerRadiusPt": 0, "count": 50, "inferredRole": "content card" },
  "callout":     { "fillColor": "#F5B73B", "borderColor": "#EEFF41", "cornerRadiusPt": 0, "count": 6,  "inferredRole": "highlighted callout" },
  "ghost":       { "fillColor": null,      "borderColor": "#000000", "cornerRadiusPt": 0, "count": 5,  "inferredRole": "outline / ghost box" },
  "slate-ghost": { "fillColor": null,      "borderColor": "#8598A7", "cornerRadiusPt": 0, "count": 5,  "inferredRole": "subtle outline" }
}
```

If two fingerprints map to the same inferred role, the less frequent one gets a `-2` suffix.

---

## Extraction Logic

### `extractTypeScale(slides, masters, layouts)`

1. Walk every `textRun` in every `pageElement` across all slides (not just placeholders).
2. For each run collect `(fontFamily, sizePt, bold, foregroundColor)` as a style fingerprint.
3. Also record:
   - Whether the element has a `shape.placeholder.type` → role = `"placeholder:TYPE"`
   - If freeform: the fill color of the containing shape → role = `"freeform"` or `"freeform:<colorName>"` (colorName matched against known palette fills)
4. Group runs by fingerprint, sum occurrences, union roles.
5. Drop fingerprints with `occurrences < 2`.
6. Infer `context` label using, in order:
   - Placeholder type → `"slide title"`, `"body text"`, `"subtitle"`
   - Freeform containing fill matches accent → `"callout label"`
   - Y position of containing element < 25% of slide height → `"heading"`
   - Highest freeform occurrence count → `"body"`
   - Otherwise → `"supporting text"`
7. Sort descending by `sizePt`.

### `extractColumnGrid(slides, widthPt)`

1. Collect every element's `translateX` in points, rounded to nearest 4pt.
2. Build a frequency map; keep X values with frequency ≥ 2 (appear on multiple slides or multiple elements per slide).
3. Sort candidate X values ascending; merge values within 8pt of each other (take the weighted mean).
4. For each column X, derive `widthPt` as the modal element width at that X.
5. `gutterPt` = `columns[i+1].xPt − (columns[i].xPt + columns[i].widthPt)`, averaged across pairs.
6. If only one distinct X cluster: `columnCount: 1`, `columns: []`, `gutterPt: null`.

### `extractAnnotatedShapeStyles(slides)`

Extends existing fingerprinting:

1. Add `cornerRadiusPt` to the fingerprint key (from `shapeProperties.roundedRectangleRadius` / `cornerRadius`, converted from EMU).
2. After grouping, apply role inference in order:
   - No fill → `"ghost"` (or `"slate-ghost"` if border matches `#8598A7`)
   - Fill matches known dark backgrounds (`#060C14`, `#280818`, `#5B001F`) → `"dark-panel"`
   - Fill matches accent amber (`#F5B73B`) → `"callout"`
   - Fill is white/near-white + high-contrast border (luminance delta > 0.7) → `"card"`
   - Fill is white/near-white + subtle border → `"subtle-card"`
3. Output as a role-keyed object (not array). Collisions → append `-2`.

---

## Error Handling

| Condition | Behaviour |
|---|---|
| No text runs | `typeScale: []` |
| All text same size | Single entry, context = `"body"` |
| No multi-column pattern | `grid: { columnCount: 1, columns: [], gutterPt: null }` |
| Mixed layouts across slides | Column count = modal across slides |
| Two fingerprints → same role | Less frequent gets `-2` suffix |
| `cornerRadiusPt` absent | Treated as 0, omitted from output |

---

## Testing Plan

All extractors follow existing TDD pattern in `tests/unit/tools/presentation-design-system.test.ts`.

### `extractTypeScale`
- Text-only slide → single entry
- Placeholder + freeform same size → two entries with different roles
- Style appearing once → filtered out
- Freeform inside amber shape → role includes `"freeform:amber"`
- Largest size → first in array

### `extractColumnGrid`
- Three elements at distinct X values → `columnCount: 3` with correct column entries
- All elements same X → `columnCount: 1`, empty `columns`
- Elements within 8pt of each other → merged into one column
- Mixed slides → modal column count wins

### `extractAnnotatedShapeStyles`
- Amber fill → key `"callout"`, `inferredRole: "highlighted callout"`
- No fill + black border → key `"ghost"`
- No fill + slate border → key `"slate-ghost"`
- Two white-card fingerprints → `"card"` and `"card-2"`
- `cornerRadiusPt` from API → captured in output

### Integration (`presentationGetDesignSystemTool`)
- Output has `typeScale` array (not `typography` object)
- Output has `layout.grid` key
- Output has `shapeStyles` as object (not array)

---

## Breaking Changes

- `typography` key removed → replaced by `typeScale`
- `shapeStyles.common` array → `shapeStyles` becomes a flat object with role keys

These are additive changes to the MCP tool output; callers reading `typography` or `shapeStyles.common` will need updating.
