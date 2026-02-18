import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import { slides_v1 } from '@googleapis/slides';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';

export interface SlideGetParams {
  presentationId: string;
  slideId: string;
  detailed?: boolean;
}

function emuToPoints(emu: number | null | undefined): number {
  return Math.round((emu ?? 0) / 12700);
}

function formatElementSummary(el: slides_v1.Schema$PageElement, index: number): string {
  const id = el.objectId ?? 'unknown';
  const x = emuToPoints(el.transform?.translateX);
  const y = emuToPoints(el.transform?.translateY);
  const w = emuToPoints(el.size?.width?.magnitude);
  const h = emuToPoints(el.size?.height?.magnitude);
  const position = `Position: ${x}pt, ${y}pt  Size: ${w}pt × ${h}pt`;

  let type = 'UNKNOWN';
  let extra = '';

  if (el.shape) {
    type = 'SHAPE';
    const text = el.shape.text?.textElements
      ?.filter(te => te.textRun?.content)
      .map(te => te.textRun!.content!)
      .join('')
      .trim() ?? '';
    if (text) extra = `\n   Text: "${text.slice(0, 100)}"`;
  } else if (el.image) {
    type = 'IMAGE';
    const url = el.image.contentUrl ?? el.image.sourceUrl ?? '';
    if (url) extra = `\n   URL: ${url.slice(0, 60)}`;
  } else if (el.table) {
    type = 'TABLE';
    extra = `\n   ${el.table.rows} rows × ${el.table.columns} columns`;
  } else if (el.video) {
    type = 'VIDEO';
    if (el.video.id) extra = `\n   Video ID: ${el.video.id}`;
  } else if (el.line) {
    type = 'LINE';
  } else if (el.wordArt) {
    type = 'WORD ART';
    if (el.wordArt.renderedText) extra = `\n   Text: "${el.wordArt.renderedText}"`;
  } else if (el.sheetsChart) {
    type = 'SHEETS CHART';
    if (el.sheetsChart.spreadsheetId) extra = `\n   Sheet: ${el.sheetsChart.spreadsheetId}`;
  }

  return `${index}. ${type} [${id}]\n   ${position}${extra}`;
}

export async function slideGetTool(
  client: SlidesClient,
  params: SlideGetParams
): Promise<ToolResponse> {
  try {
    const slide = await client.getSlide(params.presentationId, params.slideId);
    const elements = slide.pageElements ?? [];
    const count = elements.length;

    let message = `Slide: ${params.slideId} (${count} element${count !== 1 ? 's' : ''})`;

    if (count > 0) {
      const summaries = elements.map((el, i) => formatElementSummary(el, i + 1));
      message += '\n\n' + summaries.join('\n\n');
    }

    if (params.detailed) {
      message += '\n\n--- Raw Data ---\n' + JSON.stringify(elements, null, 2);
    }

    return createSuccessResponse(message, {
      slideId: params.slideId,
      presentationId: params.presentationId,
      elementCount: count,
      elements,
    });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
