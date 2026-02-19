import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface PresentationRenameParams {
  presentationId: string;
  title: string;
}

export async function presentationRenameTool(
  client: SlidesClient,
  params: PresentationRenameParams
): Promise<ToolResponse> {
  const { presentationId, title } = params;

  if (!title.trim()) {
    return createErrorResponse('validation', 'Title must not be empty');
  }

  try {
    await client.renamePresentation(presentationId, title);

    return createSuccessResponse(
      formatResponse('simple', `Renamed presentation to "${title}"`),
      { presentationId, title }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
