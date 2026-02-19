import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface ElementUpdateTextParams {
  presentationId: string;
  elementId: string;
  text: string;
}

export async function elementUpdateTextTool(
  client: SlidesClient,
  params: ElementUpdateTextParams
): Promise<ToolResponse> {
  try {
    await client.batchUpdate(params.presentationId, [
      {
        deleteText: {
          objectId: params.elementId,
          textRange: { type: 'ALL' },
        },
      },
      {
        insertText: {
          objectId: params.elementId,
          text: params.text,
          insertionIndex: 0,
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse('simple', `Updated text on element: ${params.elementId}`),
      { elementId: params.elementId, text: params.text }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
