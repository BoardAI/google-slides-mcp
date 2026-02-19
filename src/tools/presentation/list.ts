import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface PresentationListParams {
  query?: string;
  limit?: number;
}

export async function presentationListTool(
  client: SlidesClient,
  params: PresentationListParams
): Promise<ToolResponse> {
  const { query, limit } = params;

  if (limit != null && (limit < 1 || limit > 100)) {
    return createErrorResponse('validation', `Invalid limit: ${limit}. Must be between 1 and 100`);
  }

  try {
    const presentations = await client.listPresentations(query, limit);
    const count = presentations.length;

    const queryDesc = query ? ` matching "${query}"` : '';
    let message: string;

    if (count === 0) {
      message = `No presentations found${queryDesc}`;
    } else {
      const lines = presentations.map((p, i) => {
        const modified = p.modifiedTime
          ? `  Modified: ${new Date(p.modifiedTime).toLocaleDateString()}`
          : '';
        const link = p.webViewLink ? `  URL: ${p.webViewLink}` : '';
        return `${i + 1}. ${p.name} [${p.id}]${modified}${link}`;
      });
      message = `Found ${count} presentation${count !== 1 ? 's' : ''}${queryDesc}\n\n${lines.join('\n')}`;
    }

    return createSuccessResponse(formatResponse('simple', message), { count, presentations });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
