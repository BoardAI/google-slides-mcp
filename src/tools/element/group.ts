import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface ElementGroupParams {
  presentationId: string;
  elementIds: string[];
}

export interface ElementUngroupParams {
  presentationId: string;
  groupIds: string[];
}

export async function elementGroupTool(
  client: SlidesClient,
  params: ElementGroupParams
): Promise<ToolResponse> {
  const { presentationId, elementIds } = params;

  if (elementIds.length < 2) {
    return createErrorResponse('validation', 'At least 2 element IDs are required to form a group');
  }

  try {
    const response = await client.batchUpdate(presentationId, [
      { groupObjects: { childrenObjectIds: elementIds } },
    ]);

    const groupId = response.replies?.[0]?.groupObjects?.objectId;

    return createSuccessResponse(
      formatResponse('simple', `Grouped ${elementIds.length} elements into group ${groupId}`),
      { groupId, elementIds }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export async function elementUngroupTool(
  client: SlidesClient,
  params: ElementUngroupParams
): Promise<ToolResponse> {
  const { presentationId, groupIds } = params;

  if (groupIds.length === 0) {
    return createErrorResponse('validation', 'groupIds must contain at least one group ID');
  }

  try {
    await client.batchUpdate(presentationId, [
      { ungroupObjects: { objectIds: groupIds } },
    ]);

    return createSuccessResponse(
      formatResponse(
        'simple',
        `Ungrouped ${groupIds.length} group${groupIds.length !== 1 ? 's' : ''}`
      ),
      { groupIds }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
