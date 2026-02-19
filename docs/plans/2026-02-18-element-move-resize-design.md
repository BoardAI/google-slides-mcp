# Element Move/Resize Design

**Date:** February 18, 2026
**Status:** Approved
**Scope:** Add `element_move_resize` tool to update position and/or size of an existing element

---

## Problem

There is no way to move or resize an existing element. Users can read position and size via `element_get` but cannot change them.

## Solution

Add `element_move_resize` tool. Pre-reads the element to get its current transform and intrinsic size, computes new scale factors and/or translation values, then sends a single `updatePageElementTransform` batchUpdate request with `applyMode: 'ABSOLUTE'`.

### Why a pre-read is needed

Google Slides stores element size as an intrinsic dimension (e.g. 300pt wide) and applies scale factors via the transform matrix. To render at a new width W, the required `scaleX = W_emu / intrinsicWidth_emu`. Without reading the intrinsic size first, the scale factor cannot be computed.

## Params

```typescript
interface ElementMoveResizeParams {
  presentationId: string;  // required
  elementId: string;       // required
  x?: number;              // new x position in points (optional)
  y?: number;              // new y position in points (optional)
  width?: number;          // new width in points (optional)
  height?: number;         // new height in points (optional)
}
```

At least one of `x`, `y`, `width`, `height` must be provided. If none are provided, the tool returns a validation error without making any API calls.

## Logic

1. **Validate** — if none of x/y/width/height provided, return error immediately
2. **Pre-read** — `client.getElement(presentationId, elementId)` to get current transform + intrinsic size
3. **Compute new transform** — preserve any field not specified by the caller:
   - `newTranslateX = x != null ? x * 12700 : (element.transform?.translateX ?? 0)`
   - `newTranslateY = y != null ? y * 12700 : (element.transform?.translateY ?? 0)`
   - `newScaleX = width != null ? (width * 12700) / intrinsicWidth : (element.transform?.scaleX ?? 1)`
   - `newScaleY = height != null ? (height * 12700) / intrinsicHeight : (element.transform?.scaleY ?? 1)`
   - Preserve `shearX` and `shearY` from the existing transform (default 0)
   - Edge case: if `intrinsicWidth` or `intrinsicHeight` is 0, default that scale to 1
4. **Update** — `batchUpdate` with one `updatePageElementTransform` request:
   ```typescript
   {
     updatePageElementTransform: {
       objectId: elementId,
       applyMode: 'ABSOLUTE',
       transform: {
         scaleX: newScaleX,
         scaleY: newScaleY,
         shearX: element.transform?.shearX ?? 0,
         shearY: element.transform?.shearY ?? 0,
         translateX: newTranslateX,
         translateY: newTranslateY,
         unit: 'EMU',
       },
     },
   }
   ```

**Success response:** `"Moved/resized element: <id> — Position: <x>pt, <y>pt  Size: <w>pt × <h>pt"` with computed final values in data field.

## Files Changed

| File | Change |
|---|---|
| `src/tools/element/move-resize.ts` | **New** — implements `elementMoveResizeTool` and `ElementMoveResizeParams` |
| `src/tools/element/index.ts` | Add re-export |
| `src/index.ts` | Register in `ListToolsRequestSchema` and `CallToolRequestSchema` |
| `tests/unit/tools/element.test.ts` | Add 4 tests |
| `docs/API.md` | Document `element_move_resize` under Element Tools |

## Testing

1. **Move only** (x, y provided) — verify `translateX`/`translateY` set correctly; `scaleX`/`scaleY` preserved from mock element
2. **Resize only** (width, height provided) — verify `scaleX`/`scaleY` computed from intrinsic size; `translateX`/`translateY` preserved
3. **Move + resize** (all four provided) — verify all values computed correctly in a single `batchUpdate` call
4. **No params** — verify validation error returned immediately; `getElement` and `batchUpdate` NOT called
