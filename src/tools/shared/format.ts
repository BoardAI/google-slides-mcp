import { slides_v1 } from '@googleapis/slides';

export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function parseHexColor(hex: string): { red: number; green: number; blue: number } {
  return {
    red: parseInt(hex.slice(1, 3), 16) / 255,
    green: parseInt(hex.slice(3, 5), 16) / 255,
    blue: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

export function emuToPoints(emu: number | null | undefined): number {
  return Math.round((emu ?? 0) / 12700);
}

export function formatElementSummary(el: slides_v1.Schema$PageElement, index?: number): string {
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

  const prefix = index !== undefined ? `${index}. ` : '';
  return `${prefix}${type} [${id}]\n   ${position}${extra}`;
}
