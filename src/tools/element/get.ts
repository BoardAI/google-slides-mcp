import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';
import { formatElementSummary } from '../shared/format.js';

export interface ElementGetParams {
  presentationId: string;
  elementId: string;
  detailed?: boolean;
}

export async function elementGetTool(
  client: SlidesClient,
  params: ElementGetParams
): Promise<ToolResponse> {
  try {
    const element = await client.getElement(params.presentationId, params.elementId);

    let message = formatElementSummary(element);

    if (params.detailed) {
      message += '\n\n--- Raw Data ---\n' + JSON.stringify(element, null, 2);
    }

    return createSuccessResponse(message, {
      elementId: params.elementId,
      presentationId: params.presentationId,
      element,
    });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
