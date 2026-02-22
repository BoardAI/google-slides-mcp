import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { parseHexColor, buildTextRange } from '../shared/format.js';
import { validateHexColor, validateAlignment, validatePositiveNumber, Alignment } from '../../utils/validators.js';

// ─── tableSetCellTool ────────────────────────────────────────────────────────

export interface TableSetCellParams {
  presentationId: string;
  tableId: string;
  row: number;
  column: number;
  text: string;
}

export async function tableSetCellTool(
  client: SlidesClient,
  params: TableSetCellParams
): Promise<ToolResponse> {
  const { presentationId, tableId, row, column, text } = params;

  const cellLocation = { rowIndex: row, columnIndex: column };

  try {
    // Always include deleteText to clear existing content. The Google Slides
    // API handles this gracefully even for empty cells.
    const requests: any[] = [
      {
        deleteText: {
          objectId: tableId,
          cellLocation,
          textRange: { type: 'ALL' },
        },
      },
    ];

    if (text !== '') {
      requests.push({
        insertText: {
          objectId: tableId,
          cellLocation,
          text,
          insertionIndex: 0,
        },
      });
    }

    await client.batchUpdate(presentationId, requests);
    return createSuccessResponse(
      formatResponse('simple', `Set cell [${row},${column}] in table ${tableId}`),
      { tableId, row, column }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

// ─── tableFormatCellTextTool ─────────────────────────────────────────────────

export interface TableFormatCellTextParams {
  presentationId: string;
  tableId: string;
  row: number;
  column: number;
  startIndex?: number;
  endIndex?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  alignment?: Alignment;
}

export async function tableFormatCellTextTool(
  client: SlidesClient,
  params: TableFormatCellTextParams
): Promise<ToolResponse> {
  const {
    presentationId, tableId, row, column,
    startIndex, endIndex,
    bold, italic, underline, strikethrough,
    fontSize, fontFamily, foregroundColor, backgroundColor,
    alignment,
  } = params;

  const hasTextStyle =
    bold != null || italic != null || underline != null || strikethrough != null ||
    fontSize != null || fontFamily != null || foregroundColor != null || backgroundColor != null;
  const hasParagraphStyle = alignment != null;

  if (!hasTextStyle && !hasParagraphStyle) {
    return createErrorResponse('validation', 'At least one formatting property must be provided');
  }

  const errFg = validateHexColor(foregroundColor, 'foregroundColor');
  if (errFg) return createErrorResponse('validation', errFg);
  const errBg = validateHexColor(backgroundColor, 'backgroundColor');
  if (errBg) return createErrorResponse('validation', errBg);
  const errAlign = validateAlignment(alignment);
  if (errAlign) return createErrorResponse('validation', errAlign);
  const errSize = validatePositiveNumber(fontSize, 'fontSize');
  if (errSize) return createErrorResponse('validation', errSize);

  try {
    const textRange = buildTextRange(startIndex, endIndex);
    const cellLocation = { rowIndex: row, columnIndex: column };
    const requests: any[] = [];

    if (hasTextStyle) {
      const style: Record<string, any> = {};
      const fields: string[] = [];

      if (bold != null)            { style.bold = bold; fields.push('bold'); }
      if (italic != null)          { style.italic = italic; fields.push('italic'); }
      if (underline != null)       { style.underline = underline; fields.push('underline'); }
      if (strikethrough != null)   { style.strikethrough = strikethrough; fields.push('strikethrough'); }
      if (fontSize != null)        { style.fontSize = { magnitude: fontSize, unit: 'PT' }; fields.push('fontSize'); }
      if (fontFamily != null)      { style.weightedFontFamily = { fontFamily }; fields.push('weightedFontFamily'); }
      if (foregroundColor != null) {
        style.foregroundColor = { opaqueColor: { rgbColor: parseHexColor(foregroundColor) } };
        fields.push('foregroundColor');
      }
      if (backgroundColor != null) {
        style.backgroundColor = { opaqueColor: { rgbColor: parseHexColor(backgroundColor) } };
        fields.push('backgroundColor');
      }

      requests.push({
        updateTextStyle: {
          objectId: tableId,
          cellLocation,
          textRange,
          style,
          fields: fields.join(','),
        },
      });
    }

    if (hasParagraphStyle) {
      requests.push({
        updateParagraphStyle: {
          objectId: tableId,
          cellLocation,
          textRange,
          style: { alignment },
          fields: 'alignment',
        },
      });
    }

    await client.batchUpdate(presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Formatted cell [${row},${column}] in table ${tableId}`)
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

// ─── tableStyleCellTool ──────────────────────────────────────────────────────

export interface TableStyleCellParams {
  presentationId: string;
  tableId: string;
  row: number;
  column: number;
  rowSpan?: number;
  columnSpan?: number;
  backgroundColor?: string;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
}

export async function tableStyleCellTool(
  client: SlidesClient,
  params: TableStyleCellParams
): Promise<ToolResponse> {
  const {
    presentationId, tableId, row, column,
    rowSpan = 1, columnSpan = 1,
    backgroundColor,
    paddingTop, paddingBottom, paddingLeft, paddingRight,
  } = params;

  const hasBackground = backgroundColor != null;
  const hasPadding =
    paddingTop != null || paddingBottom != null || paddingLeft != null || paddingRight != null;

  if (!hasBackground && !hasPadding) {
    return createErrorResponse(
      'validation',
      'At least one of backgroundColor or padding properties must be provided'
    );
  }

  const errBg2 = validateHexColor(backgroundColor, 'backgroundColor');
  if (errBg2) return createErrorResponse('validation', errBg2);

  try {
    const tableCellProperties: Record<string, any> = {};
    const fields: string[] = [];

    if (hasBackground) {
      tableCellProperties.tableCellBackgroundFill = {
        solidFill: {
          color: {
            rgbColor: parseHexColor(backgroundColor!),
          },
        },
      };
      fields.push('tableCellBackgroundFill.solidFill');
    }

    if (hasPadding) {
      const contentInsets: Record<string, any> = {};
      if (paddingTop != null)    contentInsets.top    = { magnitude: paddingTop,    unit: 'PT' };
      if (paddingBottom != null) contentInsets.bottom = { magnitude: paddingBottom, unit: 'PT' };
      if (paddingLeft != null)   contentInsets.left   = { magnitude: paddingLeft,   unit: 'PT' };
      if (paddingRight != null)  contentInsets.right  = { magnitude: paddingRight,  unit: 'PT' };
      tableCellProperties.contentInsets = contentInsets;
      fields.push('contentInsets');
    }

    const requests: any[] = [
      {
        updateTableCellProperties: {
          objectId: tableId,
          tableRange: {
            location: { rowIndex: row, columnIndex: column },
            rowSpan,
            columnSpan,
          },
          tableCellProperties,
          fields: fields.join(','),
        },
      },
    ];

    await client.batchUpdate(presentationId, requests);

    return createSuccessResponse(
      formatResponse('simple', `Styled cell [${row},${column}] in table ${tableId}`)
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
