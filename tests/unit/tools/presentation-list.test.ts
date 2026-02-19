import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { presentationListTool } from '../../../src/tools/presentation/list.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

const mockPresentations = [
  {
    id: 'pres-1',
    name: 'Q1 Budget',
    modifiedTime: '2026-01-15T10:00:00.000Z',
    webViewLink: 'https://docs.google.com/presentation/d/pres-1/edit',
  },
  {
    id: 'pres-2',
    name: 'Annual Report',
    modifiedTime: '2026-01-10T08:30:00.000Z',
    webViewLink: 'https://docs.google.com/presentation/d/pres-2/edit',
  },
  {
    id: 'pres-3',
    name: 'Q2 Budget Draft',
    modifiedTime: '2026-01-05T14:00:00.000Z',
    webViewLink: 'https://docs.google.com/presentation/d/pres-3/edit',
  },
];

describe('presentationListTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      listPresentations: jest.fn(),
    } as any;

    mockClient.listPresentations.mockResolvedValue(mockPresentations);
  });

  it('no filters — calls listPresentations with no args and returns results', async () => {
    const result = await presentationListTool(mockClient, {});

    expect(mockClient.listPresentations).toHaveBeenCalledWith(undefined, undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.count).toBe(3);
      expect(result.data?.presentations).toHaveLength(3);
    }
  });

  it('query — passes query string to listPresentations', async () => {
    mockClient.listPresentations.mockResolvedValue([mockPresentations[0], mockPresentations[2]]);

    const result = await presentationListTool(mockClient, { query: 'Budget' });

    expect(mockClient.listPresentations).toHaveBeenCalledWith('Budget', undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.count).toBe(2);
    }
  });

  it('limit — passes limit to listPresentations', async () => {
    mockClient.listPresentations.mockResolvedValue([mockPresentations[0]]);

    await presentationListTool(mockClient, { limit: 1 });

    expect(mockClient.listPresentations).toHaveBeenCalledWith(undefined, 1);
  });

  it('query + limit — passes both to listPresentations', async () => {
    mockClient.listPresentations.mockResolvedValue([mockPresentations[0]]);

    await presentationListTool(mockClient, { query: 'Budget', limit: 5 });

    expect(mockClient.listPresentations).toHaveBeenCalledWith('Budget', 5);
  });

  it('each result includes id, name, modifiedTime, webViewLink', async () => {
    const result = await presentationListTool(mockClient, {});

    expect(result.success).toBe(true);
    if (result.success) {
      const first = result.data?.presentations[0];
      expect(first.id).toBe('pres-1');
      expect(first.name).toBe('Q1 Budget');
      expect(first.modifiedTime).toBe('2026-01-15T10:00:00.000Z');
      expect(first.webViewLink).toBe('https://docs.google.com/presentation/d/pres-1/edit');
    }
  });

  it('empty results — returns success with count 0', async () => {
    mockClient.listPresentations.mockResolvedValue([]);

    const result = await presentationListTool(mockClient, { query: 'zzz-no-match' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.count).toBe(0);
      expect(result.data?.presentations).toHaveLength(0);
    }
  });

  it('limit < 1 — returns validation error without calling API', async () => {
    const result = await presentationListTool(mockClient, { limit: 0 });

    expect(mockClient.listPresentations).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
      expect(result.error.message).toContain('limit');
    }
  });

  it('limit > 100 — returns validation error without calling API', async () => {
    const result = await presentationListTool(mockClient, { limit: 101 });

    expect(mockClient.listPresentations).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
      expect(result.error.message).toContain('limit');
    }
  });

  it('handles API errors', async () => {
    mockClient.listPresentations.mockRejectedValue(
      new SlidesAPIError('Permission denied. Check presentation sharing settings.', 403)
    );

    const result = await presentationListTool(mockClient, {});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
