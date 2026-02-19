import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface ElementReplaceImageParams {
  presentationId: string;
  elementId: string;
  url: string;
  imageReplaceMethod?: 'CENTER_CROP';
}

export async function elementReplaceImageTool(
  client: SlidesClient,
  params: ElementReplaceImageParams
): Promise<ToolResponse> {
  const { presentationId, elementId, url, imageReplaceMethod } = params;

  if (!url) {
    return createErrorResponse('validation', 'Image URL is required');
  }
  if (!url.startsWith('https://')) {
    return createErrorResponse('validation', `Image URL must use https. Got: ${url}`);
  }

  try {
    const request: Record<string, any> = {
      imageObjectId: elementId,
      url,
    };
    if (imageReplaceMethod != null) {
      request.imageReplaceMethod = imageReplaceMethod;
    }

    await client.batchUpdate(presentationId, [{ replaceImage: request }]);

    return createSuccessResponse(
      formatResponse('simple', `Replaced image content for element: ${elementId}`),
      { elementId, url }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
