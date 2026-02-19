import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface CreateSlideParams {
  presentationId: string;
  insertionIndex?: number;
}

export async function createSlideTool(
  client: SlidesClient,
  params: CreateSlideParams
): Promise<ToolResponse> {
  try {
    const requests: any[] = [
      {
        createSlide: params.insertionIndex !== undefined
          ? { insertionIndex: params.insertionIndex }
          : {},
      },
    ];

    const response = await client.batchUpdate(params.presentationId, requests);

    const slideId = response.replies?.[0]?.createSlide?.objectId;
    if (!slideId) {
      return createErrorResponse(
        'validation',
        'No slide ID returned from API'
      );
    }

    return createSuccessResponse(
      formatResponse('complex', 'Created slide', {
        slideId,
        presentationId: params.presentationId,
        insertionIndex: params.insertionIndex,
      }),
      {
        slideId,
        presentationId: params.presentationId,
      }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export interface DeleteSlideParams {
  presentationId: string;
  slideId: string;
}

export async function deleteSlideTool(
  client: SlidesClient,
  params: DeleteSlideParams
): Promise<ToolResponse> {
  try {
    const requests: any[] = [
      {
        deleteObject: {
          objectId: params.slideId,
        },
      },
    ];

    await client.batchUpdate(params.presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', 'Deleted slide', {
        slideId: params.slideId,
        presentationId: params.presentationId,
      }),
      {
        slideId: params.slideId,
        presentationId: params.presentationId,
      }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export interface DuplicateSlideParams {
  presentationId: string;
  slideId: string;
  insertionIndex?: number;
}

export async function duplicateSlideTool(
  client: SlidesClient,
  params: DuplicateSlideParams
): Promise<ToolResponse> {
  try {
    const requests: any[] = [
      {
        duplicateObject: {
          objectId: params.slideId,
          objectIds: {},
          ...(params.insertionIndex !== undefined && {
            insertionIndex: params.insertionIndex,
          }),
        },
      },
    ];

    const response = await client.batchUpdate(params.presentationId, requests);

    const newSlideId = response.replies?.[0]?.duplicateObject?.objectId;
    if (!newSlideId) {
      return createErrorResponse(
        'validation',
        'No duplicated slide ID returned from API'
      );
    }

    return createSuccessResponse(
      formatResponse('complex', 'Duplicated slide', {
        originalSlideId: params.slideId,
        newSlideId,
        presentationId: params.presentationId,
        insertionIndex: params.insertionIndex,
      }),
      {
        originalSlideId: params.slideId,
        newSlideId,
        presentationId: params.presentationId,
      }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export { slideGetTool, SlideGetParams } from './get.js';
export { slideReorderTool, SlideReorderParams } from './reorder.js';
export { slideSetBackgroundTool, SlideSetBackgroundParams } from './set-background.js';
