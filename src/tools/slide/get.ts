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
  slideId?: string;
  slideIndex?: number;
  detailed?: boolean;
}

export async function slideGetTool(
  client: SlidesClient,
  params: SlideGetParams
): Promise<ToolResponse> {
  const { presentationId, detailed } = params;
  let { slideId } = params;

  if (slideId == null && params.slideIndex == null) {
    return createErrorResponse('validation', 'Provide either slideId or slideIndex');
  }

  if (params.slideIndex != null) {
    if (params.slideIndex < 0) {
      return createErrorResponse(
        'validation',
        `slideIndex must be >= 0, got ${params.slideIndex}`
      );
    }

    try {
      const presentation = await client.getPresentation(presentationId);
      const slides = presentation.slides ?? [];
      if (params.slideIndex >= slides.length) {
        return createErrorResponse(
          'validation',
          `slideIndex ${params.slideIndex} is out of bounds (presentation has ${slides.length} slide${slides.length !== 1 ? 's' : ''})`
        );
      }
      slideId = slides[params.slideIndex].objectId!;
    } catch (error: any) {
      if (error instanceof SlidesAPIError) {
        return createErrorResponse('api', error.message, error.details, error.retryable);
      }
      return createErrorResponse('api', error.message);
    }
  }

  try {
    const slide = await client.getSlide(presentationId, slideId!);
    const elements = slide.pageElements ?? [];
    const count = elements.length;

    let message = `Slide: ${slideId} (${count} element${count !== 1 ? 's' : ''})`;

    if (count > 0) {
      const summaries = elements.map((el, i) => formatElementSummary(el, i + 1));
      message += '\n\n' + summaries.join('\n\n');
    }

    if (detailed) {
      message += '\n\n--- Raw Data ---\n' + JSON.stringify(elements, null, 2);
    }

    return createSuccessResponse(message, {
      slideId,
      presentationId,
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
