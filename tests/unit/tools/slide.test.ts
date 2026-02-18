import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createSlideTool,
  deleteSlideTool,
  duplicateSlideTool,
} from '../../../src/tools/slide/index.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';
import { slideGetTool } from '../../../src/tools/slide/index.js';

describe('Slide Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      batchUpdate: jest.fn(),
      getPresentation: jest.fn(),
      getSlide: jest.fn(),
    } as any;
  });

  describe('createSlideTool', () => {
    it('should create a slide with default options', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [
          {
            createSlide: {
              objectId: 'new-slide-123',
            },
          },
        ],
      });

      const result = await createSlideTool(mockClient, {
        presentationId: 'pres-123',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          createSlide: {},
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('Created slide');
        expect(result.data?.slideId).toBe('new-slide-123');
      }
    });

    it('should create a slide at a specific index', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [
          {
            createSlide: {
              objectId: 'new-slide-456',
            },
          },
        ],
      });

      const result = await createSlideTool(mockClient, {
        presentationId: 'pres-123',
        insertionIndex: 2,
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          createSlide: {
            insertionIndex: 2,
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.slideId).toBe('new-slide-456');
      }
    });

    it('should handle API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(
        new SlidesAPIError('API Error', 400)
      );

      const result = await createSlideTool(mockClient, {
        presentationId: 'pres-123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });

    it('should handle missing slide ID in response', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{}],
      });

      const result = await createSlideTool(mockClient, {
        presentationId: 'pres-123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('No slide ID');
      }
    });
  });

  describe('deleteSlideTool', () => {
    it('should delete a slide by ID', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{}],
      });

      const result = await deleteSlideTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-to-delete',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          deleteObject: {
            objectId: 'slide-to-delete',
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('Deleted slide');
      }
    });

    it('should handle API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(
        new SlidesAPIError('Slide not found', 404)
      );

      const result = await deleteSlideTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'nonexistent-slide',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });

  describe('duplicateSlideTool', () => {
    it('should duplicate a slide', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [
          {
            duplicateObject: {
              objectId: 'duplicated-slide-789',
            },
          },
        ],
      });

      const result = await duplicateSlideTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-to-duplicate',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          duplicateObject: {
            objectId: 'slide-to-duplicate',
            objectIds: {},
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('Duplicated slide');
        expect(result.data?.newSlideId).toBe('duplicated-slide-789');
      }
    });

    it('should duplicate a slide at a specific index', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [
          {
            duplicateObject: {
              objectId: 'duplicated-slide-999',
            },
          },
        ],
      });

      const result = await duplicateSlideTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-to-duplicate',
        insertionIndex: 3,
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          duplicateObject: {
            objectId: 'slide-to-duplicate',
            objectIds: {},
            insertionIndex: 3,
          } as any,
        },
      ]);
      expect(result.success).toBe(true);
    });

    it('should handle API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(
        new SlidesAPIError('API Error', 400)
      );

      const result = await duplicateSlideTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-to-duplicate',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });

    it('should handle missing duplicated slide ID in response', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{}],
      });

      const result = await duplicateSlideTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-to-duplicate',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('No duplicated slide ID');
      }
    });
  });

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

    it('should format TABLE, VIDEO, LINE, WORD ART, and SHEETS CHART elements', async () => {
      mockClient.getSlide.mockResolvedValue({
        objectId: 'slide-x',
        pageElements: [
          {
            objectId: 'tbl-1',
            size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } },
            transform: { translateX: 0, translateY: 0 },
            table: { rows: 3, columns: 4 },
          },
          {
            objectId: 'vid-1',
            size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } },
            transform: { translateX: 0, translateY: 0 },
            video: { id: 'yt-abc123' },
          },
          {
            objectId: 'line-1',
            size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } },
            transform: { translateX: 0, translateY: 0 },
            line: {},
          },
          {
            objectId: 'art-1',
            size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } },
            transform: { translateX: 0, translateY: 0 },
            wordArt: { renderedText: 'Fancy' },
          },
          {
            objectId: 'chart-1',
            size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } },
            transform: { translateX: 0, translateY: 0 },
            sheetsChart: { spreadsheetId: 'sheet-xyz' },
          },
        ],
      });

      const result = await slideGetTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-x',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('TABLE');
        expect(result.message).toContain('3 rows × 4 columns');
        expect(result.message).toContain('VIDEO');
        expect(result.message).toContain('yt-abc123');
        expect(result.message).toContain('LINE');
        expect(result.message).toContain('WORD ART');
        expect(result.message).toContain('Fancy');
        expect(result.message).toContain('SHEETS CHART');
        expect(result.message).toContain('sheet-xyz');
        expect(result.data?.elements).toHaveLength(5);
      }
    });
  });
});
