import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';
import { formatElementSummary } from '../shared/format.js';

export interface SlideGetParams {
  presentationId: string;
  slideId: string;
  detailed?: boolean;
}

export async function slideGetTool(
  client: SlidesClient,
  params: SlideGetParams
): Promise<ToolResponse> {
  try {
    const slide = await client.getSlide(params.presentationId, params.slideId);
    const elements = slide.pageElements ?? [];
    const count = elements.length;

    let message = `Slide: ${params.slideId} (${count} element${count !== 1 ? 's' : ''})`;

    if (count > 0) {
      const summaries = elements.map((el, i) => formatElementSummary(el, i + 1));
      message += '\n\n' + summaries.join('\n\n');
    }

    if (params.detailed) {
      message += '\n\n--- Raw Data ---\n' + JSON.stringify(elements, null, 2);
    }

    return createSuccessResponse(message, {
      slideId: params.slideId,
      presentationId: params.presentationId,
      elementCount: count,
      elements,
    });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
