# Shared Formatter Extraction & `slideId` Hint Design

**Date:** February 18, 2026
**Status:** Approved
**Scope:** Two cleanup items from the post-implementation review

---

## Item 1 — Extract Shared Formatter

### Problem

`emuToPoints` and `formatElementSummary` are duplicated verbatim across `src/tools/slide/get.ts` and `src/tools/element/get.ts`. A bug fix or formatting change to either function must be applied in two places.

### Solution

Create `src/tools/shared/format.ts` exporting both functions. Both tool files import from the shared module and drop their local copies.

**Shared signature** (the more flexible version from `element/get.ts`):

```typescript
export function emuToPoints(emu: number | null | undefined): number
export function formatElementSummary(el: Schema$PageElement, index?: number): string
```

Call sites are unchanged:
- `slide/get.ts` calls `formatElementSummary(el, i + 1)` (numbered list)
- `element/get.ts` calls `formatElementSummary(element)` (no index, no prefix)

**No behaviour changes. No test changes required.**

---

## Item 2 — `slideId` Hint on `element_get`

### Problem

`element_get` always searches all slides in the presentation to find an element. Callers who already know which slide an element is on (e.g. after calling `slide_get`) pay the cost of a full scan anyway, and get a generic "not found in presentation" error rather than a more specific one.

### Solution

Add `slideId?: string` to `ElementGetParams`. When provided, scope the search to that slide only.

**Logic in `elementGetTool`:**

```
if params.slideId provided:
  slide = await client.getSlide(presentationId, slideId)
  element = slide.pageElements?.find(e => e.objectId === elementId)
  if not found:
    throw SlidesAPIError("Element <elementId> not found on slide <slideId>", 404)
else:
  element = await client.getElement(presentationId, elementId)  // existing path
```

**Note:** This is a search-scope improvement, not a network improvement — `client.getSlide()` still calls `getPresentation()` internally. The benefit is a narrower element search and a more specific error message.

---

## Files Changed

| File | Change |
|---|---|
| `src/tools/shared/format.ts` | **New** — exports `emuToPoints`, `formatElementSummary` |
| `src/tools/slide/get.ts` | Import from `../shared/format.js`, drop local copies |
| `src/tools/element/get.ts` | Import from `../shared/format.js`, drop local copies; add `slideId` path |
| `src/index.ts` | Add optional `slideId` property to `element_get` inputSchema |
| `tests/unit/tools/element.test.ts` | Add 2 tests for `slideId` hint (found, not found) |
| `docs/API.md` | Document `slideId` param on `element_get` |

---

## Testing

New unit tests in `tests/unit/tools/element.test.ts`:

1. **`slideId` provided, element found** — mock `getSlide` returns slide with matching element; verify result success and element data
2. **`slideId` provided, element not on slide** — mock `getSlide` returns slide without matching element; verify error message contains "not found on slide"
