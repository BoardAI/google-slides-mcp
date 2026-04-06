import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface SlideGetNotesParams {
  presentationId: string;
  slideId?: string;
  slideIndex?: number;
}

export interface SlideSetNotesParams {
  presentationId: string;
  slideId?: string;
  slideIndex?: number;
  text: string;
}

async function resolveSlideId(
  client: SlidesClient,
  presentationId: string,
  slideId: string | undefined,
  slideIndex: number | undefined
): Promise<{ slideId: string } | { error: ToolResponse }> {
  if (slideId != null) {
    return { slideId };
  }
  if (slideIndex == null) {
    return { error: createErrorResponse('validation', 'Provide either slideId or slideIndex') };
  }
  const presentation = await client.getPresentation(presentationId);
  const slides = presentation.slides ?? [];
  if (slideIndex < 0 || slideIndex >= slides.length) {
    return {
      error: createErrorResponse(
        'validation',
        `slideIndex ${slideIndex} is out of bounds (presentation has ${slides.length} slide${slides.length !== 1 ? 's' : ''})`
      ),
    };
  }
  return { slideId: slides[slideIndex].objectId! };
}

function findNotesBodyId(slide: any): string | undefined {
  const elements: any[] = slide.slideProperties?.notesPage?.pageElements ?? [];
  const body = elements.find(
    (el) => el.shape?.placeholder?.type === 'BODY'
  );
  return body?.objectId;
}

function extractNotesText(slide: any): string {
  const elements: any[] = slide.slideProperties?.notesPage?.pageElements ?? [];
  const body = elements.find(
    (el) => el.shape?.placeholder?.type === 'BODY'
  );
  if (!body?.shape?.text?.textElements) return '';
  return (body.shape.text.textElements as any[])
    .map((te) => te.textRun?.content ?? '')
    .join('');
}

export async function slideGetNotesTool(
  client: SlidesClient,
  params: SlideGetNotesParams
): Promise<ToolResponse> {
  const { presentationId } = params;

  let slideId: string;
  try {
    const resolved = await resolveSlideId(client, presentationId, params.slideId, params.slideIndex);
    if ('error' in resolved) return resolved.error;
    slideId = resolved.slideId;
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }

  try {
    const slide = await client.getSlide(presentationId, slideId);
    const notes = extractNotesText(slide);

    return createSuccessResponse(
      formatResponse('simple', `Notes for slide ${slideId}: ${notes || '(empty)'}`),
      { slideId, notes }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

export async function slideSetNotesTool(
  client: SlidesClient,
  params: SlideSetNotesParams
): Promise<ToolResponse> {
  const { presentationId, text } = params;

  let slideId: string;
  try {
    const resolved = await resolveSlideId(client, presentationId, params.slideId, params.slideIndex);
    if ('error' in resolved) return resolved.error;
    slideId = resolved.slideId;
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }

  try {
    const slide = await client.getSlide(presentationId, slideId);
    const notesBodyId = findNotesBodyId(slide);
    const existingText = extractNotesText(slide);

    const requests: any[] = [];

    if (existingText.trim().length > 0) {
      requests.push({
        deleteText: {
          objectId: notesBodyId,
          textRange: { type: 'ALL' },
        },
      });
    }

    if (text) {
      requests.push({
        insertText: {
          objectId: notesBodyId,
          insertionIndex: 0,
          text,
        },
      });
    }

    await client.batchUpdate(presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Set notes for slide ${slideId}`),
      { slideId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
