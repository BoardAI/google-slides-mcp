import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { tableUnmergeCellsTool } from '../../../src/tools/table/unmerge.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('tableUnmergeCellsTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });
  });

  it('sends unmergeTableCells with objectId and tableRange', async () => {
    const result = await tableUnmergeCellsTool(mockClient, {
      presentationId: 'pres-123',
      tableId: 'table-abc',
      row: 0,
      column: 1,
      rowSpan: 2,
      columnSpan: 3,
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].unmergeTableCells.objectId).toBe('table-abc');
    expect(requests[0].unmergeTableCells.tableRange).toEqual({
      location: { rowIndex: 0, columnIndex: 1 },
      rowSpan: 2,
      columnSpan: 3,
    });
    expect(result.success).toBe(true);
  });

  it('passes rowIndex and columnIndex from row/column params', async () => {
    await tableUnmergeCellsTool(mockClient, {
      presentationId: 'pres-123',
      tableId: 'table-abc',
      row: 3,
      column: 2,
      rowSpan: 1,
      columnSpan: 2,
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].unmergeTableCells.tableRange.location).toEqual({
      rowIndex: 3,
      columnIndex: 2,
    });
  });

  it('rowSpan less than 1 — returns validation error', async () => {
    const result = await tableUnmergeCellsTool(mockClient, {
      presentationId: 'pres-123',
      tableId: 'table-abc',
      row: 0,
      column: 0,
      rowSpan: 0,
      columnSpan: 2,
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('columnSpan less than 1 — returns validation error', async () => {
    const result = await tableUnmergeCellsTool(mockClient, {
      presentationId: 'pres-123',
      tableId: 'table-abc',
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Invalid range', 400));

    const result = await tableUnmergeCellsTool(mockClient, {
      presentationId: 'pres-123',
      tableId: 'table-abc',
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 2,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});
