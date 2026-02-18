# Slide & Element Read Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `slide_get` and `element_get` MCP tools so Claude can inspect slide contents (element IDs, types, positions, text) before editing.

**Architecture:** Both tools call the existing `client.getPresentation()` and extract the relevant slice — no new API endpoints needed. Two new helper methods (`getSlide`, `getElement`) are added to `SlidesClient`. Tools format a human-readable summary by default, with `detailed: true` appending raw JSON.

**Tech Stack:** TypeScript, `@googleapis/slides`, `@modelcontextprotocol/sdk`, Jest (unit tests with mocked client)

---

## Task 1: Add `getSlide` and `getElement` helpers to `SlidesClient`

**Files:**
- Modify: `src/google/client.ts`
- Modify: `tests/unit/google/client.test.ts`

### Step 1: Write failing tests for `getSlide`

Add to `tests/unit/google/client.test.ts` (inside the `describe('SlidesClient', ...)` block, after the existing tests):

```typescript
describe('getSlide', () => {
  it('should return the matching slide', async () => {
    const mockSlide = { objectId: 'slide-abc', pageElements: [] };
    jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
      presentationId: 'pres-123',
      slides: [mockSlide],
    } as any);

    const result = await slidesClient.getSlide('pres-123', 'slide-abc');
    expect(result).toEqual(mockSlide);
  });

  it('should throw 404 when slide not found', async () => {
    jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
      presentationId: 'pres-123',
      slides: [{ objectId: 'slide-other' }],
    } as any);

    await expect(slidesClient.getSlide('pres-123', 'slide-missing'))
      .rejects.toMatchObject({ code: 404 });
  });
});

describe('getElement', () => {
  it('should return the matching element from any slide', async () => {
    const mockElement = { objectId: 'elem-xyz', shape: {} };
    jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
      presentationId: 'pres-123',
      slides: [
        { objectId: 'slide-1', pageElements: [{ objectId: 'elem-other' }] },
        { objectId: 'slide-2', pageElements: [mockElement] },
      ],
    } as any);

    const result = await slidesClient.getElement('pres-123', 'elem-xyz');
    expect(result).toEqual(mockElement);
  });

  it('should throw 404 when element not found in any slide', async () => {
    jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
      presentationId: 'pres-123',
      slides: [{ objectId: 'slide-1', pageElements: [{ objectId: 'elem-other' }] }],
    } as any);

    await expect(slidesClient.getElement('pres-123', 'elem-missing'))
      .rejects.toMatchObject({ code: 404 });
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npm test -- --testPathPattern=client
```

Expected: FAIL — `getSlide is not a function`, `getElement is not a function`

### Step 3: Implement `getSlide` and `getElement` in `src/google/client.ts`

Add these two methods to the `SlidesClient` class, before the `// Drive API operations` comment:

```typescript
async getSlide(presentationId: string, slideId: string): Promise<Slide> {
  const presentation = await this.getPresentation(presentationId);
  const slide = presentation.slides?.find(s => s.objectId === slideId);
  if (!slide) {
    throw new SlidesAPIError(
      `Slide ${slideId} not found in presentation ${presentationId}`,
      404
    );
  }
  return slide;
}

async getElement(presentationId: string, elementId: string): Promise<slides_v1.Schema$PageElement> {
  const presentation = await this.getPresentation(presentationId);
  for (const slide of presentation.slides ?? []) {
    const element = slide.pageElements?.find(e => e.objectId === elementId);
    if (element) return element;
  }
  throw new SlidesAPIError(
    `Element ${elementId} not found in presentation ${presentationId}`,
    404
  );
}
```

### Step 4: Run tests to verify they pass

```bash
npm test -- --testPathPattern=client
```

Expected: PASS — all client tests green

### Step 5: Commit

```bash
git add src/google/client.ts tests/unit/google/client.test.ts
git commit -m "feat: add getSlide and getElement helpers to SlidesClient"
```

---

## Task 2: Implement `slide_get` tool

**Files:**
- Create: `src/tools/slide/get.ts`
- Modify: `src/tools/slide/index.ts`
- Modify: `tests/unit/tools/slide.test.ts`

### Step 1: Write failing tests for `slideGetTool`

Add to `tests/unit/tools/slide.test.ts` (add `getSlide` to the `mockClient` in `beforeEach`, then add new describe block):

Update the `beforeEach` mock to include `getSlide`:

```typescript
beforeEach(() => {
  mockClient = {
    batchUpdate: jest.fn(),
    getPresentation: jest.fn(),
    getSlide: jest.fn(),
  } as any;
});
```

Then add the import at the top and the describe block at the bottom of the file:

```typescript
import { slideGetTool, SlideGetParams } from '../../../src/tools/slide/index.js';
```

```typescript
describe('slideGetTool', () => {
  const mockSlide = {
    objectId: 'slide-abc',
    pageElements: [
      {
        objectId: 'elem-1',
        size: {
          width: { magnitude: 3000000, unit: 'EMU' },
          height: { magnitude: 1500000, unit: 'EMU' },
        },
        transform: { translateX: 1270000, translateY: 2540000 },
        shape: {
          text: {
            textElements: [
              { textRun: { content: 'Hello World' } },
            ],
          },
        },
      },
      {
        objectId: 'elem-2',
        size: {
          width: { magnitude: 2000000, unit: 'EMU' },
          height: { magnitude: 1000000, unit: 'EMU' },
        },
        transform: { translateX: 0, translateY: 0 },
        image: { contentUrl: 'https://example.com/image.png' },
      },
    ],
  };

  it('should return summary of elements by default', async () => {
    mockClient.getSlide.mockResolvedValue(mockSlide);

    const result = await slideGetTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-abc',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toContain('slide-abc');
      expect(result.message).toContain('elem-1');
      expect(result.message).toContain('SHAPE');
      expect(result.message).toContain('Hello World');
      expect(result.message).toContain('elem-2');
      expect(result.message).toContain('IMAGE');
      expect(result.data?.elements).toHaveLength(2);
    }
  });

  it('should include raw JSON when detailed is true', async () => {
    mockClient.getSlide.mockResolvedValue(mockSlide);

    const result = await slideGetTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-abc',
      detailed: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toContain('elem-1');
      expect(result.message).toContain('"objectId"');
    }
  });

  it('should handle empty slides', async () => {
    mockClient.getSlide.mockResolvedValue({ objectId: 'slide-empty', pageElements: [] });

    const result = await slideGetTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-empty',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toContain('0 elements');
    }
  });

  it('should handle API errors (slide not found)', async () => {
    mockClient.getSlide.mockRejectedValue(new SlidesAPIError('Slide not found', 404));

    const result = await slideGetTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'nonexistent',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npm test -- --testPathPattern=slide
```

Expected: FAIL — `slideGetTool is not a function` / import error

### Step 3: Create `src/tools/slide/get.ts`

```typescript
import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import { slides_v1 } from '@googleapis/slides';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';

export interface SlideGetParams {
  presentationId: string;
  slideId: string;
  detailed?: boolean;
}

function emuToPoints(emu: number | null | undefined): number {
  return Math.round((emu ?? 0) / 12700);
}

function formatElementSummary(el: slides_v1.Schema$PageElement, index: number): string {
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

  return `${index}. ${type} [${id}]\n   ${position}${extra}`;
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

    if (params.detailed && count > 0) {
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

### Step 4: Export from `src/tools/slide/index.ts`

Add at the end of the file:

```typescript
export { slideGetTool, SlideGetParams } from './get.js';
```

### Step 5: Run tests to verify they pass

```bash
npm test -- --testPathPattern=slide
```

Expected: PASS — all slide tests green (existing + new)

### Step 6: Commit

```bash
git add src/tools/slide/get.ts src/tools/slide/index.ts tests/unit/tools/slide.test.ts
git commit -m "feat: implement slide_get tool with adaptive verbosity"
```

---

## Task 3: Implement `element_get` tool

**Files:**
- Create: `src/tools/element/get.ts`
- Modify: `src/tools/element/index.ts`
- Create: `tests/unit/tools/element.test.ts`

### Step 1: Write failing tests

Create `tests/unit/tools/element.test.ts`:

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementGetTool, ElementGetParams } from '../../../src/tools/element/index.js';
import { deleteElementTool } from '../../../src/tools/element/index.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('Element Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      batchUpdate: jest.fn(),
      getElement: jest.fn(),
    } as any;
  });

  describe('deleteElementTool', () => {
    it('should delete an element by ID', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await deleteElementTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        { deleteObject: { objectId: 'elem-abc' } },
      ]);
      expect(result.success).toBe(true);
    });

    it('should handle API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await deleteElementTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-missing',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('elementGetTool', () => {
    const mockElement = {
      objectId: 'elem-xyz',
      size: {
        width: { magnitude: 3810000, unit: 'EMU' },
        height: { magnitude: 1905000, unit: 'EMU' },
      },
      transform: { translateX: 1270000, translateY: 2540000 },
      shape: {
        text: {
          textElements: [
            { textRun: { content: 'Hello World' } },
          ],
        },
      },
    };

    it('should return summary of element by default', async () => {
      mockClient.getElement.mockResolvedValue(mockElement as any);

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-xyz',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('elem-xyz');
        expect(result.message).toContain('SHAPE');
        expect(result.message).toContain('Hello World');
        expect(result.data?.element).toEqual(mockElement);
      }
    });

    it('should include raw JSON when detailed is true', async () => {
      mockClient.getElement.mockResolvedValue(mockElement as any);

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-xyz',
        detailed: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('"objectId"');
      }
    });

    it('should handle API errors (element not found)', async () => {
      mockClient.getElement.mockRejectedValue(new SlidesAPIError('Element not found', 404));

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-missing',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npm test -- --testPathPattern=element
```

Expected: FAIL — `elementGetTool is not a function` / import error

### Step 3: Create `src/tools/element/get.ts`

```typescript
import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import { slides_v1 } from '@googleapis/slides';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';

export interface ElementGetParams {
  presentationId: string;
  elementId: string;
  detailed?: boolean;
}

function emuToPoints(emu: number | null | undefined): number {
  return Math.round((emu ?? 0) / 12700);
}

function formatElementSummary(el: slides_v1.Schema$PageElement): string {
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

  return `${type} [${id}]\n   ${position}${extra}`;
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

### Step 4: Export from `src/tools/element/index.ts`

Add at the end of the file:

```typescript
export { elementGetTool, ElementGetParams } from './get.js';
```

### Step 5: Run tests to verify they pass

```bash
npm test -- --testPathPattern=element
```

Expected: PASS — all element tests green

### Step 6: Commit

```bash
git add src/tools/element/get.ts src/tools/element/index.ts tests/unit/tools/element.test.ts
git commit -m "feat: implement element_get tool with adaptive verbosity"
```

---

## Task 4: Wire up both tools in `src/index.ts`

**Files:**
- Modify: `src/index.ts`

### Step 1: Add imports at the top of `src/index.ts`

Find the existing element import block:
```typescript
import {
  deleteElementTool,
  DeleteElementParams,
} from './tools/element/index.js';
```

Replace with:
```typescript
import {
  deleteElementTool,
  DeleteElementParams,
  elementGetTool,
  ElementGetParams,
} from './tools/element/index.js';
```

Find the existing slide import block:
```typescript
import {
  createSlideTool,
  CreateSlideParams,
  deleteSlideTool,
  DeleteSlideParams,
  duplicateSlideTool,
  DuplicateSlideParams,
} from './tools/slide/index.js';
```

Replace with:
```typescript
import {
  createSlideTool,
  CreateSlideParams,
  deleteSlideTool,
  DeleteSlideParams,
  duplicateSlideTool,
  DuplicateSlideParams,
  slideGetTool,
  SlideGetParams,
} from './tools/slide/index.js';
```

### Step 2: Register `slide_get` in the tool list

In the `ListToolsRequestSchema` handler, add after the `duplicate_slide` entry:

```typescript
{
  name: 'slide_get',
  description: 'Get all elements on a slide with their IDs, types, positions, and text content',
  inputSchema: {
    type: 'object',
    properties: {
      presentationId: {
        type: 'string',
        description: 'The ID of the presentation',
      },
      slideId: {
        type: 'string',
        description: 'The ID of the slide',
      },
      detailed: {
        type: 'boolean',
        description: 'When true, includes full raw API properties for each element (default: false)',
      },
    },
    required: ['presentationId', 'slideId'],
  },
},
```

### Step 3: Register `element_get` in the tool list

In the same `ListToolsRequestSchema` handler, add after the `element_delete` entry:

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
      detailed: {
        type: 'boolean',
        description: 'When true, includes full raw API properties (default: false)',
      },
    },
    required: ['presentationId', 'elementId'],
  },
},
```

### Step 4: Add `slide_get` to the call handler

In the `CallToolRequestSchema` switch statement, add after the `duplicate_slide` case:

```typescript
case 'slide_get': {
  const params = args as unknown as SlideGetParams;
  const result = await slideGetTool(client, params);

  if (result.success) {
    return { content: [{ type: 'text', text: result.message }] };
  } else {
    return {
      content: [{ type: 'text', text: `Error: ${result.error.message}` }],
      isError: true,
    };
  }
}
```

### Step 5: Add `element_get` to the call handler

Add after the `element_delete` case:

```typescript
case 'element_get': {
  const params = args as unknown as ElementGetParams;
  const result = await elementGetTool(client, params);

  if (result.success) {
    return { content: [{ type: 'text', text: result.message }] };
  } else {
    return {
      content: [{ type: 'text', text: `Error: ${result.error.message}` }],
      isError: true,
    };
  }
}
```

### Step 6: Run all tests

```bash
npm test
```

Expected: PASS — all 6+ test suites, 40+ tests green

### Step 7: Build to verify TypeScript compiles

```bash
npm run build
```

Expected: no errors, `dist/` updated

### Step 8: Commit

```bash
git add src/index.ts
git commit -m "feat: register slide_get and element_get in MCP server"
```
