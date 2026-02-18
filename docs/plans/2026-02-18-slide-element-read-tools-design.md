# Slide & Element Read Tools — Design Document

**Date:** February 18, 2026
**Status:** Approved
**Approach:** Two focused read tools with adaptive verbosity

---

## Overview

Add `slide_get` and `element_get` tools to the Google Slides MCP server. These are the foundational read operations needed before any editing workflow — you must be able to inspect what's on a slide (element IDs, types, positions, text) before issuing update or delete commands.

---

## Tools

### `slide_get`

Returns all page elements on a slide.

**Parameters:**
- `presentationId: string` — required
- `slideId: string` — required
- `detailed?: boolean` — default `false`; when `true`, includes full raw `PageElement` JSON

**Summary output format:**
```
Slide: <slideId> (N elements)

1. SHAPE [elem_abc]
   Position: 100pt, 200pt  Size: 300pt × 150pt
   Text: "Hello World"

2. IMAGE [elem_def]
   Position: 400pt, 50pt  Size: 200pt × 100pt

3. TABLE [elem_ghi]
   Position: 50pt, 400pt  Size: 600pt × 200pt
   3 rows × 4 columns
```

**Detailed output:** summary + raw `PageElement` JSON per element.

---

### `element_get`

Returns a single element by ID. Searches across all slides in the presentation.

**Parameters:**
- `presentationId: string` — required
- `elementId: string` — required
- `detailed?: boolean` — default `false`

**Summary output:** same format as one entry from `slide_get`.

**Detailed output:** summary + full raw `PageElement` JSON.

---

## API Approach

The Google Slides API has no dedicated endpoints for individual slides or elements. All reads go through `presentations.get` which returns the full presentation. Both tools will:

1. Call the existing `client.getPresentation(presentationId)`
2. Extract the relevant slice of the response

This is read-only — no `batchUpdate` call needed.

Two helper methods are added to `SlidesClient`:

- `getSlide(presentationId, slideId)` — finds matching slide in `presentation.slides[]` or throws `SlidesAPIError(404)`
- `getElement(presentationId, elementId)` — iterates all slides' `pageElements[]` to find element or throws `SlidesAPIError(404)`

---

## Element Types Handled

The Google Slides API `PageElement` can be one of:

| Type field | Display label | Extra summary info |
|---|---|---|
| `shape` | SHAPE | text content (truncated to 100 chars) |
| `image` | IMAGE | content URL (truncated) |
| `table` | TABLE | rows × columns |
| `video` | VIDEO | video ID |
| `line` | LINE | — |
| `wordArt` | WORD ART | rendered text |
| `sheetsChart` | SHEETS CHART | spreadsheet ID |

---

## Files Changed

| Action | File | Notes |
|---|---|---|
| New | `src/tools/slide/get.ts` | `slideGetTool` implementation |
| New | `src/tools/element/get.ts` | `elementGetTool` implementation |
| Modified | `src/tools/slide/index.ts` | Re-export `slideGetTool`, `SlideGetParams` |
| Modified | `src/tools/element/index.ts` | Re-export `elementGetTool`, `ElementGetParams` |
| Modified | `src/google/client.ts` | Add `getSlide()`, `getElement()` helpers |
| Modified | `src/index.ts` | Register `slide_get` and `element_get` in tool list + call handler |
| New | `tests/unit/tools/element.test.ts` | Tests for `element_get` |
| Modified | `tests/unit/tools/slide.test.ts` | Add tests for `slide_get` |

---

## Error Handling

- **Slide not found:** `SlidesAPIError` with message `Slide <slideId> not found in presentation <presentationId>`
- **Element not found:** `SlidesAPIError` with message `Element <elementId> not found in presentation <presentationId>`
- **API errors:** Existing `SlidesAPIError` path in `SlidesClient`

---

## Testing

Unit tests (mocked API) cover:

- `slide_get` summary — returns formatted element list
- `slide_get` detailed — includes raw JSON
- `slide_get` error — slide not found
- `element_get` summary — returns single element summary
- `element_get` detailed — includes raw JSON
- `element_get` error — element not found
- `SlidesClient.getSlide` — extracts correct slide
- `SlidesClient.getElement` — finds element across slides
