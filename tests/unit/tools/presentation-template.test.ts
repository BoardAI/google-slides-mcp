import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createFromTemplateTool } from '../../../src/tools/presentation/create-from-template.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('createFromTemplateTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      copyPresentation: jest.fn(),
      batchUpdate: jest.fn(),
    } as any;

    mockClient.copyPresentation.mockResolvedValue('new-pres-456');
    mockClient.batchUpdate.mockResolvedValue({ replies: [] });
  });

  it('copies template and returns new presentationId, title, and url', async () => {
    const result = await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: 'My New Deck',
    });

    expect(mockClient.copyPresentation).toHaveBeenCalledWith('template-123', 'My New Deck');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.presentationId).toBe('new-pres-456');
      expect(result.data?.title).toBe('My New Deck');
      expect(result.data?.url).toContain('new-pres-456');
    }
  });

  it('no replacements — does not call batchUpdate', async () => {
    await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: 'Clean Copy',
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
  });

  it('replacements — sends one replaceAllText request per token', async () => {
    await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: 'Filled Deck',
      replacements: {
        '{{name}}': 'Alice',
        '{{date}}': 'Feb 2026',
      },
    });

    expect(mockClient.batchUpdate).toHaveBeenCalledTimes(1);
    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(2);

    const texts = requests.map((r: any) => r.replaceAllText.containsText.text);
    expect(texts).toContain('{{name}}');
    expect(texts).toContain('{{date}}');

    const values = requests.map((r: any) => r.replaceAllText.replaceText);
    expect(values).toContain('Alice');
    expect(values).toContain('Feb 2026');
  });

  it('replaceAllText uses matchCase: true', async () => {
    await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: 'Deck',
      replacements: { '{{token}}': 'value' },
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests[0].replaceAllText.containsText.matchCase).toBe(true);
  });

  it('batchUpdate called with the new presentationId (not the template)', async () => {
    await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: 'Deck',
      replacements: { '{{x}}': 'y' },
    });

    expect(mockClient.batchUpdate.mock.calls[0][0]).toBe('new-pres-456');
  });

  it('replacements count returned in data', async () => {
    const result = await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: 'Deck',
      replacements: { '{{a}}': '1', '{{b}}': '2', '{{c}}': '3' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.replacementCount).toBe(3);
    }
  });

  it('empty title — returns validation error without calling API', async () => {
    const result = await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: '',
    });

    expect(mockClient.copyPresentation).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
      expect(result.error.message).toContain('title');
    }
  });

  it('handles copy API errors', async () => {
    mockClient.copyPresentation.mockRejectedValue(
      new SlidesAPIError('Presentation not found', 404)
    );

    const result = await createFromTemplateTool(mockClient, {
      templateId: 'template-missing',
      title: 'My Deck',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });

  it('handles replace batchUpdate errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(
      new SlidesAPIError('Invalid request', 400)
    );

    const result = await createFromTemplateTool(mockClient, {
      templateId: 'template-123',
      title: 'My Deck',
      replacements: { '{{x}}': 'y' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
