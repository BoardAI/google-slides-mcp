import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementReplaceImageTool } from '../../../src/tools/element/replace-image.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('elementReplaceImageTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });
  });

  it('sends replaceImage with imageObjectId and url', async () => {
    const result = await elementReplaceImageTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'img-abc',
      url: 'https://example.com/new-photo.png',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].replaceImage.imageObjectId).toBe('img-abc');
    expect(requests[0].replaceImage.url).toBe('https://example.com/new-photo.png');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.elementId).toBe('img-abc');
      expect(result.data?.url).toBe('https://example.com/new-photo.png');
    }
  });

  it('no imageReplaceMethod — omits the field from the request', async () => {
    await elementReplaceImageTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'img-abc',
      url: 'https://example.com/photo.png',
    });

    const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
    expect(request.replaceImage.imageReplaceMethod).toBeUndefined();
  });

  it('imageReplaceMethod CENTER_CROP — passes it in the request', async () => {
    await elementReplaceImageTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'img-abc',
      url: 'https://example.com/photo.png',
      imageReplaceMethod: 'CENTER_CROP',
    });

    const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
    expect(request.replaceImage.imageReplaceMethod).toBe('CENTER_CROP');
  });

  it('non-HTTPS URL — returns validation error without calling API', async () => {
    const result = await elementReplaceImageTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'img-abc',
      url: 'http://example.com/photo.png',
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
      expect(result.error.message).toContain('https');
    }
  });

  it('empty URL — returns validation error without calling API', async () => {
    const result = await elementReplaceImageTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'img-abc',
      url: '',
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(
      new SlidesAPIError('Image could not be fetched', 400)
    );

    const result = await elementReplaceImageTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'img-abc',
      url: 'https://example.com/photo.png',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
