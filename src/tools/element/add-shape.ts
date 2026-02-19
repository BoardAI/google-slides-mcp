import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

// Subset of Google Slides shapeType values that are most useful
const VALID_SHAPE_TYPES = new Set([
  'RECTANGLE',
  'ROUND_RECTANGLE',
  'ELLIPSE',
  'ARC',
  'BENT_ARROW',
  'BENT_UP_ARROW',
  'BEVEL',
  'BLOCK_ARC',
  'BRACE_PAIR',
  'BRACKET_PAIR',
  'CAN',
  'CHEVRON',
  'CHORD',
  'CLOUD',
  'CORNER',
  'CUBE',
  'CURVED_DOWN_ARROW',
  'CURVED_LEFT_ARROW',
  'CURVED_RIGHT_ARROW',
  'CURVED_UP_ARROW',
  'DECAGON',
  'DIAGONAL_STRIPE',
  'DIAMOND',
  'DODECAGON',
  'DONUT',
  'DOUBLE_WAVE',
  'DOWN_ARROW',
  'DOWN_ARROW_CALLOUT',
  'FOLDED_CORNER',
  'FRAME',
  'HALF_FRAME',
  'HEART',
  'HEPTAGON',
  'HEXAGON',
  'HOME_PLATE',
  'HORIZONTAL_SCROLL',
  'IRREGULAR_SEAL_1',
  'IRREGULAR_SEAL_2',
  'LEFT_ARROW',
  'LEFT_ARROW_CALLOUT',
  'LEFT_BRACE',
  'LEFT_BRACKET',
  'LEFT_RIGHT_ARROW',
  'LEFT_RIGHT_ARROW_CALLOUT',
  'LEFT_RIGHT_UP_ARROW',
  'LEFT_UP_ARROW',
  'LIGHTNING_BOLT',
  'MATH_DIVIDE',
  'MATH_EQUAL',
  'MATH_MINUS',
  'MATH_MULTIPLY',
  'MATH_NOT_EQUAL',
  'MATH_PLUS',
  'MOON',
  'NO_SMOKING',
  'NOTCHED_RIGHT_ARROW',
  'OCTAGON',
  'PARALLELOGRAM',
  'PENTAGON',
  'PIE',
  'PLAQUE',
  'PLUS',
  'QUAD_ARROW',
  'QUAD_ARROW_CALLOUT',
  'RIBBON',
  'RIBBON_2',
  'RIGHT_ARROW',
  'RIGHT_ARROW_CALLOUT',
  'RIGHT_BRACE',
  'RIGHT_BRACKET',
  'ROUND_1_RECTANGLE',
  'ROUND_2_DIAGONAL_RECTANGLE',
  'ROUND_2_SAME_RECTANGLE',
  'RIGHT_TRIANGLE',
  'SMILEY_FACE',
  'SNIP_1_RECTANGLE',
  'SNIP_2_DIAGONAL_RECTANGLE',
  'SNIP_2_SAME_RECTANGLE',
  'SNIP_ROUND_RECTANGLE',
  'STAR_10',
  'STAR_12',
  'STAR_16',
  'STAR_24',
  'STAR_32',
  'STAR_4',
  'STAR_5',
  'STAR_6',
  'STAR_7',
  'STAR_8',
  'STRIPED_RIGHT_ARROW',
  'SUN',
  'TRAPEZOID',
  'TRIANGLE',
  'UP_ARROW',
  'UP_ARROW_CALLOUT',
  'UP_DOWN_ARROW',
  'UTURN_ARROW',
  'VERTICAL_SCROLL',
  'WAVE',
  'WEDGE_ELLIPSE_CALLOUT',
  'WEDGE_RECTANGLE_CALLOUT',
  'WEDGE_ROUND_RECTANGLE_CALLOUT',
]);

export interface ElementAddShapeParams {
  presentationId: string;
  slideId: string;
  shapeType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const EMU_PER_POINT = 12700;

export async function elementAddShapeTool(
  client: SlidesClient,
  params: ElementAddShapeParams
): Promise<ToolResponse> {
  if (!VALID_SHAPE_TYPES.has(params.shapeType)) {
    return createErrorResponse(
      'validation',
      `Unknown shape type: ${params.shapeType}. Use a valid Google Slides shape type (e.g. RECTANGLE, ELLIPSE, TRIANGLE).`
    );
  }

  try {
    const x = (params.x ?? 100) * EMU_PER_POINT;
    const y = (params.y ?? 100) * EMU_PER_POINT;
    const width = (params.width ?? 200) * EMU_PER_POINT;
    const height = (params.height ?? 150) * EMU_PER_POINT;
    const elementId = `shape_${Date.now()}`;

    const requests = [
      {
        createShape: {
          objectId: elementId,
          shapeType: params.shapeType,
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
    ];

    await client.batchUpdate(params.presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Added ${params.shapeType} shape with ID: ${elementId}`),
      { elementId, shapeType: params.shapeType }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
