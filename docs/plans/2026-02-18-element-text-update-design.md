# Element Text Update Design

**Date:** February 18, 2026
**Status:** Approved
**Scope:** Add `element_update_text` tool to replace text content of an existing element

---

## Problem

There is no way to edit the text of an existing element. The only workaround today is to delete the element and create a new text box, which loses position, size, and styling and changes the element's objectId.

## Solution

Add `element_update_text` tool. Sends a two-request `batchUpdate`: `deleteText` (clear all existing content) followed by `insertText` (set new content). One network call, atomic, no pre-read.

**Params:**
```typescript
interface ElementUpdateTextParams {
  presentationId: string;  // required
  elementId: string;       // required
  text: string;            // required — full replacement text
}
```

**Batch requests:**
```typescript
[
  { deleteText: { objectId: elementId, textRange: { type: 'ALL' } } },
  { insertText: { objectId: elementId, text, insertionIndex: 0 } },
]
```

The API returns an error if the element does not exist or does not support text. That error surfaces through the existing `createErrorResponse('api', ...)` path unchanged.

**Success response:** `"Updated text on element: <elementId>"` with `{ elementId, text }` in the data field.

**No pre-read.** The update is attempted directly. No extra API call to verify the element first.

---

## Files Changed

| File | Change |
|---|---|
| `src/tools/element/update-text.ts` | **New** — implements `elementUpdateTextTool` and `ElementUpdateTextParams` |
| `src/tools/element/index.ts` | Add re-export |
| `src/index.ts` | Register in `ListToolsRequestSchema` and `CallToolRequestSchema` |
| `tests/unit/tools/element.test.ts` | Add 2 tests: success and API error |
| `docs/API.md` | Document `element_update_text` under Element Tools |

---

## Testing

1. **Success** — mock `batchUpdate` resolves; verify called with exact `deleteText` + `insertText` requests and result is success with elementId and text in data
2. **API error** — mock `batchUpdate` rejects with `SlidesAPIError`; verify result is failure with `error.type === 'api'`
