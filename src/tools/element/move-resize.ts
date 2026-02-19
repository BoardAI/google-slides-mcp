import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { emuToPoints } from '../shared/format.js';

export interface ElementMoveResizeParams {
  presentationId: string;
  elementId: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export async function elementMoveResizeTool(
  client: SlidesClient,
  params: ElementMoveResizeParams
): Promise<ToolResponse> {
  const { presentationId, elementId, x, y, width, height } = params;

  if (x == null && y == null && width == null && height == null) {
    return createErrorResponse('validation', 'At least one of x, y, width, or height must be provided');
  }

  try {
    const element = await client.getElement(presentationId, elementId);

    const intrinsicWidth = element.size?.width?.magnitude ?? 0;
    const intrinsicHeight = element.size?.height?.magnitude ?? 0;

    if (width != null && intrinsicWidth === 0) {
      return createErrorResponse('validation', `Cannot resize element ${elementId}: element has zero intrinsic width`);
    }
    if (height != null && intrinsicHeight === 0) {
      return createErrorResponse('validation', `Cannot resize element ${elementId}: element has zero intrinsic height`);
    }

    const currentScaleX = element.transform?.scaleX ?? 1;
    const currentScaleY = element.transform?.scaleY ?? 1;
    const currentTranslateX = element.transform?.translateX ?? 0;
    const currentTranslateY = element.transform?.translateY ?? 0;

    const newTranslateX = x != null ? x * 12700 : currentTranslateX;
    const newTranslateY = y != null ? y * 12700 : currentTranslateY;
    const newScaleX = width != null ? (width * 12700) / intrinsicWidth : currentScaleX;
    const newScaleY = height != null ? (height * 12700) / intrinsicHeight : currentScaleY;

    await client.batchUpdate(presentationId, [
      {
        updatePageElementTransform: {
          objectId: elementId,
          applyMode: 'ABSOLUTE',
          transform: {
            scaleX: newScaleX,
            scaleY: newScaleY,
            shearX: element.transform?.shearX ?? 0,
            shearY: element.transform?.shearY ?? 0,
            translateX: newTranslateX,
            translateY: newTranslateY,
            unit: 'EMU',
          },
        },
      },
    ]);

    const finalX = x ?? emuToPoints(currentTranslateX);
    const finalY = y ?? emuToPoints(currentTranslateY);
    const finalWidth = width ?? emuToPoints(currentScaleX * intrinsicWidth);
    const finalHeight = height ?? emuToPoints(currentScaleY * intrinsicHeight);

    return createSuccessResponse(
      formatResponse('simple', `Moved/resized element: ${elementId} — Position: ${finalX}pt, ${finalY}pt  Size: ${finalWidth}pt × ${finalHeight}pt`),
      { elementId, x: finalX, y: finalY, width: finalWidth, height: finalHeight }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
