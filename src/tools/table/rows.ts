import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import { ToolResponse, createSuccessResponse, createErrorResponse, formatResponse } from '../../utils/response.js';

export interface TableInsertRowsParams {
  presentationId: string;
  tableId: string;
  rowIndex: number;
  count?: number;
  insertBelow?: boolean;
}

export async function tableInsertRowsTool(
  client: SlidesClient,
  params: TableInsertRowsParams
): Promise<ToolResponse> {
  try {
    await client.batchUpdate(params.presentationId, [
      {
        insertTableRows: {
          tableObjectId: params.tableId,
          cellLocation: { rowIndex: params.rowIndex },
          insertBelow: params.insertBelow ?? true,
          number: params.count ?? 1,
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse('simple', `Inserted ${params.count ?? 1} row(s) into table ${params.tableId}`),
      { success: true }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export interface TableDeleteRowsParams {
  presentationId: string;
  tableId: string;
  rowIndices: number[];
}

export async function tableDeleteRowsTool(
  client: SlidesClient,
  params: TableDeleteRowsParams
): Promise<ToolResponse> {
  if (params.rowIndices.length === 0) {
    return createErrorResponse('validation', 'rowIndices must not be empty');
  }

  try {
    const sortedIndices = [...params.rowIndices].sort((a, b) => b - a);

    const requests = sortedIndices.map((rowIndex) => ({
      deleteTableRow: {
        tableObjectId: params.tableId,
        cellLocation: { rowIndex },
      },
    }));

    await client.batchUpdate(params.presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Deleted ${sortedIndices.length} row(s) from table ${params.tableId}`),
      { success: true }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export interface TableSetRowHeightParams {
  presentationId: string;
  tableId: string;
  rowIndices: number[];
  minHeight: number;
}

export async function tableSetRowHeightTool(
  client: SlidesClient,
  params: TableSetRowHeightParams
): Promise<ToolResponse> {
  if (params.minHeight <= 0) {
    return createErrorResponse('validation', 'minHeight must be greater than 0');
  }

  try {
    const requests: any[] = [
      {
        updateTableRowStyle: {
          objectId: params.tableId,
          rowIndices: params.rowIndices,
          tableRowStyle: {
            minRowHeight: {
              magnitude: params.minHeight,
              unit: 'PT',
            },
          },
          fields: 'minRowHeight',
        },
      },
    ];

    await client.batchUpdate(params.presentationId, requests as any);

    return createSuccessResponse(
      formatResponse('simple', `Set minimum row height to ${params.minHeight}pt for ${params.rowIndices.length} row(s) in table ${params.tableId}`),
      { success: true }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
