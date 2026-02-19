import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementDuplicateTool } from '../../../src/tools/element/duplicate.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('elementDuplicateTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
    mockClient.batchUpdate.mockResolvedValue({
      replies: [{ duplicateObject: { objectId: 'new-elem-789' } }],
    });
  });

  it('sends duplicateObject with the element objectId', async () => {
    const result = await elementDuplicateTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-abc',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].duplicateObject.objectId).toBe('elem-abc');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.originalElementId).toBe('elem-abc');
      expect(result.data?.newElementId).toBe('new-elem-789');
    }
  });

  it('returns the new element ID from the reply', async () => {
    const result = await elementDuplicateTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'shape-xyz',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.newElementId).toBe('new-elem-789');
    }
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(
      new SlidesAPIError('Element not found', 404)
    );

    const result = await elementDuplicateTool(mockClient, {
      presentationId: 'pres-123',
      elementId: 'elem-missing',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
