import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createPresentationTool, getPresentationTool } from '../../../src/tools/presentation/index.js';
import { SlidesClient } from '../../../src/google/client.js';

describe('Presentation Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      createPresentation: jest.fn(),
      getPresentation: jest.fn(),
    } as any;
  });

  describe('createPresentationTool', () => {
    it('should create presentation with title', async () => {
      mockClient.createPresentation.mockResolvedValue({
        presentationId: 'test-123',
        title: 'My Presentation',
        slides: [],
      });

      const result = await createPresentationTool(mockClient, {
        title: 'My Presentation',
      });

      expect(mockClient.createPresentation).toHaveBeenCalledWith('My Presentation');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('Created presentation');
        expect(result.data?.presentationId).toBe('test-123');
      }
    });

    it('should handle API errors', async () => {
      mockClient.createPresentation.mockRejectedValue(
        new Error('API Error')
      );

      const result = await createPresentationTool(mockClient, {
        title: 'My Presentation',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getPresentationTool', () => {
    it('should get presentation by ID', async () => {
      mockClient.getPresentation.mockResolvedValue({
        presentationId: 'test-123',
        title: 'My Presentation',
        slides: [{ objectId: 'slide1' }, { objectId: 'slide2' }],
      });

      const result = await getPresentationTool(mockClient, {
        presentationId: 'test-123',
      });

      expect(mockClient.getPresentation).toHaveBeenCalledWith('test-123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.slideCount).toBe(2);
      }
    });
  });
});
