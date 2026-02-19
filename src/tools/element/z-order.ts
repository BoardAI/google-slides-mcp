import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export type ZOrderOperation = 'BRING_TO_FRONT' | 'SEND_TO_BACK' | 'BRING_FORWARD' | 'SEND_BACKWARD';

export interface ElementZOrderParams {
  presentationId: string;
  elementIds: string[];
  operation: ZOrderOperation;
}

export async function elementZOrderTool(
  client: SlidesClient,
  params: ElementZOrderParams
): Promise<ToolResponse> {
  const { presentationId, elementIds, operation } = params;

  if (elementIds.length === 0) {
    return createErrorResponse('validation', 'elementIds must contain at least one element ID');
  }

  try {
    await client.batchUpdate(presentationId, [
      {
        updatePageElementsZOrder: {
          pageElementObjectIds: elementIds,
          operation,
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse(
        'simple',
        `Applied ${operation} to ${elementIds.length} element${elementIds.length !== 1 ? 's' : ''}`
      ),
      { elementIds, operation }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
