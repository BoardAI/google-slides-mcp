import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface AddTableParams {
  presentationId: string;
  slideId: string;
  rows: number;
  columns: number;
  x?: number;       // points, default 100
  y?: number;       // points, default 100
  width?: number;   // points, default 400
  height?: number;  // points, default 200
}

const EMU_PER_POINT = 12700;

export async function addTableTool(
  client: SlidesClient,
  params: AddTableParams
): Promise<ToolResponse> {
  const { presentationId, slideId, rows, columns } = params;

  if (!Number.isInteger(rows) || rows < 1) {
    return createErrorResponse('validation', `Invalid rows: ${rows}. Must be an integer ≥ 1`);
  }
  if (!Number.isInteger(columns) || columns < 1) {
    return createErrorResponse('validation', `Invalid columns: ${columns}. Must be an integer ≥ 1`);
  }

  try {
    const x = (params.x ?? 100) * EMU_PER_POINT;
    const y = (params.y ?? 100) * EMU_PER_POINT;
    const width = (params.width ?? 400) * EMU_PER_POINT;
    const height = (params.height ?? 200) * EMU_PER_POINT;

    const response = await client.batchUpdate(presentationId, [
      {
        createTable: {
          elementProperties: {
            pageObjectId: slideId,
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
          rows,
          columns,
        },
      },
    ]);

    const elementId = response.replies?.[0]?.createTable?.objectId;

    return createSuccessResponse(
      formatResponse('simple', `Added ${rows}×${columns} table with ID: ${elementId}`),
      { elementId, rows, columns }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
