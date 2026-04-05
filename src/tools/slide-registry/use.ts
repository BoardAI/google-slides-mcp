import { SlidesClient } from '../../google/client.js';
import { SlideRegistry } from '../../registry/slide-registry.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface RegistryUseSlideParams {
  name: string;
  targetPresentationId: string;
  insertionIndex?: number;
}

export async function registryUseSlideTool(
  client: SlidesClient,
  registry: SlideRegistry,
  params: RegistryUseSlideParams
): Promise<ToolResponse> {
  const { name, targetPresentationId, insertionIndex } = params;

  if (!name || !name.trim()) {
    return createErrorResponse('validation', 'name is required');
  }
  if (!targetPresentationId) {
    return createErrorResponse('validation', 'targetPresentationId is required');
  }

  try {
    // Look up the registry entry
    const entry = await registry.get(name.trim());
    if (!entry) {
      return createErrorResponse('validation', `No slide named "${name}" found in registry. Use registry_list_slides to see available slides.`);
    }

    // Check if source and target are the same presentation (simple case)
    if (entry.presentationId === targetPresentationId) {
      // Simple within-presentation duplicate
      const dupResponse = await client.batchUpdate(targetPresentationId, [
        {
          duplicateObject: {
            objectId: entry.slideId,
            objectIds: {},
          },
        },
      ]);

      const newSlideId = dupResponse.replies?.[0]?.duplicateObject?.objectId;
      if (!newSlideId) {
        return createErrorResponse('api', 'Failed to duplicate slide within presentation');
      }

      // Move to insertion index if specified
      if (insertionIndex !== undefined) {
        await client.batchUpdate(targetPresentationId, [
          {
            updateSlidesPosition: {
              slideObjectIds: [newSlideId],
              insertionIndex,
            },
          },
        ]);
      }

      // Build element ID mapping
      const presentation = await client.getPresentation(targetPresentationId);
      const origSlide = presentation.slides?.find((s) => s.objectId === entry.slideId);
      const newSlide = presentation.slides?.find((s) => s.objectId === newSlideId);
      const elementIdMapping: Record<string, string> = {};
      const origElements = origSlide?.pageElements ?? [];
      const newElements = newSlide?.pageElements ?? [];
      for (let i = 0; i < origElements.length && i < newElements.length; i++) {
        const origId = origElements[i].objectId;
        const newId = newElements[i].objectId;
        if (origId && newId) elementIdMapping[origId] = newId;
      }

      return createSuccessResponse(
        formatResponse('complex', `Copied registry slide "${name}" into presentation (same-presentation duplicate)`, {
          newSlideId,
          elementIdMapping,
          source: { presentationId: entry.presentationId, slideId: entry.slideId },
        }),
        { newSlideId, elementIdMapping }
      );
    }

    // Cross-presentation copy: copy source presentation, strip to single slide, return as template
    // Step 1: Find the slide index in the source presentation
    const sourcePresentation = await client.getPresentation(entry.presentationId);
    const sourceSlides = sourcePresentation.slides ?? [];
    const slideIndex = sourceSlides.findIndex((s) => s.objectId === entry.slideId);

    if (slideIndex === -1) {
      return createErrorResponse(
        'validation',
        `Slide ${entry.slideId} no longer exists in source presentation ${entry.presentationId}. The registry entry may be stale.`
      );
    }

    // Step 2: Copy the entire source presentation to a temp file
    const tempPresentationId = await client.copyPresentation(
      entry.presentationId,
      `__registry_temp_${name}_${Date.now()}`
    );

    try {
      // Step 3: Read the temp presentation and delete all slides except the target
      const tempPresentation = await client.getPresentation(tempPresentationId);
      const tempSlides = tempPresentation.slides ?? [];

      if (tempSlides.length > 1) {
        const slideToKeep = tempSlides[slideIndex];
        const slidesToDelete = tempSlides.filter((_, i) => i !== slideIndex);

        const deleteRequests = slidesToDelete.map((s) => ({
          deleteObject: { objectId: s.objectId! },
        }));

        await client.batchUpdate(tempPresentationId, deleteRequests);
      }

      // Step 4: Read the single remaining slide's elements for reconstruction
      const strippedPresentation = await client.getPresentation(tempPresentationId);
      const templateSlide = strippedPresentation.slides?.[0];
      const templateSlideId = templateSlide?.objectId;

      return createSuccessResponse(
        formatResponse('complex', `Prepared registry slide "${name}" for cross-presentation use`, {
          tempPresentationId,
          tempSlideId: templateSlideId,
          tempPresentationUrl: `https://docs.google.com/presentation/d/${tempPresentationId}/edit`,
          sourceEntry: {
            name: entry.name,
            presentationId: entry.presentationId,
            slideId: entry.slideId,
          },
          instructions: 'A temporary single-slide presentation has been created. You can: (1) Use presentation_create_from_template with this tempPresentationId to create new presentations based on this slide, or (2) Open it side-by-side to manually copy elements. The temp presentation can be deleted when done.',
          elementCount: templateSlide?.pageElements?.length ?? 0,
        }),
        {
          tempPresentationId,
          tempSlideId: templateSlideId,
          sourceEntry: { name: entry.name, presentationId: entry.presentationId, slideId: entry.slideId },
        }
      );
    } catch (innerError) {
      // Clean up temp presentation on failure by renaming it to indicate it's trash
      // (We can't delete via the Slides API, but at least mark it)
      try {
        await client.renamePresentation(tempPresentationId, `__FAILED_TEMP_DELETE_ME_${Date.now()}`);
      } catch {
        // ignore cleanup errors
      }
      throw innerError;
    }
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
