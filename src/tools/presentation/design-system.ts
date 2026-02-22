import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/response.js';
import { emuToPoints } from '../shared/format.js';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function rgbToHex(r: number = 0, g: number = 0, b: number = 0): string {
  return '#' + [r, g, b]
    .map(c => Math.round((c ?? 0) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export function modalValue(values: number[]): number | null {
  if (values.length === 0) return null;
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = values[0], bestCount = 0;
  for (const [v, count] of freq) if (count > bestCount) { best = v; bestCount = count; }
  return best;
}

// ─── Type scale ───────────────────────────────────────────────────────────────

const AMBER_FILL = '#F5B73B';

export interface TypeScaleEntry {
  sizePt: number;
  fontFamily: string;
  bold: boolean;
  color?: string;
  occurrences: number;
  roles: string[];
  context: string;
}

function inferTypeContext(
  roles: string[],
  occurrences: number,
  maxFreeformOccurrences: number,
): string {
  if (roles.includes('placeholder:TITLE') || roles.includes('placeholder:CENTERED_TITLE')) return 'slide title';
  if (roles.includes('placeholder:SUBTITLE')) return 'subtitle';
  if (roles.includes('placeholder:BODY')) return 'body text';
  if (roles.some(r => r === 'freeform:amber')) return 'callout label';
  if (occurrences === maxFreeformOccurrences && maxFreeformOccurrences > 0) return 'body';
  return 'supporting text';
}

export function extractTypeScale(slides: any[]): TypeScaleEntry[] {
  const groups = new Map<string, {
    sizePt: number;
    fontFamily: string;
    bold: boolean;
    color?: string;
    occurrences: number;
    roles: Set<string>;
  }>();

  for (const slide of slides) {
    for (const el of slide.pageElements ?? []) {
      if (!el.shape) continue;

      const placeholderType: string | undefined = el.shape?.placeholder?.type;
      const fillRgb = el.shape.shapeProperties?.shapeBackgroundFill?.solidFill?.color?.rgbColor;
      const fillColor = fillRgb ? rgbToHex(fillRgb.red, fillRgb.green, fillRgb.blue) : undefined;
      const seenInElement = new Set<string>();

      for (const te of el.shape.text?.textElements ?? []) {
        const run = te.textRun;
        if (!run?.content?.trim()) continue;

        const style = run.style ?? {};
        const sizePt: number = style.fontSize?.magnitude ?? 0;
        const fontFamily: string = style.fontFamily ?? style.weightedFontFamily?.fontFamily ?? '';
        const bold: boolean = style.bold ?? false;
        const rgb = style.foregroundColor?.rgbColor;
        const color: string | undefined = rgb ? rgbToHex(rgb.red, rgb.green, rgb.blue) : undefined;

        if (!sizePt || !fontFamily) continue;

        const role = placeholderType
          ? `placeholder:${placeholderType}`
          : fillColor === AMBER_FILL ? 'freeform:amber' : 'freeform';

        const fingerprint = `${sizePt}|${fontFamily}|${bold}|${color ?? ''}`;
        if (seenInElement.has(fingerprint)) continue;
        seenInElement.add(fingerprint);

        const existing = groups.get(fingerprint);
        if (existing) {
          existing.occurrences++;
          existing.roles.add(role);
        } else {
          groups.set(fingerprint, { sizePt, fontFamily, bold, color, occurrences: 1, roles: new Set([role]) });
        }
      }
    }
  }

  const entries = Array.from(groups.values()).filter(e => e.occurrences >= 2);

  const maxFreeformOccurrences = Math.max(
    0,
    ...entries
      .filter(e => [...e.roles].every(r => r === 'freeform'))
      .map(e => e.occurrences),
  );

  return entries
    .map(e => ({
      sizePt: e.sizePt,
      fontFamily: e.fontFamily,
      bold: e.bold,
      color: e.color,
      occurrences: e.occurrences,
      roles: [...e.roles],
      context: inferTypeContext([...e.roles], e.occurrences, maxFreeformOccurrences),
    }))
    .sort((a, b) => b.sizePt - a.sizePt);
}

// ─── Lists ────────────────────────────────────────────────────────────────────

const BULLET_GLYPH_TYPES = new Set(['DISC', 'CIRCLE', 'SQUARE', 'ARROW', 'DIAMOND']);
const NUMBERED_GLYPH_TYPES = new Set(['DECIMAL', 'ZERO_DECIMAL', 'UPPER_ALPHA', 'ALPHA', 'UPPER_ROMAN', 'ROMAN']);

interface ListLevel {
  level: number;
  glyphType: string;
  glyphFormat?: string;
  indentPt: number;
}

interface ListStyle {
  glyphType: string;
  indentPt: number;
  levels: ListLevel[];
}

interface ListsMap {
  bullet?: ListStyle;
  numbered?: ListStyle;
}

export function extractLists(slides: any[], masters: any[], layouts: any[]): ListsMap {
  const result: ListsMap = {};

  function processPageLists(listsMap: Record<string, any>) {
    for (const listDef of Object.values(listsMap)) {
      const nestingLevel: Record<string, any> = listDef.listProperties?.nestingLevel ?? {};
      const levels: ListLevel[] = Object.entries(nestingLevel)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([lvl, style]: [string, any]) => ({
          level: Number(lvl),
          glyphType: style.bulletStyle?.glyphType ?? 'UNKNOWN',
          glyphFormat: style.bulletStyle?.glyphFormat ?? undefined,
          indentPt: style.bulletStyle?.indentStart?.magnitude ?? 0,
        }));

      if (levels.length === 0) continue;
      const topGlyph = levels[0].glyphType;

      if (BULLET_GLYPH_TYPES.has(topGlyph) && !result.bullet) {
        result.bullet = { glyphType: topGlyph, indentPt: levels[0].indentPt, levels };
      } else if (NUMBERED_GLYPH_TYPES.has(topGlyph) && !result.numbered) {
        result.numbered = { glyphType: topGlyph, indentPt: levels[0].indentPt, levels };
      }
    }
  }

  for (const page of [...slides, ...masters, ...layouts]) {
    if (page.lists) processPageLists(page.lists);
    if (result.bullet && result.numbered) break;
  }

  return result;
}

// ─── Annotated shape styles ───────────────────────────────────────────────────

interface Insets { top: number; right: number; bottom: number; left: number }

const DARK_FILLS = new Set(['#060C14', '#280818', '#5B001F']);
const SLATE_BORDER = '#8598A7';
const NEAR_WHITE_MIN = 0xF0;

function isNearWhite(hex: string): boolean {
  return (
    parseInt(hex.slice(1, 3), 16) >= NEAR_WHITE_MIN &&
    parseInt(hex.slice(3, 5), 16) >= NEAR_WHITE_MIN &&
    parseInt(hex.slice(5, 7), 16) >= NEAR_WHITE_MIN
  );
}

function isDarkColor(hex: string): boolean {
  const avg = (parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)) / 3;
  return avg < 100;
}

function inferShapeRole(fillColor: string | null, borderColor: string | undefined): string {
  if (!fillColor) return borderColor === SLATE_BORDER ? 'slate-ghost' : 'ghost';
  if (DARK_FILLS.has(fillColor)) return 'dark-panel';
  if (fillColor === AMBER_FILL) return 'callout';
  if (isNearWhite(fillColor)) {
    if (borderColor && isDarkColor(borderColor)) return 'card';
    return 'subtle-card';
  }
  return 'shape';
}

export interface AnnotatedShapeStyle {
  fillColor: string | null;
  borderColor?: string;
  borderWidthPt?: number;
  dashStyle?: string;
  shapeType?: string;
  shadowBlurPt?: number;
  shadowColor?: string;
  verticalAlignment?: string;
  count: number;
  inferredRole: string;
}

export function extractAnnotatedShapeStyles(slides: any[]): Record<string, AnnotatedShapeStyle> {
  const groups = new Map<string, { style: Omit<AnnotatedShapeStyle, 'count' | 'inferredRole'>; count: number }>();

  for (const slide of slides) {
    for (const el of slide.pageElements ?? []) {
      if (!el.shape) continue;
      const sp = el.shape.shapeProperties ?? {};

      const fillRgb = sp.shapeBackgroundFill?.solidFill?.color?.rgbColor;
      const fillColor = fillRgb ? rgbToHex(fillRgb.red, fillRgb.green, fillRgb.blue) : null;

      const outlineRgb = sp.outline?.outlineFill?.solidFill?.color?.rgbColor;
      const borderColor = outlineRgb ? rgbToHex(outlineRgb.red, outlineRgb.green, outlineRgb.blue) : undefined;

      if (fillColor === null && !borderColor) continue;

      const borderWidthPt = sp.outline?.weight?.magnitude != null
        ? emuToPoints(sp.outline.weight.magnitude) : undefined;
      const dashStyle: string | undefined = sp.outline?.dashStyle ?? undefined;
      const shapeType: string | undefined = el.shape.shapeType ?? undefined;

      const shadow = sp.shadow;
      const shadowRgb = shadow?.color?.rgbColor;
      const shadowColor = shadowRgb ? rgbToHex(shadowRgb.red, shadowRgb.green, shadowRgb.blue) : undefined;
      const shadowBlurPt = shadow?.blurRadius?.magnitude != null
        ? emuToPoints(shadow.blurRadius.magnitude) : undefined;
      const verticalAlignment: string | undefined = sp.contentAlignment ?? undefined;

      const style = { fillColor, borderColor, borderWidthPt, dashStyle, shapeType, shadowColor, shadowBlurPt, verticalAlignment };
      const fingerprint = JSON.stringify(style);

      const existing = groups.get(fingerprint);
      if (existing) { existing.count++; }
      else { groups.set(fingerprint, { style, count: 1 }); }
    }
  }

  const result: Record<string, AnnotatedShapeStyle> = {};
  for (const { style, count } of [...groups.values()].sort((a, b) => b.count - a.count)) {
    const role = inferShapeRole(style.fillColor, style.borderColor);
    let key = role;
    let suffix = 2;
    while (key in result) key = `${role}-${suffix++}`;
    result[key] = { ...style, count, inferredRole: role };
  }
  return result;
}

// ─── Table styles ─────────────────────────────────────────────────────────────

interface TableStyles {
  found: boolean;
  headerFill?: string;
  rowFill?: string;
  alternateFill?: string;
  borderColor?: string;
  borderWidthPt?: number;
  dashStyle?: string;
  defaultColumnWidthPt?: number;
  defaultRowHeightPt?: number;
  cellPaddingPt?: Insets;
}

export function extractTableStyles(slides: any[]): TableStyles {
  for (const slide of slides) {
    for (const el of slide.pageElements ?? []) {
      if (!el.table) continue;
      const table = el.table;
      const rows: any[] = table.tableRows ?? [];
      const cols: any[] = table.tableColumns ?? [];

      function cellFill(rowIdx: number): string | undefined {
        const cell = rows[rowIdx]?.tableCells?.[0];
        const rgb = cell?.tableCellProperties?.tableCellBackgroundFill?.solidFill?.color?.rgbColor;
        return rgb ? rgbToHex(rgb.red, rgb.green, rgb.blue) : undefined;
      }

      const headerFill = cellFill(0);
      const rowFill = cellFill(1);
      const altFill = cellFill(2);
      const alternateFill = altFill !== rowFill ? altFill : undefined;

      const borderCell = table.horizontalBorderRows?.[0]?.tableBorderCells?.[0]?.tableBorderProperties;
      const borderRgb = borderCell?.borderFill?.solidFill?.color?.rgbColor;
      const borderColor = borderRgb ? rgbToHex(borderRgb.red, borderRgb.green, borderRgb.blue) : undefined;
      const borderWidthPt = borderCell?.weight?.magnitude != null
        ? emuToPoints(borderCell.weight.magnitude)
        : undefined;
      const dashStyle: string | undefined = borderCell?.dashStyle ?? undefined;

      const defaultColumnWidthPt = cols[0]?.columnWidth?.magnitude != null
        ? emuToPoints(cols[0].columnWidth.magnitude)
        : undefined;

      const defaultRowHeightPt = rows[0]?.rowHeight?.magnitude != null
        ? emuToPoints(rows[0].rowHeight.magnitude)
        : undefined;

      const ci = rows[0]?.tableCells?.[0]?.tableCellProperties?.contentInsets;
      const cellPaddingPt: Insets | undefined = ci ? {
        top: ci.top?.magnitude ?? 0,
        right: ci.right?.magnitude ?? 0,
        bottom: ci.bottom?.magnitude ?? 0,
        left: ci.left?.magnitude ?? 0,
      } : undefined;

      return { found: true, headerFill, rowFill, alternateFill, borderColor, borderWidthPt, dashStyle, defaultColumnWidthPt, defaultRowHeightPt, cellPaddingPt };
    }
  }
  return { found: false };
}

// ─── Colors ───────────────────────────────────────────────────────────────────

interface ColorsResult {
  fills: string[];
  text: string[];
  backgrounds: string[];
  borders: string[];
}

export function extractColors(slides: any[]): ColorsResult {
  const fills = new Set<string>();
  const text = new Set<string>();
  const backgrounds = new Set<string>();
  const borders = new Set<string>();

  function addRgb(set: Set<string>, rgb: any) {
    if (rgb) set.add(rgbToHex(rgb.red, rgb.green, rgb.blue));
  }

  for (const slide of slides) {
    addRgb(backgrounds, slide.pageProperties?.pageBackgroundFill?.solidFill?.color?.rgbColor);

    for (const el of slide.pageElements ?? []) {
      if (el.shape) {
        const sp = el.shape.shapeProperties ?? {};
        addRgb(fills, sp.shapeBackgroundFill?.solidFill?.color?.rgbColor);
        addRgb(borders, sp.outline?.outlineFill?.solidFill?.color?.rgbColor);
        for (const te of el.shape.text?.textElements ?? []) {
          addRgb(text, te.textRun?.style?.foregroundColor?.rgbColor);
        }
      }
      if (el.line) {
        addRgb(borders, el.line.lineProperties?.lineFill?.solidFill?.color?.rgbColor);
      }
    }
  }

  const unique = (s: Set<string>) => [...s].filter(Boolean);
  return { fills: unique(fills), text: unique(text), backgrounds: unique(backgrounds), borders: unique(borders) };
}

// ─── Column grid ──────────────────────────────────────────────────────────────

export interface ColumnEntry { xPt: number; widthPt: number; }

export interface ColumnGrid {
  columnCount: number;
  columns: ColumnEntry[];
  gutterPt: number | null;
}

export function extractColumnGrid(slides: any[], _widthPt: number): ColumnGrid {
  const ROUND_TO = 4;     // pt — absorb sub-pixel jitter
  const MERGE_WITHIN = 8; // pt — merge nearby X values into one column
  const MIN_FREQ = 2;     // minimum appearances to count as a column

  // Map from bucket key → { rawXs, widths }
  const xBuckets = new Map<number, { rawXs: number[]; widths: number[] }>();

  for (const slide of slides) {
    for (const el of slide.pageElements ?? []) {
      if (!el.transform?.translateX) continue;
      const rawX = emuToPoints(el.transform.translateX);
      const bucketKey = Math.round(rawX / ROUND_TO) * ROUND_TO;
      const wPt = emuToPoints(el.size?.width?.magnitude ?? 0);
      if (bucketKey <= 0 || wPt <= 0) continue;
      const bucket = xBuckets.get(bucketKey) ?? { rawXs: [], widths: [] };
      bucket.rawXs.push(rawX);
      bucket.widths.push(wPt);
      xBuckets.set(bucketKey, bucket);
    }
  }

  const candidates = [...xBuckets.entries()]
    .filter(([, { widths }]) => widths.length >= MIN_FREQ)
    .sort(([a], [b]) => a - b)
    .map(([, { rawXs, widths }]) => ({
      xPt: Math.round(rawXs.reduce((a, b) => a + b, 0) / rawXs.length),
      widths,
    }));

  if (candidates.length === 0) return { columnCount: 1, columns: [], gutterPt: null };

  // Merge X values within MERGE_WITHIN pt
  const merged: Array<{ xPt: number; widths: number[] }> = [];
  for (const { xPt: x, widths } of candidates) {
    const last = merged[merged.length - 1];
    if (last && x - last.xPt <= MERGE_WITHIN) {
      last.widths.push(...widths);
    } else {
      merged.push({ xPt: x, widths });
    }
  }

  if (merged.length <= 1) return { columnCount: 1, columns: [], gutterPt: null };

  const columns: ColumnEntry[] = merged.map(({ xPt, widths }) => ({
    xPt,
    widthPt: modalValue(widths) ?? widths[0],
  }));

  const gutters: number[] = [];
  for (let i = 1; i < columns.length; i++) {
    const g = columns[i].xPt - (columns[i - 1].xPt + columns[i - 1].widthPt);
    if (g > 0) gutters.push(g);
  }
  const gutterPt = gutters.length > 0
    ? Math.round(gutters.reduce((a, b) => a + b, 0) / gutters.length)
    : null;

  return { columnCount: columns.length, columns, gutterPt };
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutResult {
  widthPt: number;
  heightPt: number;
  marginLeftPt: number;
  marginTopPt: number;
  marginRightPt: number;
  marginBottomPt: number;
  spacingScale: number[];
  placeholderSpacing: Record<string, number>;
}

function gapBetween(prev: any, curr: any): number {
  const prevBottom = emuToPoints((prev.transform?.translateY ?? 0) + (prev.size?.height?.magnitude ?? 0));
  const y = emuToPoints(curr.transform?.translateY ?? 0);
  return Math.round(y - prevBottom);
}

function buildSpacingScale(gaps: number[]): number[] {
  const MIN_GAP_PT = 2;
  const MAX_SCALE_SIZE = 8;
  const freq = new Map<number, number>();
  for (const gap of gaps) {
    if (gap < MIN_GAP_PT) continue;
    freq.set(gap, (freq.get(gap) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SCALE_SIZE)
    .map(([pt]) => pt)
    .sort((a, b) => a - b);
}

export function extractLayout(pageSize: any, slides: any[]): LayoutResult {
  const widthPt = emuToPoints(pageSize?.width?.magnitude);
  const heightPt = emuToPoints(pageSize?.height?.magnitude);

  let minX = Infinity, minY = Infinity, maxRight = 0, maxBottom = 0;
  const freeformGaps: number[] = [];
  const placeholderGapLists = new Map<string, number[]>();

  const isPlaceholder = (el: any) => el.shape?.placeholder?.type != null;
  const byY = (a: any, b: any) => (a.transform?.translateY ?? 0) - (b.transform?.translateY ?? 0);

  for (const slide of slides) {
    const elements = (slide.pageElements ?? [])
      .filter((el: any) => el.transform?.translateX != null);

    // Margins from all elements
    for (const el of elements) {
      const x = emuToPoints(el.transform?.translateX ?? 0);
      const y = emuToPoints(el.transform?.translateY ?? 0);
      const w = emuToPoints(el.size?.width?.magnitude ?? 0);
      const h = emuToPoints(el.size?.height?.magnitude ?? 0);
      if (x > 0) minX = Math.min(minX, x);
      if (y > 0) minY = Math.min(minY, y);
      if (x + w > 0) maxRight = Math.max(maxRight, x + w);
      if (y + h > 0) maxBottom = Math.max(maxBottom, y + h);
    }

    // Placeholder gaps: tracked by semantic type pair
    const placeholders = elements.filter(isPlaceholder).sort(byY);
    for (let i = 1; i < placeholders.length; i++) {
      const gap = gapBetween(placeholders[i - 1], placeholders[i]);
      if (gap > 0) {
        const key = `${placeholders[i - 1].shape.placeholder.type}→${placeholders[i].shape.placeholder.type}`;
        const list = placeholderGapLists.get(key) ?? [];
        list.push(gap);
        placeholderGapLists.set(key, list);
      }
    }

    // Freeform gaps: all non-placeholder elements
    const freeforms = elements.filter((el: any) => !isPlaceholder(el)).sort(byY);
    for (let i = 1; i < freeforms.length; i++) {
      const gap = gapBetween(freeforms[i - 1], freeforms[i]);
      if (gap > 0) freeformGaps.push(gap);
    }
  }

  const placeholderSpacing: Record<string, number> = {};
  for (const [key, list] of placeholderGapLists) {
    const modal = modalValue(list);
    if (modal !== null) placeholderSpacing[key] = modal;
  }

  return {
    widthPt,
    heightPt,
    marginLeftPt: isFinite(minX) ? minX : 0,
    marginTopPt: isFinite(minY) ? minY : 0,
    marginRightPt: widthPt - maxRight > 0 ? widthPt - maxRight : 0,
    marginBottomPt: heightPt - maxBottom > 0 ? heightPt - maxBottom : 0,
    spacingScale: buildSpacingScale(freeformGaps),
    placeholderSpacing,
  };
}

// ─── Main tool ────────────────────────────────────────────────────────────────

export interface PresentationGetDesignSystemParams {
  presentationId: string;
}

export async function presentationGetDesignSystemTool(
  client: SlidesClient,
  params: PresentationGetDesignSystemParams
): Promise<ToolResponse> {
  try {
    const presentation = await client.getPresentation(params.presentationId);

    const masters: any[] = (presentation as any).masters ?? [];
    const layouts: any[] = (presentation as any).layouts ?? [];
    const slides: any[] = presentation.slides ?? [];

    const typography = extractTypeScale(slides);
    const lists = extractLists(slides, masters, layouts);
    const shapeStyles = extractAnnotatedShapeStyles(slides);
    const tableStyles = extractTableStyles(slides);
    const colors = extractColors(slides);
    const layout = extractLayout((presentation as any).pageSize, slides);

    const designSystem = {
      slideSize: { widthPt: layout.widthPt, heightPt: layout.heightPt },
      typography,
      lists,
      shapeStyles,
      tableStyles,
      colors,
      layout: {
        marginLeftPt: layout.marginLeftPt,
        marginTopPt: layout.marginTopPt,
        marginRightPt: layout.marginRightPt,
        marginBottomPt: layout.marginBottomPt,
        spacingScale: layout.spacingScale,
        placeholderSpacing: layout.placeholderSpacing,
      },
    };

    const summary = [
      `Design system for "${presentation.title}" (${slides.length} slides)`,
      `Slide size: ${layout.widthPt}×${layout.heightPt}pt`,
      `Type scale entries: ${typography.length}`,
      `List types found: ${Object.keys(lists).join(', ') || 'none'}`,
      `Shape style patterns: ${Object.keys(shapeStyles).length}`,
      `Tables found: ${tableStyles.found}`,
      `Colors — fills: ${colors.fills.length}, text: ${colors.text.length}, backgrounds: ${colors.backgrounds.length}, borders: ${colors.borders.length}`,
      '',
      JSON.stringify(designSystem, null, 2),
    ].join('\n');

    return createSuccessResponse(summary, designSystem);
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
