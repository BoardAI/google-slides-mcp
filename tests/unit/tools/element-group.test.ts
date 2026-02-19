import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementGroupTool, elementUngroupTool } from '../../../src/tools/element/group.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

// ─── elementGroupTool ────────────────────────────────────────────────────────

describe('elementGroupTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
    mockClient.batchUpdate.mockResolvedValue({
      replies: [{ groupObjects: { objectId: 'group-xyz' } }],
    });
  });

  it('sends groupObjects with childrenObjectIds', async () => {
    const result = await elementGroupTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-1', 'elem-2'],
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].groupObjects.childrenObjectIds).toEqual(['elem-1', 'elem-2']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.groupId).toBe('group-xyz');
    }
  });

  it('returns the new group ID from the reply', async () => {
    const result = await elementGroupTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['a', 'b', 'c'],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data?.groupId).toBe('group-xyz');
  });

  it('fewer than 2 elements — returns validation error', async () => {
    const result = await elementGroupTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['elem-1'],
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('empty elementIds — returns validation error', async () => {
    const result = await elementGroupTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Bad request', 400));

    const result = await elementGroupTool(mockClient, {
      presentationId: 'pres-123',
      elementIds: ['a', 'b'],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});

// ─── elementUngroupTool ──────────────────────────────────────────────────────

describe('elementUngroupTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });
  });

  it('sends ungroupObjects with the group objectIds', async () => {
    const result = await elementUngroupTool(mockClient, {
      presentationId: 'pres-123',
      groupIds: ['group-abc'],
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].ungroupObjects.objectIds).toEqual(['group-abc']);
    expect(result.success).toBe(true);
  });

  it('supports ungrouping multiple groups at once', async () => {
    await elementUngroupTool(mockClient, {
      presentationId: 'pres-123',
      groupIds: ['group-1', 'group-2'],
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].ungroupObjects.objectIds).toEqual(['group-1', 'group-2']);
  });

  it('empty groupIds — returns validation error', async () => {
    const result = await elementUngroupTool(mockClient, {
      presentationId: 'pres-123',
      groupIds: [],
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not a group', 400));

    const result = await elementUngroupTool(mockClient, {
      presentationId: 'pres-123',
      groupIds: ['not-a-group'],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});
