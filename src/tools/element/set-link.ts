import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface ElementSetLinkParams {
  presentationId: string;
  elementId: string;
  url: string;
  startIndex?: number;
  endIndex?: number;
}

export async function elementSetLinkTool(
  client: SlidesClient,
  params: ElementSetLinkParams
): Promise<ToolResponse> {
  const { presentationId, elementId, url } = params;

  if (url && !url.startsWith('https://')) {
    return createErrorResponse('validation', `URL must use https. Got: ${url}`);
  }

  const textRange =
    params.startIndex != null && params.endIndex != null
      ? { type: 'FIXED_RANGE', startIndex: params.startIndex, endIndex: params.endIndex }
      : { type: 'ALL' };

  const removing = !url;
  const style = removing ? {} : { link: { url } };

  try {
    await client.batchUpdate(presentationId, [
      {
        updateTextStyle: {
          objectId: elementId,
          textRange,
          style,
          fields: 'link',
        },
      },
    ]);

    const action = removing ? 'Removed link from' : `Set link on`;
    return createSuccessResponse(
      formatResponse('simple', `${action} element ${elementId}`),
      { elementId, url }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
