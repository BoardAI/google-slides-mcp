import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createSlideTool,
  deleteSlideTool,
  duplicateSlideTool,
  slideReorderTool,
  slideSetBackgroundTool,
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

    it('should look up slideId from slideIndex 0 via getPresentation, then call getSlide', async () => {
      mockClient.getPresentation.mockResolvedValue({
        slides: [
          { objectId: 'slide-first' },
          { objectId: 'slide-second' },
          { objectId: 'slide-third' },
        ],
      });
      mockClient.getSlide.mockResolvedValue({ objectId: 'slide-first', pageElements: [] });

      const result = await slideGetTool(mockClient, {
        presentationId: 'pres-123',
        slideIndex: 0,
      });

      expect(mockClient.getPresentation).toHaveBeenCalledWith('pres-123');
      expect(mockClient.getSlide).toHaveBeenCalledWith('pres-123', 'slide-first');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.slideId).toBe('slide-first');
      }
    });

    it('should look up slideId from slideIndex 2 via getPresentation', async () => {
      mockClient.getPresentation.mockResolvedValue({
        slides: [
          { objectId: 'slide-first' },
          { objectId: 'slide-second' },
          { objectId: 'slide-third' },
        ],
      });
      mockClient.getSlide.mockResolvedValue({ objectId: 'slide-third', pageElements: [] });

      const result = await slideGetTool(mockClient, {
        presentationId: 'pres-123',
        slideIndex: 2,
      });

      expect(mockClient.getSlide).toHaveBeenCalledWith('pres-123', 'slide-third');
      expect(result.success).toBe(true);
    });

    it('should return validation error when slideIndex is out of bounds', async () => {
      mockClient.getPresentation.mockResolvedValue({
        slides: [{ objectId: 'slide-only' }],
      });

      const result = await slideGetTool(mockClient, {
        presentationId: 'pres-123',
        slideIndex: 5,
      });

      expect(mockClient.getSlide).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('5');
      }
    });

    it('should return validation error when slideIndex is negative', async () => {
      const result = await slideGetTool(mockClient, {
        presentationId: 'pres-123',
        slideIndex: -1,
      });

      expect(mockClient.getPresentation).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('-1');
      }
    });

    it('should return validation error when neither slideId nor slideIndex is provided', async () => {
      const result = await slideGetTool(mockClient, {
        presentationId: 'pres-123',
      } as any);

      expect(mockClient.getPresentation).not.toHaveBeenCalled();
      expect(mockClient.getSlide).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
      }
    });

    it('should propagate API error from getPresentation when using slideIndex', async () => {
      mockClient.getPresentation.mockRejectedValue(
        new SlidesAPIError('Presentation not found', 404)
      );

      const result = await slideGetTool(mockClient, {
        presentationId: 'pres-missing',
        slideIndex: 0,
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

  describe('slideReorderTool', () => {
    it('moves slide to position 0 — sends updateSlidesPosition with correct slideObjectIds and insertionIndex', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await slideReorderTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        insertionIndex: 0,
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          updateSlidesPosition: {
            slideObjectIds: ['slide-abc'],
            insertionIndex: 0,
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.slideId).toBe('slide-abc');
        expect(result.data?.insertionIndex).toBe(0);
      }
    });

    it('moves slide to position 3', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await slideReorderTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-xyz',
        insertionIndex: 3,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateSlidesPosition.slideObjectIds).toEqual(['slide-xyz']);
      expect(request.updateSlidesPosition.insertionIndex).toBe(3);
    });

    it('rejects negative insertionIndex without calling the API', async () => {
      const result = await slideReorderTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        insertionIndex: -1,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('-1');
      }
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(
        new SlidesAPIError('Slide not found', 404)
      );

      const result = await slideReorderTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-missing',
        insertionIndex: 1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });

  describe('slideSetBackgroundTool', () => {
    it('sets solid color background — sends updatePageProperties with rgbColor and correct fields mask', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await slideSetBackgroundTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        color: '#0000FF',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          updatePageProperties: {
            objectId: 'slide-abc',
            pageProperties: {
              pageBackgroundFill: {
                solidFill: {
                  color: {
                    rgbColor: { red: 0, green: 0, blue: 1 },
                  },
                },
              },
            },
            fields: 'pageBackgroundFill.solidFill',
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.slideId).toBe('slide-abc');
      }
    });

    it('sets image background — sends updatePageProperties with stretchedPictureFill and correct fields mask', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await slideSetBackgroundTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        imageUrl: 'https://example.com/bg.jpg',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          updatePageProperties: {
            objectId: 'slide-abc',
            pageProperties: {
              pageBackgroundFill: {
                stretchedPictureFill: {
                  contentUrl: 'https://example.com/bg.jpg',
                },
              },
            },
            fields: 'pageBackgroundFill.stretchedPictureFill',
          },
        },
      ]);
      expect(result.success).toBe(true);
    });

    it('rejects invalid hex color without calling API', async () => {
      const result = await slideSetBackgroundTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        color: 'blue',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('blue');
      }
    });

    it('rejects non-HTTPS image URL without calling API', async () => {
      const result = await slideSetBackgroundTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        imageUrl: 'http://example.com/bg.jpg',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('https');
      }
    });

    it('rejects when neither color nor imageUrl is provided', async () => {
      const result = await slideSetBackgroundTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
      }
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(
        new SlidesAPIError('Slide not found', 404)
      );

      const result = await slideSetBackgroundTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-missing',
        color: '#FF0000',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });
});
