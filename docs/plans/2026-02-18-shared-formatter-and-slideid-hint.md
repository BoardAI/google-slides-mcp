# Shared Formatter Extraction & `slideId` Hint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated formatter helpers into a shared module, then add an optional `slideId` scoping hint to `element_get`.

**Architecture:** Task 1 is a pure refactor — create `src/tools/shared/format.ts` exporting `emuToPoints` and `formatElementSummary`, then update both tool files to import from it (drop their local copies). Task 2 adds `slideId?: string` to `ElementGetParams` and branches `elementGetTool` to scope the element search to one slide when the hint is provided.

**Tech Stack:** TypeScript, `@googleapis/slides` (for `slides_v1.Schema$PageElement`), Jest

---

## Context

This codebase is a Google Slides MCP server. All tools follow the same pattern:
- Tool function takes `(client: SlidesClient, params: SomeParams): Promise<ToolResponse>`
- `SlidesClient` wraps the Google Slides API (`src/google/client.ts`)
- `ToolResponse` is `SuccessResponse | ErrorResponse` from `src/utils/response.ts`
- Tests live in `tests/unit/tools/` and mock `SlidesClient`

**Run tests with:** `npm test`
**Build with:** `npm run build`

---

### Task 1: Extract Shared Formatter

**Purpose:** Move `emuToPoints` and `formatElementSummary` from both tool files into a shared module. Pure refactor — no behaviour change, no new tests needed. Existing tests will verify nothing broke.

**Files:**
- Create: `src/tools/shared/format.ts`
- Modify: `src/tools/slide/get.ts` (lines 1–61)
- Modify: `src/tools/element/get.ts` (lines 1–61)

---

**Step 1: Create `src/tools/shared/format.ts`**

Create the file with this exact content — the `formatElementSummary` signature uses `index?: number` (optional), which is the more flexible version from `element/get.ts`:

```typescript
import { slides_v1 } from '@googleapis/slides';

export function emuToPoints(emu: number | null | undefined): number {
  return Math.round((emu ?? 0) / 12700);
}

export function formatElementSummary(el: slides_v1.Schema$PageElement, index?: number): string {
  const id = el.objectId ?? 'unknown';
  const x = emuToPoints(el.transform?.translateX);
  const y = emuToPoints(el.transform?.translateY);
  const w = emuToPoints(el.size?.width?.magnitude);
  const h = emuToPoints(el.size?.height?.magnitude);
  const position = `Position: ${x}pt, ${y}pt  Size: ${w}pt × ${h}pt`;

  let type = 'UNKNOWN';
  let extra = '';

  if (el.shape) {
    type = 'SHAPE';
    const text = el.shape.text?.textElements
      ?.filter(te => te.textRun?.content)
      .map(te => te.textRun!.content!)
      .join('')
      .trim() ?? '';
    if (text) extra = `\n   Text: "${text.slice(0, 100)}"`;
  } else if (el.image) {
    type = 'IMAGE';
    const url = el.image.contentUrl ?? el.image.sourceUrl ?? '';
    if (url) extra = `\n   URL: ${url.slice(0, 60)}`;
  } else if (el.table) {
    type = 'TABLE';
    extra = `\n   ${el.table.rows} rows × ${el.table.columns} columns`;
  } else if (el.video) {
    type = 'VIDEO';
    if (el.video.id) extra = `\n   Video ID: ${el.video.id}`;
  } else if (el.line) {
    type = 'LINE';
  } else if (el.wordArt) {
    type = 'WORD ART';
    if (el.wordArt.renderedText) extra = `\n   Text: "${el.wordArt.renderedText}"`;
  } else if (el.sheetsChart) {
    type = 'SHEETS CHART';
    if (el.sheetsChart.spreadsheetId) extra = `\n   Sheet: ${el.sheetsChart.spreadsheetId}`;
  }

  const prefix = index !== undefined ? `${index}. ` : '';
  return `${prefix}${type} [${id}]\n   ${position}${extra}`;
}
```

---

**Step 2: Update `src/tools/slide/get.ts`**

Replace the entire file imports + local helpers block (lines 1–60) with this. The call site `formatElementSummary(el, i + 1)` on line 74 does NOT change — just the import and removal of local functions:

```typescript
import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';
import { formatElementSummary } from '../shared/format.js';

export interface SlideGetParams {
  presentationId: string;
  slideId: string;
  detailed?: boolean;
}
```

Delete the local `emuToPoints` function (lines 16–18) and the local `formatElementSummary` function (lines 20–60). The `slideGetTool` function body (lines 62–94) stays unchanged.

Full resulting file should be:

```typescript
import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';
import { formatElementSummary } from '../shared/format.js';

export interface SlideGetParams {
  presentationId: string;
  slideId: string;
  detailed?: boolean;
}

export async function slideGetTool(
  client: SlidesClient,
  params: SlideGetParams
): Promise<ToolResponse> {
  try {
    const slide = await client.getSlide(params.presentationId, params.slideId);
    const elements = slide.pageElements ?? [];
    const count = elements.length;

    let message = `Slide: ${params.slideId} (${count} element${count !== 1 ? 's' : ''})`;

    if (count > 0) {
      const summaries = elements.map((el, i) => formatElementSummary(el, i + 1));
      message += '\n\n' + summaries.join('\n\n');
    }

    if (params.detailed) {
      message += '\n\n--- Raw Data ---\n' + JSON.stringify(elements, null, 2);
    }

    return createSuccessResponse(message, {
      slideId: params.slideId,
      presentationId: params.presentationId,
      elementCount: count,
      elements,
    });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
```

---

**Step 3: Update `src/tools/element/get.ts`**

Same pattern — replace the imports and drop local helpers. The call site `formatElementSummary(element)` stays unchanged.

Full resulting file (this will be further modified in Task 2 — for now, just the refactor):

```typescript
import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';
import { formatElementSummary } from '../shared/format.js';

export interface ElementGetParams {
  presentationId: string;
  elementId: string;
  detailed?: boolean;
}

export async function elementGetTool(
  client: SlidesClient,
  params: ElementGetParams
): Promise<ToolResponse> {
  try {
    const element = await client.getElement(params.presentationId, params.elementId);

    let message = formatElementSummary(element);

    if (params.detailed) {
      message += '\n\n--- Raw Data ---\n' + JSON.stringify(element, null, 2);
    }

    return createSuccessResponse(message, {
      elementId: params.elementId,
      presentationId: params.presentationId,
      element,
    });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
```

---

**Step 4: Run all tests to verify the refactor didn't break anything**

```bash
npm test
```

Expected: All tests pass (same count as before — currently 31 tests). If any test fails, the shared function body has diverged from one of the originals — compare character-by-character.

---

**Step 5: Commit**

```bash
git add src/tools/shared/format.ts src/tools/slide/get.ts src/tools/element/get.ts
git commit -m "refactor: extract emuToPoints and formatElementSummary to shared module"
```

---

### Task 2: Add `slideId` Hint to `element_get`

**Purpose:** When callers already know which slide an element is on, they can pass `slideId` to scope the search. This gives a more specific error message and narrows the in-memory search. The network cost is unchanged (`client.getSlide` still calls `getPresentation` internally).

**Files:**
- Modify: `src/tools/element/get.ts`
- Modify: `tests/unit/tools/element.test.ts`
- Modify: `src/index.ts` (lines 234–255)
- Modify: `docs/API.md` (lines 193–224)

---

**Step 1: Write two failing tests in `tests/unit/tools/element.test.ts`**

First, add `getSlide: jest.fn()` to the mock in `beforeEach` (line 11–15):

```typescript
beforeEach(() => {
  mockClient = {
    batchUpdate: jest.fn(),
    getElement: jest.fn(),
    getSlide: jest.fn(),
  } as any;
});
```

Then add these two tests inside the `describe('elementGetTool', ...)` block, after the last existing test (after line 184, before the closing `});`):

```typescript
it('slideId provided — element found on slide', async () => {
  mockClient.getSlide.mockResolvedValue({
    objectId: 'slide-abc',
    pageElements: [mockElement],
  } as any);

  const result = await elementGetTool(mockClient, {
    presentationId: 'pres-123',
    elementId: 'elem-xyz',
    slideId: 'slide-abc',
  });

  expect(mockClient.getSlide).toHaveBeenCalledWith('pres-123', 'slide-abc');
  expect(mockClient.getElement).not.toHaveBeenCalled();
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.message).toContain('elem-xyz');
  }
});

it('slideId provided — element not found on slide', async () => {
  mockClient.getSlide.mockResolvedValue({
    objectId: 'slide-abc',
    pageElements: [],
  } as any);

  const result = await elementGetTool(mockClient, {
    presentationId: 'pres-123',
    elementId: 'elem-xyz',
    slideId: 'slide-abc',
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.message).toContain('not found on slide');
    expect(result.error.message).toContain('slide-abc');
  }
});
```

---

**Step 2: Run the two new tests to verify they fail**

```bash
npm test -- --testPathPattern element.test
```

Expected: The two new tests FAIL (TypeScript error or runtime: `slideId` not a known param, `getSlide` path doesn't exist yet).

---

**Step 3: Implement `slideId` support in `src/tools/element/get.ts`**

Replace the `ElementGetParams` interface and `elementGetTool` function with:

```typescript
export interface ElementGetParams {
  presentationId: string;
  elementId: string;
  detailed?: boolean;
  slideId?: string;
}

export async function elementGetTool(
  client: SlidesClient,
  params: ElementGetParams
): Promise<ToolResponse> {
  try {
    let element;

    if (params.slideId) {
      const slide = await client.getSlide(params.presentationId, params.slideId);
      element = slide.pageElements?.find(e => e.objectId === params.elementId);
      if (!element) {
        throw new SlidesAPIError(
          `Element ${params.elementId} not found on slide ${params.slideId}`,
          404, undefined, false
        );
      }
    } else {
      element = await client.getElement(params.presentationId, params.elementId);
    }

    let message = formatElementSummary(element);

    if (params.detailed) {
      message += '\n\n--- Raw Data ---\n' + JSON.stringify(element, null, 2);
    }

    return createSuccessResponse(message, {
      elementId: params.elementId,
      presentationId: params.presentationId,
      element,
    });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
```

---

**Step 4: Run all tests to verify all pass**

```bash
npm test
```

Expected: All tests pass (2 more than before Task 2 started — total 33).

---

**Step 5: Add `slideId` property to `element_get` inputSchema in `src/index.ts`**

Find the `element_get` tool definition (lines 234–255). Add a `slideId` property inside the `properties` object, after `elementId`:

```typescript
slideId: {
  type: 'string',
  description: 'Optional: ID of the slide to scope the search to. Produces a more specific error if the element is not on that slide.',
},
```

The full `element_get` tool definition should become:

```typescript
{
  name: 'element_get',
  description: 'Get details of a specific element by ID (position, size, type, text content)',
  inputSchema: {
    type: 'object',
    properties: {
      presentationId: {
        type: 'string',
        description: 'The ID of the presentation',
      },
      elementId: {
        type: 'string',
        description: 'The ID of the element to retrieve',
      },
      slideId: {
        type: 'string',
        description: 'Optional: ID of the slide to scope the search to. Produces a more specific error if the element is not on that slide.',
      },
      detailed: {
        type: 'boolean',
        description: 'When true, includes full raw API properties (default: false)',
      },
    },
    required: ['presentationId', 'elementId'],
  },
},
```

---

**Step 6: Update `docs/API.md` — document `slideId` on `element_get`**

Find the `element_get` section (lines 193–224). Update the description paragraph and parameters list:

Change the description line from:
```
Get details of a specific element by ID. Searches all slides in the presentation — no `slideId` needed.
```

To:
```
Get details of a specific element by ID. By default searches all slides in the presentation. Pass `slideId` to scope the search to one slide and get a more specific error if the element is not found there.
```

Add `slideId` to the **Parameters** list, after `elementId`:
```markdown
- `slideId` (string, optional): When provided, limits the search to this slide. If the element is not on that slide, the error message will say so explicitly.
```

---

**Step 7: Run all tests one final time**

```bash
npm test
```

Expected: All 33 tests pass.

---

**Step 8: Commit**

```bash
git add src/tools/element/get.ts tests/unit/tools/element.test.ts src/index.ts docs/API.md
git commit -m "feat: add slideId hint to element_get for scoped element search"
```
