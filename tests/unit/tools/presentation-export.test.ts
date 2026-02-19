import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { presentationExportTool } from '../../../src/tools/presentation/export.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('presentationExportTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      exportPresentation: jest.fn(),
    } as any;

    mockClient.exportPresentation.mockResolvedValue({ sizeBytes: 204800 });
  });

  it('default format pdf — calls exportPresentation with pdf and outputPath', async () => {
    const result = await presentationExportTool(mockClient, {
      presentationId: 'pres-123',
      outputPath: '/tmp/slides.pdf',
    });

    expect(mockClient.exportPresentation).toHaveBeenCalledWith('pres-123', 'pdf', '/tmp/slides.pdf');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.format).toBe('pdf');
      expect(result.data?.outputPath).toBe('/tmp/slides.pdf');
      expect(result.data?.sizeBytes).toBe(204800);
    }
  });

  it('format pptx — calls exportPresentation with pptx', async () => {
    const result = await presentationExportTool(mockClient, {
      presentationId: 'pres-123',
      outputPath: '/tmp/slides.pptx',
      format: 'pptx',
    });

    expect(mockClient.exportPresentation).toHaveBeenCalledWith('pres-123', 'pptx', '/tmp/slides.pptx');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.format).toBe('pptx');
    }
  });

  it('explicit format pdf — same as default', async () => {
    await presentationExportTool(mockClient, {
      presentationId: 'pres-123',
      outputPath: '/tmp/out.pdf',
      format: 'pdf',
    });

    expect(mockClient.exportPresentation).toHaveBeenCalledWith('pres-123', 'pdf', '/tmp/out.pdf');
  });

  it('invalid format — returns validation error without calling API', async () => {
    const result = await presentationExportTool(mockClient, {
      presentationId: 'pres-123',
      outputPath: '/tmp/out.xyz',
      format: 'docx' as any,
    });

    expect(mockClient.exportPresentation).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
      expect(result.error.message).toContain('format');
    }
  });

  it('empty outputPath — returns validation error without calling API', async () => {
    const result = await presentationExportTool(mockClient, {
      presentationId: 'pres-123',
      outputPath: '',
    });

    expect(mockClient.exportPresentation).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
  });

  it('success message includes outputPath and human-readable size', async () => {
    const result = await presentationExportTool(mockClient, {
      presentationId: 'pres-123',
      outputPath: '/tmp/slides.pdf',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toContain('/tmp/slides.pdf');
    }
  });

  it('handles API errors', async () => {
    mockClient.exportPresentation.mockRejectedValue(
      new SlidesAPIError('Presentation not found', 404)
    );

    const result = await presentationExportTool(mockClient, {
      presentationId: 'pres-missing',
      outputPath: '/tmp/out.pdf',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api');
    }
  });
});
