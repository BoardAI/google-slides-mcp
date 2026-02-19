import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementGetTool } from '../../../src/tools/element/index.js';
import { deleteElementTool } from '../../../src/tools/element/index.js';
import { elementUpdateTextTool } from '../../../src/tools/element/index.js';
import { elementMoveResizeTool } from '../../../src/tools/element/index.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('Element Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      batchUpdate: jest.fn(),
      getElement: jest.fn(),
      getSlide: jest.fn(),
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

    it('should handle element not found in presentation', async () => {
      mockClient.getElement.mockRejectedValue(
        new SlidesAPIError('Element stale-id not found in presentation pres-123', 404)
      );

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'stale-id',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toContain('not found');
      }
    });

    it('should format TABLE, VIDEO, LINE, WORD ART, and SHEETS CHART elements', async () => {
      const elements = [
        { objectId: 'tbl-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, table: { rows: 2, columns: 3 } },
        { objectId: 'vid-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, video: { id: 'yt-abc123' } },
        { objectId: 'line-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, line: {} },
        { objectId: 'art-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, wordArt: { renderedText: 'Fancy' } },
        { objectId: 'chart-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, sheetsChart: { spreadsheetId: 'sheet-xyz' } },
        { objectId: 'img-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, image: { contentUrl: 'https://example.com/img.png' } },
      ];

      for (const el of elements) {
        mockClient.getElement.mockResolvedValue(el as any);
        const result = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: el.objectId });
        expect(result.success).toBe(true);
      }

      // Verify table specifically
      mockClient.getElement.mockResolvedValue(elements[0] as any);
      const tableResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'tbl-1' });
      expect(tableResult.success).toBe(true);
      if (tableResult.success) {
        expect(tableResult.message).toContain('TABLE');
        expect(tableResult.message).toContain('2 rows × 3 columns');
      }

      // Verify image specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'img-1') as any);
      const imgResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'img-1' });
      expect(imgResult.success).toBe(true);
      if (imgResult.success) {
        expect(imgResult.message).toContain('IMAGE');
        expect(imgResult.message).toContain('https://example.com/img.png');
      }

      // Verify video specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'vid-1') as any);
      const vidResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'vid-1' });
      expect(vidResult.success).toBe(true);
      if (vidResult.success) {
        expect(vidResult.message).toContain('VIDEO');
        expect(vidResult.message).toContain('Video ID: yt-abc123');
      }

      // Verify word art specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'art-1') as any);
      const artResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'art-1' });
      expect(artResult.success).toBe(true);
      if (artResult.success) {
        expect(artResult.message).toContain('WORD ART');
        expect(artResult.message).toContain('Fancy');
      }

      // Verify sheets chart specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'chart-1') as any);
      const chartResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'chart-1' });
      expect(chartResult.success).toBe(true);
      if (chartResult.success) {
        expect(chartResult.message).toContain('SHEETS CHART');
        expect(chartResult.message).toContain('sheet-xyz');
      }
    });

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
  });

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
              scaleX: 1,
              scaleY: 1,
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
              scaleX: 2,
              scaleY: 2,
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

    it('move + resize — all four params computed correctly', async () => {
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
      if (result.success) {
        expect(result.data?.x).toBe(50);
        expect(result.data?.y).toBe(75);
        expect(result.data?.width).toBe(600);
        expect(result.data?.height).toBe(200);
      }
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

    it('resize requested on zero-intrinsic-width element — returns validation error', async () => {
      mockClient.getElement.mockResolvedValue({
        objectId: 'elem-abc',
        size: {
          width: { magnitude: 0, unit: 'EMU' },
          height: { magnitude: 0, unit: 'EMU' },
        },
        transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 0, translateY: 0 },
      } as any);

      const result = await elementMoveResizeTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        width: 300,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('zero intrinsic width');
      }
    });
  });
});
