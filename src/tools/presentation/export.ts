import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

const VALID_FORMATS = ['pdf', 'pptx'] as const;
type ExportFormat = typeof VALID_FORMATS[number];

export interface PresentationExportParams {
  presentationId: string;
  outputPath: string;
  format?: ExportFormat;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function presentationExportTool(
  client: SlidesClient,
  params: PresentationExportParams
): Promise<ToolResponse> {
  const { presentationId, outputPath } = params;
  const format: ExportFormat = params.format ?? 'pdf';

  if (!outputPath) {
    return createErrorResponse('validation', 'outputPath must not be empty');
  }
  if (!(VALID_FORMATS as readonly string[]).includes(format)) {
    return createErrorResponse(
      'validation',
      `Invalid format: "${format}". Must be one of: ${VALID_FORMATS.join(', ')}`
    );
  }

  try {
    const { sizeBytes } = await client.exportPresentation(presentationId, format, outputPath);

    return createSuccessResponse(
      formatResponse('simple', `Exported presentation as ${format.toUpperCase()} (${humanSize(sizeBytes)}) → ${outputPath}`),
      { format, outputPath, sizeBytes }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
