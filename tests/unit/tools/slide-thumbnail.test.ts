import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { slideThumbnailTool } from '../../../src/tools/slide/thumbnail.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('slideThumbnailTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      getThumbnail: jest.fn(),
      getPresentation: jest.fn(),
    } as any;

    mockClient.getThumbnail.mockResolvedValue({
      contentUrl: 'https://lh3.googleusercontent.com/thumb/abc123',
      width: 1600,
      height: 900,
    });
  });

  it('slideId — calls getThumbnail with LARGE size and returns url, dimensions', async () => {
    const result = await slideThumbnailTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-abc',
    });

    expect(mockClient.getThumbnail).toHaveBeenCalledWith('pres-123', 'slide-abc', undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.contentUrl).toBe('https://lh3.googleusercontent.com/thumb/abc123');
      expect(result.data?.width).toBe(1600);
      expect(result.data?.height).toBe(900);
      expect(result.data?.slideId).toBe('slide-abc');
    }
  });

  it('size SMALL — passes size to getThumbnail', async () => {
    await slideThumbnailTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-abc',
      size: 'SMALL',
    });

    expect(mockClient.getThumbnail).toHaveBeenCalledWith('pres-123', 'slide-abc', 'SMALL');
  });

  it('size MEDIUM — passes size to getThumbnail', async () => {
    await slideThumbnailTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-abc',
      size: 'MEDIUM',
    });

    expect(mockClient.getThumbnail).toHaveBeenCalledWith('pres-123', 'slide-abc', 'MEDIUM');
  });

  it('slideIndex — resolves to slideId then calls getThumbnail', async () => {
    mockClient.getPresentation.mockResolvedValue({
      slides: [
        { objectId: 'slide-0' },
        { objectId: 'slide-1' },
        { objectId: 'slide-2' },
      ],
    } as any);

    const result = await slideThumbnailTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: 2,
    });

    expect(mockClient.getThumbnail).toHaveBeenCalledWith('pres-123', 'slide-2', undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.slideId).toBe('slide-2');
    }
  });

  it('neither slideId nor slideIndex — returns validation error', async () => {
    const result = await slideThumbnailTool(mockClient, {
      presentationId: 'pres-123',
    });

    expect(mockClient.getThumbnail).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
  });

  it('slideIndex out of bounds — returns validation error', async () => {
    mockClient.getPresentation.mockResolvedValue({
      slides: [{ objectId: 'slide-0' }],
    } as any);

    const result = await slideThumbnailTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: 5,
    });

    expect(mockClient.getThumbnail).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
  });

  it('handles API errors', async () => {
    mockClient.getThumbnail.mockRejectedValue(
      new SlidesAPIError('Slide not found', 404)
    );

    const result = await slideThumbnailTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-missing',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
