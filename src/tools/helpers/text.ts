import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface AddTextBoxParams {
  presentationId: string;
  slideId: string;
  text: string;
  x?: number; // EMUs (1 point = 12700 EMUs)
  y?: number;
  width?: number;
  height?: number;
}

export async function addTextBoxTool(
  client: SlidesClient,
  params: AddTextBoxParams
): Promise<ToolResponse> {
  try {
    // Convert points to EMUs if needed (Google Slides uses EMUs)
    const EMU_PER_POINT = 12700;
    const x = (params.x || 100) * EMU_PER_POINT;
    const y = (params.y || 100) * EMU_PER_POINT;
    const width = (params.width || 300) * EMU_PER_POINT;
    const height = (params.height || 50) * EMU_PER_POINT;

    const elementId = `textbox_${Date.now()}`;

    const requests = [
      {
        createShape: {
          objectId: elementId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: params.slideId,
            size: {
              width: { magnitude: width, unit: 'EMU' },
              height: { magnitude: height, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: x,
              translateY: y,
              unit: 'EMU',
            },
          },
        },
      },
      {
        insertText: {
          objectId: elementId,
          text: params.text,
        },
      },
    ];

    await client.batchUpdate(params.presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Added text box with ID: ${elementId}`),
      { elementId, text: params.text }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
