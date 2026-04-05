import { SlideRegistry } from '../../registry/slide-registry.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface RegistryListSlidesParams {
  query?: string;
}

export async function registryListSlidesTool(
  registry: SlideRegistry,
  params: RegistryListSlidesParams
): Promise<ToolResponse> {
  try {
    const entries = await registry.list(params.query);

    if (entries.length === 0) {
      const msg = params.query
        ? `No slides in registry matching "${params.query}"`
        : 'Slide registry is empty. Use registry_save_slide to save slides for reuse.';
      return createSuccessResponse(formatResponse('simple', msg), { entries: [] });
    }

    const summary = entries.map((e) => ({
      name: e.name,
      presentationId: e.presentationId,
      slideId: e.slideId,
      description: e.description || '',
      tags: e.tags || [],
      addedAt: e.addedAt,
    }));

    return createSuccessResponse(
      formatResponse('complex', `Found ${entries.length} slide(s) in registry`, { entries: summary }),
      { entries: summary }
    );
  } catch (error: any) {
    return createErrorResponse('api', error.message);
  }
}
