import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import { ToolResponse, createSuccessResponse, createErrorResponse, formatResponse } from '../../utils/response.js';

// ─── tableInsertColumnsTool ────────────────────────────────────────────────────

export interface TableInsertColumnsParams {
  presentationId: string;
  tableId: string;
  columnIndex: number;
  count?: number;
  insertRight?: boolean;
}

export async function tableInsertColumnsTool(
  client: SlidesClient,
  params: TableInsertColumnsParams
): Promise<ToolResponse> {
  const { presentationId, tableId, columnIndex, count, insertRight } = params;

  try {
    await client.batchUpdate(presentationId, [
      {
        insertTableColumns: {
          tableObjectId: tableId,
          cellLocation: { columnIndex },
          insertRight: insertRight ?? true,
          number: count ?? 1,
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse('simple', `Inserted ${count ?? 1} column(s) in table: ${tableId} at columnIndex ${columnIndex}`),
      { success: true }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

// ─── tableDeleteColumnsTool ────────────────────────────────────────────────────

export interface TableDeleteColumnsParams {
  presentationId: string;
  tableId: string;
  columnIndices: number[];
}

export async function tableDeleteColumnsTool(
  client: SlidesClient,
  params: TableDeleteColumnsParams
): Promise<ToolResponse> {
  const { presentationId, tableId, columnIndices } = params;

  if (columnIndices.length === 0) {
    return createErrorResponse('validation', 'columnIndices must not be empty');
  }

  // Sort descending to avoid index shifting when deleting multiple columns
  const sorted = [...columnIndices].sort((a, b) => b - a);

  const requests = sorted.map((columnIndex) => ({
    deleteTableColumn: {
      tableObjectId: tableId,
      cellLocation: { columnIndex },
    },
  }));

  try {
    await client.batchUpdate(presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Deleted columns [${sorted.join(', ')}] from table: ${tableId}`),
      { success: true }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

// ─── tableSetColumnWidthTool ───────────────────────────────────────────────────

export interface TableSetColumnWidthParams {
  presentationId: string;
  tableId: string;
  columnIndices: number[];
  width: number;
}

export async function tableSetColumnWidthTool(
  client: SlidesClient,
  params: TableSetColumnWidthParams
): Promise<ToolResponse> {
  const { presentationId, tableId, columnIndices, width } = params;

  if (width <= 0) {
    return createErrorResponse('validation', 'width must be greater than 0');
  }

  try {
    await client.batchUpdate(presentationId, [
      {
        updateTableColumnProperties: {
          objectId: tableId,
          columnIndices,
          tableColumnProperties: {
            columnWidth: {
              magnitude: width,
              unit: 'PT',
            },
          },
          fields: 'columnWidth',
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse('simple', `Set column width to ${width}pt for columns [${columnIndices.join(', ')}] in table: ${tableId}`),
      { success: true }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
