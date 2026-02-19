import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { HEX_COLOR_RE, parseHexColor } from '../shared/format.js';

const VALID_ALIGNMENTS = ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] as const;
type Alignment = typeof VALID_ALIGNMENTS[number];

export interface ElementFormatTextParams {
  presentationId: string;
  elementId: string;
  startIndex?: number;       // inclusive; omit = start of text
  endIndex?: number;         // exclusive; omit = end of text
  // Text style
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;         // points
  fontFamily?: string;
  foregroundColor?: string;  // hex e.g. "#FF0000"
  backgroundColor?: string;  // hex e.g. "#FFFFFF"
  // Paragraph style
  alignment?: Alignment;
  lineSpacing?: number;      // percentage e.g. 150 = 1.5×
  spaceAbove?: number;       // points
  spaceBelow?: number;       // points
  // Bullets
  bulletPreset?: string | null;  // null removes bullets
}

function buildTextRange(startIndex?: number, endIndex?: number): object {
  if (startIndex == null && endIndex == null) return { type: 'ALL' };
  if (startIndex != null && endIndex == null) return { type: 'FROM_START_INDEX', startIndex };
  return { type: 'FIXED_RANGE', startIndex: startIndex ?? 0, endIndex };
}

export async function elementFormatTextTool(
  client: SlidesClient,
  params: ElementFormatTextParams
): Promise<ToolResponse> {
  const {
    presentationId, elementId,
    startIndex, endIndex,
    bold, italic, underline, strikethrough,
    fontSize, fontFamily, foregroundColor, backgroundColor,
    alignment, lineSpacing, spaceAbove, spaceBelow,
    bulletPreset,
  } = params;

  const hasTextStyle = bold != null || italic != null || underline != null || strikethrough != null
    || fontSize != null || fontFamily != null || foregroundColor != null || backgroundColor != null;
  const hasParagraphStyle = alignment != null || lineSpacing != null || spaceAbove != null || spaceBelow != null;
  const hasBullets = bulletPreset !== undefined;

  if (!hasTextStyle && !hasParagraphStyle && !hasBullets) {
    return createErrorResponse('validation', 'At least one formatting property must be provided');
  }

  if (foregroundColor != null && !HEX_COLOR_RE.test(foregroundColor)) {
    return createErrorResponse('validation', `Invalid foreground color: ${foregroundColor}. Use hex format, e.g. "#FF0000"`);
  }
  if (backgroundColor != null && !HEX_COLOR_RE.test(backgroundColor)) {
    return createErrorResponse('validation', `Invalid background color: ${backgroundColor}. Use hex format, e.g. "#FFFFFF"`);
  }
  if (alignment != null && !(VALID_ALIGNMENTS as readonly string[]).includes(alignment)) {
    return createErrorResponse('validation', `Invalid alignment: ${alignment}. Must be one of: ${VALID_ALIGNMENTS.join(', ')}`);
  }
  if (fontSize != null && fontSize <= 0) {
    return createErrorResponse('validation', `Invalid fontSize: ${fontSize}. Must be greater than 0`);
  }

  try {
    const textRange = buildTextRange(startIndex, endIndex);
    const requests: any[] = [];

    if (hasTextStyle) {
      const style: Record<string, any> = {};
      const fields: string[] = [];

      if (bold != null)        { style.bold = bold; fields.push('bold'); }
      if (italic != null)      { style.italic = italic; fields.push('italic'); }
      if (underline != null)   { style.underline = underline; fields.push('underline'); }
      if (strikethrough != null) { style.strikethrough = strikethrough; fields.push('strikethrough'); }
      if (fontSize != null)    { style.fontSize = { magnitude: fontSize, unit: 'PT' }; fields.push('fontSize'); }
      if (fontFamily != null)  { style.weightedFontFamily = { fontFamily }; fields.push('weightedFontFamily'); }
      if (foregroundColor != null) {
        style.foregroundColor = { opaqueColor: { rgbColor: parseHexColor(foregroundColor) } };
        fields.push('foregroundColor');
      }
      if (backgroundColor != null) {
        style.backgroundColor = { opaqueColor: { rgbColor: parseHexColor(backgroundColor) } };
        fields.push('backgroundColor');
      }

      requests.push({
        updateTextStyle: { objectId: elementId, textRange, style, fields: fields.join(',') },
      });
    }

    if (hasParagraphStyle) {
      const style: Record<string, any> = {};
      const fields: string[] = [];

      if (alignment != null)   { style.alignment = alignment; fields.push('alignment'); }
      if (lineSpacing != null) { style.lineSpacing = lineSpacing; fields.push('lineSpacing'); }
      if (spaceAbove != null)  { style.spaceAbove = { magnitude: spaceAbove, unit: 'PT' }; fields.push('spaceAbove'); }
      if (spaceBelow != null)  { style.spaceBelow = { magnitude: spaceBelow, unit: 'PT' }; fields.push('spaceBelow'); }

      requests.push({
        updateParagraphStyle: { objectId: elementId, textRange, style, fields: fields.join(',') },
      });
    }

    if (hasBullets) {
      if (bulletPreset === null) {
        requests.push({ deleteParagraphBullets: { objectId: elementId, textRange } });
      } else {
        requests.push({ createParagraphBullets: { objectId: elementId, textRange, bulletPreset } });
      }
    }

    await client.batchUpdate(presentationId, requests);

    const applied: string[] = [];
    if (bold != null)          applied.push(bold ? 'bold' : 'not bold');
    if (italic != null)        applied.push(italic ? 'italic' : 'not italic');
    if (underline != null)     applied.push(underline ? 'underline' : 'no underline');
    if (strikethrough != null) applied.push(strikethrough ? 'strikethrough' : 'no strikethrough');
    if (fontSize != null)      applied.push(`${fontSize}pt`);
    if (fontFamily != null)    applied.push(`font: ${fontFamily}`);
    if (foregroundColor != null) applied.push(`color ${foregroundColor}`);
    if (backgroundColor != null) applied.push(`bg ${backgroundColor}`);
    if (alignment != null)     applied.push(`align ${alignment.toLowerCase()}`);
    if (lineSpacing != null)   applied.push(`${lineSpacing}% spacing`);
    if (spaceAbove != null)    applied.push(`${spaceAbove}pt above`);
    if (spaceBelow != null)    applied.push(`${spaceBelow}pt below`);
    if (bulletPreset === null) applied.push('removed bullets');
    else if (bulletPreset != null) applied.push(`bullets: ${bulletPreset}`);

    const rangeDesc = startIndex != null || endIndex != null
      ? ` (chars ${startIndex ?? 0}–${endIndex ?? 'end'})`
      : '';

    return createSuccessResponse(
      formatResponse('simple', `Formatted ${elementId}${rangeDesc}: ${applied.join(', ')}`),
      { elementId, applied }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
