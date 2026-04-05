import { SlideRegistry } from '../../registry/slide-registry.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface RegistrySaveSlideParams {
  name: string;
  presentationId: string;
  slideId: string;
  description?: string;
  tags?: string[];
}

export async function registrySaveSlideTool(
  registry: SlideRegistry,
  params: RegistrySaveSlideParams
): Promise<ToolResponse> {
  const { name, presentationId, slideId, description, tags } = params;

  if (!name || !name.trim()) {
    return createErrorResponse('validation', 'name is required and cannot be empty');
  }
  if (!presentationId) {
    return createErrorResponse('validation', 'presentationId is required');
  }
  if (!slideId) {
    return createErrorResponse('validation', 'slideId is required');
  }

  try {
    const entry = await registry.saveEntry({ name: name.trim(), presentationId, slideId, description, tags });
    return createSuccessResponse(
      formatResponse('complex', `Saved slide "${entry.name}" to registry`, {
        name: entry.name,
        presentationId: entry.presentationId,
        slideId: entry.slideId,
        description: entry.description,
        tags: entry.tags,
        addedAt: entry.addedAt,
      }),
      { name: entry.name, presentationId, slideId }
    );
  } catch (error: any) {
    return createErrorResponse('api', error.message);
  }
}
