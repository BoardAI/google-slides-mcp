import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementGetTool } from '../../../src/tools/element/index.js';
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
    });
  });
});
