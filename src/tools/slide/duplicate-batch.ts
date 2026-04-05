import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface SlideDuplicateBatchParams {
  presentationId: string;
  slideIds: string[];
  insertionIndex?: number;
}

export async function slideDuplicateBatchTool(
  client: SlidesClient,
  params: SlideDuplicateBatchParams
): Promise<ToolResponse> {
  const { presentationId, slideIds, insertionIndex } = params;

  if (!slideIds || slideIds.length === 0) {
    return createErrorResponse('validation', 'slideIds must be a non-empty array');
  }

  try {
    // Build one duplicateObject request per slide
    const dupRequests = slideIds.map((slideId) => ({
      duplicateObject: {
        objectId: slideId,
        objectIds: {},
      },
    }));

    const response = await client.batchUpdate(presentationId, dupRequests);

    // Extract new slide IDs from replies
    const duplicatedSlides = slideIds.map((originalId, i) => ({
      originalSlideId: originalId,
      newSlideId: response.replies?.[i]?.duplicateObject?.objectId as string,
    }));

    const failed = duplicatedSlides.filter((s) => !s.newSlideId);
    if (failed.length > 0) {
      return createErrorResponse(
        'api',
        `Failed to get new slide IDs for: ${failed.map((f) => f.originalSlideId).join(', ')}`
      );
    }

    // If insertionIndex is specified, move all new slides to the target position
    if (insertionIndex !== undefined) {
      const newSlideIds = duplicatedSlides.map((s) => s.newSlideId);
      await client.batchUpdate(presentationId, [
        {
          updateSlidesPosition: {
            slideObjectIds: newSlideIds,
            insertionIndex,
          },
        },
      ]);
    }

    return createSuccessResponse(
      formatResponse('complex', `Duplicated ${slideIds.length} slides`, {
        duplicatedSlides,
        presentationId,
        insertionIndex,
      }),
      { duplicatedSlides, presentationId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
