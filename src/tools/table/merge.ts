import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import { ToolResponse, createSuccessResponse, createErrorResponse, formatResponse } from '../../utils/response.js';

export interface TableMergeCellsParams {
  presentationId: string;
  tableId: string;
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
}

export async function tableMergeCellsTool(
  client: SlidesClient,
  params: TableMergeCellsParams
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
        mergeTableCells: {
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
      formatResponse('simple', `Merged cells in table: ${tableId} — starting at row ${row}, column ${column}, spanning ${rowSpan} rows and ${columnSpan} columns`),
      { tableId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
