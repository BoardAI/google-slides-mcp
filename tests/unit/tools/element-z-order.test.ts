import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementZOrderTool } from '../../../src/tools/element/z-order.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('elementZOrderTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });
  });

  it('sends updatePageElementsZOrder with BRING_TO_FRONT', async () => {
    const result = await elementZOrderTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-abc'],
      operation: 'BRING_TO_FRONT',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].updatePageElementsZOrder.pageElementObjectIds).toEqual(['elem-abc']);
    expect(requests[0].updatePageElementsZOrder.operation).toBe('BRING_TO_FRONT');
    expect(result.success).toBe(true);
  });

  it('sends SEND_TO_BACK', async () => {
    await elementZOrderTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-abc'],
      operation: 'SEND_TO_BACK',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].updatePageElementsZOrder.operation).toBe('SEND_TO_BACK');
  });

  it('sends BRING_FORWARD', async () => {
    await elementZOrderTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-abc'],
      operation: 'BRING_FORWARD',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].updatePageElementsZOrder.operation).toBe('BRING_FORWARD');
  });

  it('sends SEND_BACKWARD', async () => {
    await elementZOrderTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-abc'],
      operation: 'SEND_BACKWARD',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].updatePageElementsZOrder.operation).toBe('SEND_BACKWARD');
  });

  it('supports multiple element IDs in one request', async () => {
    await elementZOrderTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-1', 'elem-2', 'elem-3'],
      operation: 'BRING_TO_FRONT',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].updatePageElementsZOrder.pageElementObjectIds).toEqual([
      'elem-1',
      'elem-2',
      'elem-3',
    ]);
  });

  it('empty elementIds — returns validation error', async () => {
    const result = await elementZOrderTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: [],
      operation: 'BRING_TO_FRONT',
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

    const result = await elementZOrderTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-missing'],
      operation: 'BRING_TO_FRONT',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});
