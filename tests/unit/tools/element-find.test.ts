import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementFindTool } from '../../../src/tools/element/find.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

// ─── Mock presentation with elements across 2 slides ───────────────────────

const mockPresentation = {
  slides: [
    {
      objectId: 'slide-1',
      pageElements: [
        {
          objectId: 'img-1',
          image: { contentUrl: 'https://example.com/photo.png' },
          size: { width: { magnitude: 1270000 }, height: { magnitude: 953000 } },
          transform: { translateX: 0, translateY: 0 },
        },
        {
          objectId: 'shape-1',
          shape: {
            shapeType: 'TEXT_BOX',
            text: {
              textElements: [{ textRun: { content: 'Hello World\n' } }],
            },
          },
          size: { width: { magnitude: 3810000 }, height: { magnitude: 1270000 } },
          transform: { translateX: 914400, translateY: 914400 },
        },
        {
          objectId: 'shape-2',
          shape: {
            shapeType: 'RECTANGLE',
            text: {
              textElements: [{ textRun: { content: 'Goodbye\n' } }],
            },
          },
          size: { width: { magnitude: 2540000 }, height: { magnitude: 1270000 } },
          transform: { translateX: 0, translateY: 2540000 },
        },
      ],
    },
    {
      objectId: 'slide-2',
      pageElements: [
        {
          objectId: 'table-1',
          table: { rows: 3, columns: 4 },
          size: { width: { magnitude: 5080000 }, height: { magnitude: 2540000 } },
          transform: { translateX: 914400, translateY: 914400 },
        },
        {
          objectId: 'shape-3',
          shape: {
            shapeType: 'TEXT_BOX',
            text: {
              textElements: [{ textRun: { content: 'hello again\n' } }],
            },
          },
          size: { width: { magnitude: 3810000 }, height: { magnitude: 1270000 } },
          transform: { translateX: 0, translateY: 3810000 },
        },
      ],
    },
  ],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('elementFindTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      getPresentation: jest.fn(),
    } as any;

    mockClient.getPresentation.mockResolvedValue(mockPresentation as any);
  });

  it('no filters — returns all elements across all slides', async () => {
    const result = await elementFindTool(mockClient, { presentationId: 'pres-123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(5);
      expect(result.data?.matches).toHaveLength(5);
    }
  });

  it('type IMAGE — returns only image elements', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      type: 'IMAGE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(1);
      expect(result.data?.matches[0].element.objectId).toBe('img-1');
      expect(result.data?.matches[0].slideId).toBe('slide-1');
    }
  });

  it('type TABLE — returns only table elements', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      type: 'TABLE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(1);
      expect(result.data?.matches[0].element.objectId).toBe('table-1');
      expect(result.data?.matches[0].slideId).toBe('slide-2');
      expect(result.data?.matches[0].slideIndex).toBe(1);
    }
  });

  it('type SHAPE — returns all shape elements (3 total)', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      type: 'SHAPE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(3);
      const ids = result.data?.matches.map((m: any) => m.element.objectId);
      expect(ids).toContain('shape-1');
      expect(ids).toContain('shape-2');
      expect(ids).toContain('shape-3');
    }
  });

  it('text filter — case-insensitive substring match across slides', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      text: 'hello',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(2);
      const ids = result.data?.matches.map((m: any) => m.element.objectId);
      expect(ids).toContain('shape-1'); // 'Hello World'
      expect(ids).toContain('shape-3'); // 'hello again'
    }
  });

  it('text filter — matches exact substring case-insensitively', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      text: 'Goodbye',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(1);
      expect(result.data?.matches[0].element.objectId).toBe('shape-2');
    }
  });

  it('shapeType TEXT_BOX — returns only TEXT_BOX shapes', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      shapeType: 'TEXT_BOX',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(2);
      const ids = result.data?.matches.map((m: any) => m.element.objectId);
      expect(ids).toContain('shape-1');
      expect(ids).toContain('shape-3');
    }
  });

  it('shapeType RECTANGLE — returns only RECTANGLE shapes', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      shapeType: 'RECTANGLE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(1);
      expect(result.data?.matches[0].element.objectId).toBe('shape-2');
    }
  });

  it('slideId — limits results to elements on that slide', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(3);
      result.data?.matches.forEach((m: any) => {
        expect(m.slideId).toBe('slide-1');
        expect(m.slideIndex).toBe(0);
      });
    }
  });

  it('slideIndex — limits results to elements on slide at that index', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: 1,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(2);
      result.data?.matches.forEach((m: any) => {
        expect(m.slideId).toBe('slide-2');
        expect(m.slideIndex).toBe(1);
      });
    }
  });

  it('combined: type SHAPE + text "hello" — intersects both filters', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      type: 'SHAPE',
      text: 'hello',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(2);
      const ids = result.data?.matches.map((m: any) => m.element.objectId);
      expect(ids).toContain('shape-1');
      expect(ids).toContain('shape-3');
      expect(ids).not.toContain('img-1');
    }
  });

  it('combined: slideId slide-2 + shapeType TEXT_BOX — 1 match', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-2',
      shapeType: 'TEXT_BOX',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(1);
      expect(result.data?.matches[0].element.objectId).toBe('shape-3');
    }
  });

  it('no matches — returns success with empty matches array', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      text: 'zzz-no-match-zzz',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.matchCount).toBe(0);
      expect(result.data?.matches).toHaveLength(0);
    }
  });

  it('each match includes slideId, slideIndex, and element', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      type: 'IMAGE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const match = result.data?.matches[0];
      expect(match.slideId).toBe('slide-1');
      expect(match.slideIndex).toBe(0);
      expect(match.element).toBeDefined();
      expect(match.element.objectId).toBe('img-1');
    }
  });

  it('slideIndex out of bounds — returns validation error', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: 99,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
      expect(result.error.message).toContain('99');
    }
  });

  it('slideIndex negative — returns validation error', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: -1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
  });

  it('unknown slideId — returns validation error', async () => {
    const result = await elementFindTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-missing',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
  });

  it('handles API errors from getPresentation', async () => {
    mockClient.getPresentation.mockRejectedValue(
      new SlidesAPIError('Presentation not found', 404)
    );

    const result = await elementFindTool(mockClient, { presentationId: 'pres-missing' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
