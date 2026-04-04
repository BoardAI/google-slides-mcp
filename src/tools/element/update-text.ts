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
    // Check if element has existing text before trying to delete.
    // deleteText with type: 'ALL' fails on empty shapes (startIndex 0 == endIndex 0).
    let hasExistingText = false;
    try {
      const element = await client.getElement(params.presentationId, params.elementId);
      const textContent = (element as any)?.shape?.text?.textElements;
      if (textContent && textContent.length > 1) {
        hasExistingText = true;
      }
    } catch {
      // If we can't check, try delete anyway
      hasExistingText = true;
    }

    const requests: any[] = [];
    if (hasExistingText) {
      requests.push({
        deleteText: {
          objectId: params.elementId,
          textRange: { type: 'ALL' },
        },
      });
    }
    requests.push({
      insertText: {
        objectId: params.elementId,
        text: params.text,
        insertionIndex: 0,
      },
    });

    await client.batchUpdate(params.presentationId, requests);

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
