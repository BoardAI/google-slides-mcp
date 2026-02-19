# Element Update Text Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `element_update_text` tool that replaces the full text content of an existing element using a single `batchUpdate` call.

**Architecture:** New file `src/tools/element/update-text.ts` exports `elementUpdateTextTool`. It sends two requests in one `batchUpdate`: `deleteText` (type: ALL) then `insertText`. No pre-read. Re-exported from the element index, registered in `src/index.ts`, documented in `docs/API.md`.

**Tech Stack:** TypeScript, `@googleapis/slides` batchUpdate API, Jest

---

## Context

All writes go through `client.batchUpdate(presentationId, requests[])`. Look at `src/tools/helpers/text.ts` for the exact pattern — `addTextBoxTool` already uses `insertText`. This tool is the same shape but targets an existing element.

The element index at `src/tools/element/index.ts` currently exports `deleteElementTool` inline and re-exports `elementGetTool` from `./get.js`. You'll add a new re-export from `./update-text.js`.

`formatResponse` is imported from `../../utils/response.js` — used in `deleteElementTool` for the success message. Use the same import in your new file.

**Run tests with:** `npm test`

---

### Task 1: Implement `elementUpdateTextTool`

**Files:**
- Create: `src/tools/element/update-text.ts`
- Modify: `src/tools/element/index.ts` (line 41 — add re-export)
- Modify: `src/index.ts` (imports ~line 32, ListTools ~line 255, CallTool ~line 510)
- Modify: `tests/unit/tools/element.test.ts` (add 2 tests)
- Modify: `docs/API.md` (add section after `element_get`)

---

**Step 1: Add two failing tests to `tests/unit/tools/element.test.ts`**

Add this import at the top of the file (after the existing imports):

```typescript
import { elementUpdateTextTool } from '../../../src/tools/element/index.js';
```

Add this new `describe` block at the end of the file, before the final `});` that closes the outer `describe('Element Tools', ...)`:

```typescript
describe('elementUpdateTextTool', () => {
  it('should replace text with deleteText + insertText batch', async () => {
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

    const result = await elementUpdateTextTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      text: 'New content',
    });

    expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
      { deleteText: { objectId: 'elem-abc', textRange: { type: 'ALL' } } },
      { insertText: { objectId: 'elem-abc', text: 'New content', insertionIndex: 0 } },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.elementId).toBe('elem-abc');
      expect(result.data?.text).toBe('New content');
    }
  });

  it('should handle API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Element not found', 404));

    const result = await elementUpdateTextTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-missing',
      text: 'New content',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
```

---

**Step 2: Run the new tests to verify they fail**

```bash
cd /Users/michaelpolansky/Development/google-slides && npm test -- --testPathPattern element.test
```

Expected: FAIL — `elementUpdateTextTool` is not exported yet.

---

**Step 3: Create `src/tools/element/update-text.ts`**

```typescript
import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface ElementUpdateTextParams {
  presentationId: string;
  elementId: string;
  text: string;
}

export async function elementUpdateTextTool(
  client: SlidesClient,
  params: ElementUpdateTextParams
): Promise<ToolResponse> {
  try {
    await client.batchUpdate(params.presentationId, [
      {
        deleteText: {
          objectId: params.elementId,
          textRange: { type: 'ALL' },
        },
      },
      {
        insertText: {
          objectId: params.elementId,
          text: params.text,
          insertionIndex: 0,
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse('simple', `Updated text on element: ${params.elementId}`),
      { elementId: params.elementId, text: params.text }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
```

---

**Step 4: Add re-export to `src/tools/element/index.ts`**

Append after the last line (line 41):

```typescript
export { elementUpdateTextTool, ElementUpdateTextParams } from './update-text.js';
```

---

**Step 5: Run the tests to verify they pass**

```bash
cd /Users/michaelpolansky/Development/google-slides && npm test -- --testPathPattern element.test
```

Expected: All element tests pass (53 total in element.test.ts).

---

**Step 6: Register the tool in `src/index.ts`**

**6a — Add to imports** (around line 32–36, the element import block):

```typescript
import {
  deleteElementTool,
  DeleteElementParams,
  elementGetTool,
  ElementGetParams,
  elementUpdateTextTool,
  ElementUpdateTextParams,
} from './tools/element/index.js';
```

**6b — Add to the `ListToolsRequestSchema` handler** (after the `element_get` tool descriptor, around line 255):

```typescript
{
  name: 'element_update_text',
  description: 'Replace the text content of an existing element (clears existing text, inserts new text)',
  inputSchema: {
    type: 'object',
    properties: {
      presentationId: {
        type: 'string',
        description: 'The ID of the presentation',
      },
      elementId: {
        type: 'string',
        description: 'The ID of the element to update',
      },
      text: {
        type: 'string',
        description: 'The new text content — replaces all existing text',
      },
    },
    required: ['presentationId', 'elementId', 'text'],
  },
},
```

**6c — Add to the `CallToolRequestSchema` handler** (after the `case 'element_get':` block, around line 510):

```typescript
case 'element_update_text': {
  const params = args as unknown as ElementUpdateTextParams;
  const result = await elementUpdateTextTool(client, params);

  if (result.success) {
    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${result.error.message}`,
        },
      ],
      isError: true,
    };
  }
}
```

---

**Step 7: Run all tests**

```bash
cd /Users/michaelpolansky/Development/google-slides && npm test
```

Expected: 53 tests pass (51 before + 2 new).

---

**Step 8: Update `docs/API.md`**

Add this section immediately after the `element_get` section (after the `---` separator following element_get, before the `## Helper Tools` heading):

```markdown
### element_update_text

Replace the text content of an existing element. Clears all existing text and inserts the new content.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `elementId` (string, required): The ID of the element to update
- `text` (string, required): The new text content (replaces all existing text)

**Returns:**
```json
{
  "elementId": "elem_001",
  "text": "Updated text content"
}
```

**Example:**
```typescript
{
  "name": "element_update_text",
  "arguments": {
    "presentationId": "abc123",
    "elementId": "elem_001",
    "text": "New slide title"
  }
}
```

**Note:** Replaces ALL text in the element. Existing character-level formatting (fonts, colors, bold) is not preserved — the inserted text takes the element's default style.

**Tip:** Use `element_get` first to confirm the element ID and that it is a SHAPE (text-bearing element) before calling `element_update_text`.

---
```

---

**Step 9: Run all tests one final time**

```bash
cd /Users/michaelpolansky/Development/google-slides && npm test
```

Expected: 53 tests pass, 0 failures.

---

**Step 10: Commit**

```bash
cd /Users/michaelpolansky/Development/google-slides
git add src/tools/element/update-text.ts src/tools/element/index.ts src/index.ts tests/unit/tools/element.test.ts docs/API.md
git commit -m "feat: add element_update_text tool to replace element text content"
```
