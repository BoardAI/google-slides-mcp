import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createSlideTool,
  deleteSlideTool,
  duplicateSlideTool,
} from '../../../src/tools/slide/index.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('Slide Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      batchUpdate: jest.fn(),
      getPresentation: jest.fn(),
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
});
