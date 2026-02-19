import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementSetLinkTool } from '../../../src/tools/element/set-link.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('elementSetLinkTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });
  });

  it('sets a URL link on all text (no range)', async () => {
    const result = await elementSetLinkTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      url: 'https://example.com',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].updateTextStyle.objectId).toBe('elem-abc');
    expect(requests[0].updateTextStyle.textRange).toEqual({ type: 'ALL' });
    expect(requests[0].updateTextStyle.style.link.url).toBe('https://example.com');
    expect(requests[0].updateTextStyle.fields).toBe('link');
    expect(result.success).toBe(true);
  });

  it('sets a URL link on a specific text range', async () => {
    await elementSetLinkTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      url: 'https://example.com',
      startIndex: 2,
      endIndex: 7,
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].updateTextStyle.textRange).toEqual({
      type: 'FIXED_RANGE',
      startIndex: 2,
      endIndex: 7,
    });
  });

  it('removes a link when url is empty string', async () => {
    await elementSetLinkTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      url: '',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].updateTextStyle.style).toEqual({});
    expect(requests[0].updateTextStyle.fields).toBe('link');
  });

  it('url must use https — returns validation error for http', async () => {
    const result = await elementSetLinkTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      url: 'http://example.com',
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('returns elementId and url in data', async () => {
    const result = await elementSetLinkTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
      url: 'https://example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.elementId).toBe('elem-abc');
      expect(result.data?.url).toBe('https://example.com');
    }
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

    const result = await elementSetLinkTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-missing',
      url: 'https://example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});
