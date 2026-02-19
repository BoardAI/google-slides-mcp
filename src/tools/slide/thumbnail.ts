import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface SlideThumbnailParams {
  presentationId: string;
  slideId?: string;
  slideIndex?: number;
  size?: 'SMALL' | 'MEDIUM' | 'LARGE';
}

export async function slideThumbnailTool(
  client: SlidesClient,
  params: SlideThumbnailParams
): Promise<ToolResponse> {
  const { presentationId, size } = params;
  let { slideId } = params;

  if (slideId == null && params.slideIndex == null) {
    return createErrorResponse('validation', 'Provide either slideId or slideIndex');
  }

  if (params.slideIndex != null) {
    try {
      const presentation = await client.getPresentation(presentationId);
      const slides = presentation.slides ?? [];
      if (params.slideIndex < 0 || params.slideIndex >= slides.length) {
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
    const { contentUrl, width, height } = await client.getThumbnail(presentationId, slideId!, size);

    return createSuccessResponse(
      formatResponse('simple', `Thumbnail for slide ${slideId} (${width}×${height}): ${contentUrl}`),
      { slideId, contentUrl, width, height }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
