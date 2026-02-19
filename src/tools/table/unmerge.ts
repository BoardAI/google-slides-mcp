import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface TableUnmergeCellsParams {
  presentationId: string;
  tableId: string;
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
}

export async function tableUnmergeCellsTool(
  client: SlidesClient,
  params: TableUnmergeCellsParams
): Promise<ToolResponse> {
  const { presentationId, tableId, row, column, rowSpan, columnSpan } = params;

  if (rowSpan < 1) {
    return createErrorResponse('validation', 'rowSpan must be at least 1');
  }
  if (columnSpan < 1) {
    return createErrorResponse('validation', 'columnSpan must be at least 1');
  }

  try {
    await client.batchUpdate(presentationId, [
      {
        unmergeTableCells: {
          objectId: tableId,
          tableRange: {
            location: { rowIndex: row, columnIndex: column },
            rowSpan,
            columnSpan,
          },
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse(
        'simple',
        `Unmerged ${rowSpan}×${columnSpan} cell range at row ${row}, column ${column}`
      ),
      { tableId, row, column, rowSpan, columnSpan }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
