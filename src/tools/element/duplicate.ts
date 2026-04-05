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
  offsetX?: number;
  offsetY?: number;
}

const PT_TO_EMU = 12700;

export async function elementDuplicateTool(
  client: SlidesClient,
  params: ElementDuplicateParams
): Promise<ToolResponse> {
  const { presentationId, elementId, offsetX, offsetY } = params;

  try {
    const response = await client.batchUpdate(presentationId, [
      { duplicateObject: { objectId: elementId } },
    ]);

    const newElementId = response.replies?.[0]?.duplicateObject?.objectId;

    // Apply offset if specified so the copy doesn't land on top of the original
    if (newElementId && (offsetX || offsetY)) {
      const element = await client.getElement(presentationId, newElementId);
      const transform = (element as any).transform || {};

      const currentTranslateX = transform.translateX || 0;
      const currentTranslateY = transform.translateY || 0;

      await client.batchUpdate(presentationId, [
        {
          updatePageElementTransform: {
            objectId: newElementId,
            applyMode: 'ABSOLUTE',
            transform: {
              scaleX: transform.scaleX ?? 1,
              scaleY: transform.scaleY ?? 1,
              shearX: transform.shearX ?? 0,
              shearY: transform.shearY ?? 0,
              translateX: currentTranslateX + (offsetX || 0) * PT_TO_EMU,
              translateY: currentTranslateY + (offsetY || 0) * PT_TO_EMU,
              unit: transform.unit || 'EMU',
            },
          },
        },
      ]);
    }

    return createSuccessResponse(
      formatResponse('simple', `Duplicated element ${elementId} → ${newElementId}${offsetX || offsetY ? ` (offset: ${offsetX || 0}pt, ${offsetY || 0}pt)` : ''}`),
      { originalElementId: elementId, newElementId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
