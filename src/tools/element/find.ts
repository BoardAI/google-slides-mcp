import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { formatElementSummary } from '../shared/format.js';

const VALID_TYPES = ['SHAPE', 'IMAGE', 'TABLE', 'LINE', 'VIDEO', 'WORD_ART', 'SHEETS_CHART'] as const;
type ElementType = typeof VALID_TYPES[number];

export interface ElementFindParams {
  presentationId: string;
  slideId?: string;
  slideIndex?: number;
  type?: ElementType;
  shapeType?: string;
  text?: string;
  placeholderType?: string;  // 'TITLE' | 'BODY' | 'CENTERED_TITLE' | 'SUBTITLE' | etc.
}

function elementType(el: any): ElementType | null {
  if (el.shape)       return 'SHAPE';
  if (el.image)       return 'IMAGE';
  if (el.table)       return 'TABLE';
  if (el.line)        return 'LINE';
  if (el.video)       return 'VIDEO';
  if (el.wordArt)     return 'WORD_ART';
  if (el.sheetsChart) return 'SHEETS_CHART';
  return null;
}

function elementText(el: any): string {
  return (el.shape?.text?.textElements ?? [])
    .filter((te: any) => te.textRun?.content)
    .map((te: any) => te.textRun.content as string)
    .join('');
}

export async function elementFindTool(
  client: SlidesClient,
  params: ElementFindParams
): Promise<ToolResponse> {
  const { presentationId, type, shapeType, text, placeholderType } = params;

  if (params.slideIndex != null && params.slideIndex < 0) {
    return createErrorResponse('validation', `slideIndex must be >= 0, got ${params.slideIndex}`);
  }

  let presentation: any;
  try {
    presentation = await client.getPresentation(presentationId);
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }

  const allSlides: Array<{ objectId: string; pageElements?: any[] }> = presentation.slides ?? [];

  // Resolve which slides to search
  let slidesToSearch: Array<{ slide: any; slideIndex: number }>;

  if (params.slideId != null) {
    const idx = allSlides.findIndex(s => s.objectId === params.slideId);
    if (idx === -1) {
      return createErrorResponse('validation', `Slide '${params.slideId}' not found in presentation`);
    }
    slidesToSearch = [{ slide: allSlides[idx], slideIndex: idx }];
  } else if (params.slideIndex != null) {
    if (params.slideIndex >= allSlides.length) {
      return createErrorResponse(
        'validation',
        `slideIndex ${params.slideIndex} is out of bounds (presentation has ${allSlides.length} slide${allSlides.length !== 1 ? 's' : ''})`
      );
    }
    slidesToSearch = [{ slide: allSlides[params.slideIndex], slideIndex: params.slideIndex }];
  } else {
    slidesToSearch = allSlides.map((slide, i) => ({ slide, slideIndex: i }));
  }

  // Collect and filter elements
  const textQuery = text != null ? text.toLowerCase() : null;

  type Match = { slideId: string; slideIndex: number; element: any; placeholderInfo?: { type: string; index?: number } };
  const matches: Array<Match> = [];

  for (const { slide, slideIndex } of slidesToSearch) {
    for (const el of slide.pageElements ?? []) {
      if (type != null && elementType(el) !== type) continue;
      if (shapeType != null && el.shape?.shapeType !== shapeType) continue;
      if (textQuery != null && !elementText(el).toLowerCase().includes(textQuery)) continue;
      if (placeholderType != null && el.placeholder?.type !== placeholderType) continue;
      const ph = el.placeholder;
      const placeholderInfo = ph?.type
        ? { type: ph.type as string, ...(ph.index != null ? { index: ph.index as number } : {}) }
        : undefined;
      matches.push({ slideId: slide.objectId, slideIndex, element: el, placeholderInfo });
    }
  }

  const matchCount = matches.length;
  const filterDesc: string[] = [];
  if (type)            filterDesc.push(`type=${type}`);
  if (shapeType)       filterDesc.push(`shapeType=${shapeType}`);
  if (text)            filterDesc.push(`text="${text}"`);
  if (placeholderType) filterDesc.push(`placeholderType=${placeholderType}`);
  if (params.slideId)    filterDesc.push(`slide=${params.slideId}`);
  if (params.slideIndex != null) filterDesc.push(`slideIndex=${params.slideIndex}`);

  const filterSuffix = filterDesc.length > 0 ? ` matching ${filterDesc.join(', ')}` : '';

  let message: string;
  if (matchCount === 0) {
    message = `No elements found${filterSuffix}`;
  } else {
    const lines = matches.map(({ slideId, slideIndex, element, placeholderInfo }, i) => {
      const summary = formatElementSummary(element, i + 1);
      const phSuffix = placeholderInfo
        ? ` [placeholder: ${placeholderInfo.type}${placeholderInfo.index != null ? ` #${placeholderInfo.index}` : ''}]`
        : '';
      return `[Slide ${slideIndex + 1}: ${slideId}${phSuffix}]\n${summary}`;
    });
    message = `Found ${matchCount} element${matchCount !== 1 ? 's' : ''}${filterSuffix}\n\n${lines.join('\n\n')}`;
  }

  const structuredMatches = matches.map(({ slideId, slideIndex, element, placeholderInfo }) => ({
    slideId,
    slideIndex,
    elementId: element.objectId,
    elementType: elementType(element),
    element,
    ...(placeholderInfo ? { placeholder: placeholderInfo } : {}),
  }));

  return createSuccessResponse(formatResponse('simple', message), { matchCount, matches: structuredMatches });
}
