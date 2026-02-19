import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface AddImageParams {
  presentationId: string;
  slideId: string;
  url: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const EMU_PER_POINT = 12700;

export async function addImageTool(
  client: SlidesClient,
  params: AddImageParams
): Promise<ToolResponse> {
  if (!params.url) {
    return createErrorResponse('validation', 'Image URL is required');
  }
  if (!params.url.startsWith('https://')) {
    return createErrorResponse(
      'validation',
      `Image URL must use https. Got: ${params.url}`
    );
  }

  try {
    const x = (params.x ?? 100) * EMU_PER_POINT;
    const y = (params.y ?? 100) * EMU_PER_POINT;
    const elementId = `image_${Date.now()}`;

    const elementProperties: Record<string, any> = {
      pageObjectId: params.slideId,
      transform: {
        scaleX: 1,
        scaleY: 1,
        translateX: x,
        translateY: y,
        unit: 'EMU',
      },
    };

    if (params.width != null || params.height != null) {
      const width = (params.width ?? 200) * EMU_PER_POINT;
      const height = (params.height ?? 150) * EMU_PER_POINT;
      elementProperties.size = {
        width: { magnitude: width, unit: 'EMU' },
        height: { magnitude: height, unit: 'EMU' },
      };
    }

    const response = await client.batchUpdate(params.presentationId, [
      {
        createImage: {
          objectId: elementId,
          url: params.url,
          elementProperties,
        },
      },
    ]);

    const createdId = response.replies?.[0]?.createImage?.objectId ?? elementId;

    return createSuccessResponse(
      formatResponse('simple', `Added image with ID: ${createdId}`),
      { elementId: createdId, url: params.url }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
