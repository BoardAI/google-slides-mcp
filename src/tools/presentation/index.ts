import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export { presentationListTool, PresentationListParams } from './list.js';
export { presentationExportTool, PresentationExportParams } from './export.js';
export { createFromTemplateTool, CreateFromTemplateParams } from './create-from-template.js';
export { presentationRenameTool, PresentationRenameParams } from './rename.js';
export { presentationOutlineTool, PresentationOutlineParams } from './outline.js';
export { presentationDuplicateTool, PresentationDuplicateParams } from './duplicate.js';
export { presentationGetDesignSystemTool, PresentationGetDesignSystemParams } from './design-system.js';

export interface CreatePresentationParams {
  title: string;
}

export async function createPresentationTool(
  client: SlidesClient,
  params: CreatePresentationParams
): Promise<ToolResponse> {
  try {
    const presentation = await client.createPresentation(params.title);

    return createSuccessResponse(
      formatResponse('complex', 'Created presentation', {
        presentationId: presentation.presentationId,
        title: presentation.title,
        url: `https://docs.google.com/presentation/d/${presentation.presentationId}`,
      }),
      {
        presentationId: presentation.presentationId,
        title: presentation.title,
      }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export interface GetPresentationParams {
  presentationId: string;
}

export async function getPresentationTool(
  client: SlidesClient,
  params: GetPresentationParams
): Promise<ToolResponse> {
  try {
    const presentation = await client.getPresentation(params.presentationId);

    const slideCount = presentation.slides?.length || 0;

    return createSuccessResponse(
      formatResponse('complex', 'Retrieved presentation', {
        presentationId: presentation.presentationId,
        title: presentation.title,
        slideCount,
        url: `https://docs.google.com/presentation/d/${presentation.presentationId}`,
      }),
      {
        presentationId: presentation.presentationId,
        title: presentation.title,
        slideCount,
        slides: (presentation.slides ?? []).map((s, i) => ({
          index: i,
          slideId: s.objectId,
          elementCount: s.pageElements?.length ?? 0,
        })),
      }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
