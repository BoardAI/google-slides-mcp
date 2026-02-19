import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { HEX_COLOR_RE, parseHexColor } from '../shared/format.js';

export interface SlideSetBackgroundParams {
  presentationId: string;
  slideId: string;
  color?: string;     // hex e.g. "#FF0000"
  imageUrl?: string;  // public HTTPS URL
}

export async function slideSetBackgroundTool(
  client: SlidesClient,
  params: SlideSetBackgroundParams
): Promise<ToolResponse> {
  const { presentationId, slideId, color, imageUrl } = params;

  if (color == null && imageUrl == null) {
    return createErrorResponse('validation', 'Provide either color (hex) or imageUrl (HTTPS URL)');
  }

  if (color != null && !HEX_COLOR_RE.test(color)) {
    return createErrorResponse('validation', `Invalid color: ${color}. Use hex format, e.g. "#FF0000"`);
  }

  if (imageUrl != null && !imageUrl.startsWith('https://')) {
    return createErrorResponse('validation', `imageUrl must use https. Got: ${imageUrl}`);
  }

  try {
    const pageBackgroundFill = color != null
      ? {
          solidFill: {
            color: { rgbColor: parseHexColor(color) },
          },
        }
      : {
          stretchedPictureFill: {
            contentUrl: imageUrl,
          },
        };

    const fields = color != null
      ? 'pageBackgroundFill.solidFill'
      : 'pageBackgroundFill.stretchedPictureFill';

    await client.batchUpdate(presentationId, [
      {
        updatePageProperties: {
          objectId: slideId,
          pageProperties: { pageBackgroundFill },
          fields,
        },
      },
    ]);

    const description = color != null ? `color ${color}` : `image ${imageUrl}`;
    return createSuccessResponse(
      formatResponse('simple', `Set background of slide ${slideId} to ${description}`),
      { slideId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
