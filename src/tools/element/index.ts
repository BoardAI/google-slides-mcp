import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface DeleteElementParams {
  presentationId: string;
  elementId: string;
}

export async function deleteElementTool(
  client: SlidesClient,
  params: DeleteElementParams
): Promise<ToolResponse> {
  try {
    const requests = [
      {
        deleteObject: {
          objectId: params.elementId,
        },
      },
    ];

    await client.batchUpdate(params.presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Deleted element: ${params.elementId}`)
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
