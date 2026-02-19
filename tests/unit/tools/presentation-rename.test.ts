import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { presentationRenameTool } from '../../../src/tools/presentation/rename.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('presentationRenameTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      renamePresentation: jest.fn(),
    } as any;

    mockClient.renamePresentation.mockResolvedValue(undefined);
  });

  it('calls renamePresentation with presentationId and new title', async () => {
    const result = await presentationRenameTool(mockClient, {
      presentationId: 'pres-123',
      title: 'My New Title',
    });

    expect(mockClient.renamePresentation).toHaveBeenCalledWith('pres-123', 'My New Title');
    expect(result.success).toBe(true);
  });

  it('returns presentationId and title in data', async () => {
    const result = await presentationRenameTool(mockClient, {
      presentationId: 'pres-123',
      title: 'Renamed Deck',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.presentationId).toBe('pres-123');
      expect(result.data?.title).toBe('Renamed Deck');
    }
  });

  it('empty title — returns validation error', async () => {
    const result = await presentationRenameTool(mockClient, {
      presentationId: 'pres-123',
      title: '',
    });

    expect(mockClient.renamePresentation).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('whitespace-only title — returns validation error', async () => {
    const result = await presentationRenameTool(mockClient, {
      presentationId: 'pres-123',
      title: '   ',
    });

    expect(mockClient.renamePresentation).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('handles API errors', async () => {
    mockClient.renamePresentation.mockRejectedValue(
      new SlidesAPIError('File not found', 404)
    );

    const result = await presentationRenameTool(mockClient, {
      presentationId: 'pres-missing',
      title: 'New Title',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});
