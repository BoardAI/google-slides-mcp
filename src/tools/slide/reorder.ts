import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface SlideReorderParams {
  presentationId: string;
  slideId: string;
  insertionIndex: number;
}

export async function slideReorderTool(
  client: SlidesClient,
  params: SlideReorderParams
): Promise<ToolResponse> {
  if (params.insertionIndex < 0) {
    return createErrorResponse(
      'validation',
      `insertionIndex must be >= 0, got ${params.insertionIndex}`
    );
  }

  try {
    await client.batchUpdate(params.presentationId, [
      {
        updateSlidesPosition: {
          slideObjectIds: [params.slideId],
          insertionIndex: params.insertionIndex,
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse('simple', `Moved slide ${params.slideId} to position ${params.insertionIndex}`),
      { slideId: params.slideId, insertionIndex: params.insertionIndex }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
