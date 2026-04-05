import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { HEX_COLOR_RE, parseHexColor } from '../shared/format.js';
import { resolveColorForAPI } from '../theme/resolve.js';

export interface ElementStyleParams {
  presentationId: string;
  elementId: string;
  fillColor?: string;    // hex e.g. "#FF0000"
  borderColor?: string;  // hex e.g. "#0000FF"
  borderWidth?: number;  // points
}

export async function elementStyleTool(
  client: SlidesClient,
  params: ElementStyleParams
): Promise<ToolResponse> {
  const { presentationId, elementId, fillColor, borderColor, borderWidth } = params;

  if (fillColor == null && borderColor == null && borderWidth == null) {
    return createErrorResponse('validation', 'At least one of fillColor, borderColor, or borderWidth must be provided');
  }

  if (fillColor != null && !HEX_COLOR_RE.test(fillColor)) {
    return createErrorResponse('validation', `Invalid fill color: ${fillColor}. Use hex format, e.g. "#FF0000"`);
  }
  if (borderColor != null && !HEX_COLOR_RE.test(borderColor)) {
    return createErrorResponse('validation', `Invalid border color: ${borderColor}. Use hex format, e.g. "#0000FF"`);
  }

  try {
    const shapeProperties: Record<string, any> = {};
    const fieldPaths: string[] = [];

    if (fillColor != null) {
      shapeProperties.shapeBackgroundFill = {
        solidFill: {
          color: resolveColorForAPI(fillColor),
        },
      };
      fieldPaths.push('shapeBackgroundFill.solidFill');
    }

    if (borderColor != null || borderWidth != null) {
      shapeProperties.outline = {};

      if (borderColor != null) {
        shapeProperties.outline.outlineFill = {
          solidFill: {
            color: resolveColorForAPI(borderColor),
          },
        };
        fieldPaths.push('outline.outlineFill.solidFill');
      }

      if (borderWidth != null) {
        shapeProperties.outline.weight = {
          magnitude: borderWidth * 12700,
          unit: 'EMU',
        };
        fieldPaths.push('outline.weight');
      }
    }

    await client.batchUpdate(presentationId, [
      {
        updateShapeProperties: {
          objectId: elementId,
          shapeProperties,
          fields: fieldPaths.join(','),
        },
      },
    ]);

    const applied: string[] = [];
    if (fillColor != null) applied.push(`fill ${fillColor}`);
    if (borderColor != null) applied.push(`border color ${borderColor}`);
    if (borderWidth != null) applied.push(`border width ${borderWidth}pt`);

    return createSuccessResponse(
      formatResponse('simple', `Styled element ${elementId}: ${applied.join(', ')}`),
      { elementId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
