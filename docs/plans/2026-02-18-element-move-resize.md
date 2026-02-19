# Element Move/Resize Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `element_move_resize` tool that moves and/or resizes an existing element by pre-reading its intrinsic size and computing the correct transform.

**Architecture:** Pre-read the element via `client.getElement()` to get the current `transform` and `size`. Compute new `translateX/Y` from x/y inputs and new `scaleX/Y` from width/height inputs divided by intrinsic size. Send a single `updatePageElementTransform` batchUpdate with `applyMode: 'ABSOLUTE'`. All four position/size params are optional — at least one must be provided.

**Tech Stack:** TypeScript, `@googleapis/slides` batchUpdate API (`updatePageElementTransform`), Jest

---

## Context

**Coordinate system:** 1 point = 12700 EMU (English Metric Units). All user-facing values are in points; all API values are in EMU.

**Google Slides transform model:**
- Each element has an `intrinsic size` (`element.size.width.magnitude`, `element.size.height.magnitude`) in EMU — this never changes
- The `transform` matrix has `scaleX`, `scaleY` (default 1.0), `shearX`, `shearY` (default 0), `translateX`, `translateY` in EMU
- **Rendered width** = `intrinsicWidth * scaleX`; **rendered height** = `intrinsicHeight * scaleY`
- To achieve a rendered width of W points: `newScaleX = (W * 12700) / intrinsicWidth`
- `applyMode: 'ABSOLUTE'` sets the transform to the provided value (replaces current)

**Key files to understand:**
- `src/tools/element/update-text.ts` — the most recent tool; follow the same pattern exactly
- `src/tools/element/index.ts` — add re-export here
- `src/tools/shared/format.ts` — exports `emuToPoints` which you'll import for the success message

**Run tests with:** `npm test`

---

### Task 1: Implement `elementMoveResizeTool`

**Files:**
- Create: `src/tools/element/move-resize.ts`
- Modify: `src/tools/element/index.ts` (add re-export at end)
- Modify: `src/index.ts` (import + ListTools descriptor + CallTool case)
- Modify: `tests/unit/tools/element.test.ts` (add 4 tests)
- Modify: `docs/API.md` (add section after `element_update_text`)

---

**Step 1: Add four failing tests to `tests/unit/tools/element.test.ts`**

Add this import at the top alongside the existing imports:
```typescript
import { elementMoveResizeTool } from '../../../src/tools/element/index.js';
```

Add this `describe` block at the very end of the file, before the final `});` closing `describe('Element Tools', ...)`:

```typescript
describe('elementMoveResizeTool', () => {
  // Mock element: intrinsic size 300pt × 100pt, currently at position 100pt, 200pt, scale 1×1
  const mockPositionElement = {
    objectId: 'elem-abc',
    size: {
      width: { magnitude: 3810000, unit: 'EMU' },   // 300pt intrinsic
      height: { magnitude: 1270000, unit: 'EMU' },  // 100pt intrinsic
    },
    transform: {
      scaleX: 1,
      scaleY: 1,
      shearX: 0,
      shearY: 0,
      translateX: 1270000,  // 100pt
      translateY: 2540000,  // 200pt
    },
  };

  it('move only — updates translateX/Y, preserves scaleX/Y', async () => {
    mockClient.getElement.mockResolvedValue(mockPositionElement as any);
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

    const result = await elementMoveResizeTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      x: 50,
      y: 75,
    });

    expect(mockClient.getElement).toHaveBeenCalledWith('pres-123', 'elem-abc');
    expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
      {
        updatePageElementTransform: {
          objectId: 'elem-abc',
          applyMode: 'ABSOLUTE',
          transform: {
            scaleX: 1,          // preserved
            scaleY: 1,          // preserved
            shearX: 0,
            shearY: 0,
            translateX: 635000, // 50 * 12700
            translateY: 952500, // 75 * 12700
            unit: 'EMU',
          },
        },
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.elementId).toBe('elem-abc');
      expect(result.data?.x).toBe(50);
      expect(result.data?.y).toBe(75);
    }
  });

  it('resize only — computes scaleX/Y from intrinsic size, preserves translateX/Y', async () => {
    mockClient.getElement.mockResolvedValue(mockPositionElement as any);
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

    const result = await elementMoveResizeTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      width: 600,   // 600pt / 300pt intrinsic = scaleX 2
      height: 200,  // 200pt / 100pt intrinsic = scaleY 2
    });

    expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
      {
        updatePageElementTransform: {
          objectId: 'elem-abc',
          applyMode: 'ABSOLUTE',
          transform: {
            scaleX: 2,            // 600pt / 300pt
            scaleY: 2,            // 200pt / 100pt
            shearX: 0,
            shearY: 0,
            translateX: 1270000,  // preserved (100pt)
            translateY: 2540000,  // preserved (200pt)
            unit: 'EMU',
          },
        },
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.width).toBe(600);
      expect(result.data?.height).toBe(200);
    }
  });

  it('move + resize — all four params, all values computed', async () => {
    mockClient.getElement.mockResolvedValue(mockPositionElement as any);
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

    const result = await elementMoveResizeTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      x: 50,
      y: 75,
      width: 600,
      height: 200,
    });

    expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
      {
        updatePageElementTransform: {
          objectId: 'elem-abc',
          applyMode: 'ABSOLUTE',
          transform: {
            scaleX: 2,
            scaleY: 2,
            shearX: 0,
            shearY: 0,
            translateX: 635000,
            translateY: 952500,
            unit: 'EMU',
          },
        },
      },
    ]);
    expect(result.success).toBe(true);
  });

  it('no params — returns validation error without calling API', async () => {
    const result = await elementMoveResizeTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
    });

    expect(mockClient.getElement).not.toHaveBeenCalled();
    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
  });
});
```

---

**Step 2: Run tests to verify they fail**

```bash
cd /Users/michaelpolansky/Development/google-slides && npm test -- --testPathPattern element.test
```

Expected: FAIL — `elementMoveResizeTool` not exported yet.

---

**Step 3: Create `src/tools/element/move-resize.ts`**

```typescript
import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { emuToPoints } from '../shared/format.js';

export interface ElementMoveResizeParams {
  presentationId: string;
  elementId: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export async function elementMoveResizeTool(
  client: SlidesClient,
  params: ElementMoveResizeParams
): Promise<ToolResponse> {
  const { presentationId, elementId, x, y, width, height } = params;

  if (x == null && y == null && width == null && height == null) {
    return createErrorResponse('validation', 'At least one of x, y, width, or height must be provided');
  }

  try {
    const element = await client.getElement(presentationId, elementId);

    const intrinsicWidth = element.size?.width?.magnitude ?? 0;
    const intrinsicHeight = element.size?.height?.magnitude ?? 0;
    const currentScaleX = element.transform?.scaleX ?? 1;
    const currentScaleY = element.transform?.scaleY ?? 1;
    const currentTranslateX = element.transform?.translateX ?? 0;
    const currentTranslateY = element.transform?.translateY ?? 0;

    const newTranslateX = x != null ? x * 12700 : currentTranslateX;
    const newTranslateY = y != null ? y * 12700 : currentTranslateY;
    const newScaleX = width != null
      ? (intrinsicWidth > 0 ? (width * 12700) / intrinsicWidth : 1)
      : currentScaleX;
    const newScaleY = height != null
      ? (intrinsicHeight > 0 ? (height * 12700) / intrinsicHeight : 1)
      : currentScaleY;

    await client.batchUpdate(presentationId, [
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
      },
    ]);

    const finalX = x ?? emuToPoints(currentTranslateX);
    const finalY = y ?? emuToPoints(currentTranslateY);
    const finalWidth = width ?? emuToPoints(currentScaleX * intrinsicWidth);
    const finalHeight = height ?? emuToPoints(currentScaleY * intrinsicHeight);

    return createSuccessResponse(
      formatResponse('simple', `Moved/resized element: ${elementId} — Position: ${finalX}pt, ${finalY}pt  Size: ${finalWidth}pt × ${finalHeight}pt`),
      { elementId, x: finalX, y: finalY, width: finalWidth, height: finalHeight }
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

Append at the end of the file:
```typescript
export { elementMoveResizeTool, ElementMoveResizeParams } from './move-resize.js';
```

---

**Step 5: Run tests to verify all 4 new tests pass**

```bash
cd /Users/michaelpolansky/Development/google-slides && npm test -- --testPathPattern element.test
```

Expected: All element tests pass including the 4 new ones (57 total in element.test.ts).

---

**Step 6: Register in `src/index.ts`**

**6a — Update the element import block** (the `import { deleteElementTool, ... }` block). Add two items:

```typescript
import {
  deleteElementTool,
  DeleteElementParams,
  elementGetTool,
  ElementGetParams,
  elementUpdateTextTool,
  ElementUpdateTextParams,
  elementMoveResizeTool,
  ElementMoveResizeParams,
} from './tools/element/index.js';
```

**6b — Add tool descriptor in `ListToolsRequestSchema` handler**, after the `element_update_text` descriptor and before `add_text_box`:

```typescript
{
  name: 'element_move_resize',
  description: 'Move and/or resize an existing element by setting new position (x, y) and/or size (width, height) in points',
  inputSchema: {
    type: 'object',
    properties: {
      presentationId: {
        type: 'string',
        description: 'The ID of the presentation',
      },
      elementId: {
        type: 'string',
        description: 'The ID of the element to move or resize',
      },
      x: {
        type: 'number',
        description: 'New x position in points (distance from left edge of slide)',
      },
      y: {
        type: 'number',
        description: 'New y position in points (distance from top edge of slide)',
      },
      width: {
        type: 'number',
        description: 'New width in points',
      },
      height: {
        type: 'number',
        description: 'New height in points',
      },
    },
    required: ['presentationId', 'elementId'],
  },
},
```

**6c — Add case in `CallToolRequestSchema` handler**, after `case 'element_update_text':` and before `case 'add_text_box':`:

```typescript
case 'element_move_resize': {
  const params = args as unknown as ElementMoveResizeParams;
  const result = await elementMoveResizeTool(client, params);

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

Expected: 57 tests pass (53 + 4 new).

---

**Step 8: Update `docs/API.md`**

Add this section after `element_update_text` (after its `---` separator, before `## Helper Tools`):

```markdown
### element_move_resize

Move and/or resize an existing element. Pass any combination of `x`, `y`, `width`, `height` — unspecified values are preserved from the current element state.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `elementId` (string, required): The ID of the element to move or resize
- `x` (number, optional): New x position in points (distance from left edge of slide)
- `y` (number, optional): New y position in points (distance from top edge of slide)
- `width` (number, optional): New width in points
- `height` (number, optional): New height in points

At least one of `x`, `y`, `width`, or `height` must be provided.

**Coordinate System:**
- Origin (0, 0) is top-left corner of the slide
- Units are points (1 inch = 72 points)
- Standard slide is 720 × 540 points (10" × 7.5")

**Returns:**
```json
{
  "elementId": "elem_001",
  "x": 50,
  "y": 75,
  "width": 400,
  "height": 100
}
```

**Example — move only:**
```typescript
{
  "name": "element_move_resize",
  "arguments": {
    "presentationId": "abc123",
    "elementId": "elem_001",
    "x": 50,
    "y": 100
  }
}
```

**Example — resize only:**
```typescript
{
  "name": "element_move_resize",
  "arguments": {
    "presentationId": "abc123",
    "elementId": "elem_001",
    "width": 400,
    "height": 80
  }
}
```

**Tip:** Use `element_get` first to see the current position and size before repositioning.

---
```

---

**Step 9: Run all tests one final time**

```bash
cd /Users/michaelpolansky/Development/google-slides && npm test
```

Expected: 57 tests pass, 0 failures.

---

**Step 10: Commit**

```bash
cd /Users/michaelpolansky/Development/google-slides
git add src/tools/element/move-resize.ts src/tools/element/index.ts src/index.ts tests/unit/tools/element.test.ts docs/API.md
git commit -m "feat: add element_move_resize tool to update element position and size"
```
