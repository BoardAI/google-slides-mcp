import { SlideRegistry } from '../../registry/slide-registry.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface RegistryRemoveSlideParams {
  name: string;
}

export async function registryRemoveSlideTool(
  registry: SlideRegistry,
  params: RegistryRemoveSlideParams
): Promise<ToolResponse> {
  if (!params.name || !params.name.trim()) {
    return createErrorResponse('validation', 'name is required');
  }

  try {
    const removed = await registry.remove(params.name.trim());
    if (!removed) {
      return createErrorResponse('validation', `No slide named "${params.name}" found in registry`);
    }
    return createSuccessResponse(
      formatResponse('simple', `Removed "${params.name}" from slide registry`),
      { name: params.name, removed: true }
    );
  } catch (error: any) {
    return createErrorResponse('api', error.message);
  }
}
