import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface ElementDuplicateParams {
  presentationId: string;
  elementId: string;
}

export async function elementDuplicateTool(
  client: SlidesClient,
  params: ElementDuplicateParams
): Promise<ToolResponse> {
  const { presentationId, elementId } = params;

  try {
    const response = await client.batchUpdate(presentationId, [
      { duplicateObject: { objectId: elementId } },
    ]);

    const newElementId = response.replies?.[0]?.duplicateObject?.objectId;

    return createSuccessResponse(
      formatResponse('simple', `Duplicated element ${elementId} → ${newElementId}`),
      { originalElementId: elementId, newElementId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
