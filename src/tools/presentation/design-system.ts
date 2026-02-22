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

// ─── Typography ───────────────────────────────────────────────────────────────

const TYPOGRAPHY_PLACEHOLDERS = ['TITLE', 'CENTERED_TITLE', 'SUBTITLE', 'BODY'] as const;
type PlaceholderRole = typeof TYPOGRAPHY_PLACEHOLDERS[number];

interface TypographyStyle {
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  color?: string;
  lineSpacing?: number;
  spaceAbovePt?: number;
  spaceBelowPt?: number;
}

type TypographyMap = Partial<Record<Lowercase<PlaceholderRole>, TypographyStyle>>;

export function extractTypography(layouts: any[], masters: any[]): TypographyMap {
  const result: TypographyMap = {};

  function processPages(pages: any[]) {
    for (const page of pages) {
      for (const el of page.pageElements ?? []) {
        const ph = el.shape?.placeholder?.type as PlaceholderRole | undefined;
        if (!ph || !(TYPOGRAPHY_PLACEHOLDERS as readonly string[]).includes(ph)) continue;

        const key = ph.toLowerCase() as Lowercase<PlaceholderRole>;
        if (result[key]) continue;

        const textElements = el.shape?.text?.textElements ?? [];

        const paraMarker = textElements.find((te: any) => te.paragraphMarker?.paragraphStyle);
        const paraStyle = paraMarker?.paragraphMarker?.paragraphStyle ?? {};

        const textRun = textElements.find((te: any) => te.textRun?.style?.fontFamily || te.textRun?.style?.fontSize);
        const runStyle = textRun?.textRun?.style ?? {};

        if (!runStyle.fontFamily && !runStyle.fontSize) continue;

        const rgb = runStyle.foregroundColor?.rgbColor;

        result[key] = {
          fontFamily: runStyle.fontFamily ?? undefined,
          fontSizePt: runStyle.fontSize?.magnitude ?? undefined,
          bold: runStyle.bold ?? false,
          color: rgb ? rgbToHex(rgb.red, rgb.green, rgb.blue) : undefined,
          lineSpacing: paraStyle.lineSpacing ?? undefined,
          spaceAbovePt: paraStyle.spaceAbove?.magnitude ?? undefined,
          spaceBelowPt: paraStyle.spaceBelow?.magnitude ?? undefined,
        };
      }
    }
  }

  processPages(layouts);
  processPages(masters);

  return result;
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

// ─── Shape styles ─────────────────────────────────────────────────────────────

interface Insets { top: number; right: number; bottom: number; left: number }

interface ShapeStyleEntry {
  fillColor?: string;
  borderColor?: string;
  borderWidthPt?: number;
  dashStyle?: string;
  shadowBlurPt?: number;
  shadowColor?: string;
  shadowOffsetXPt?: number;
  shadowOffsetYPt?: number;
  verticalAlignment?: string;
  paddingPt?: Insets;
  count: number;
}

export function extractShapeStyles(slides: any[]): ShapeStyleEntry[] {
  const groups = new Map<string, { entry: Omit<ShapeStyleEntry, 'count'>; count: number }>();

  for (const slide of slides) {
    for (const el of slide.pageElements ?? []) {
      if (!el.shape) continue;
      const sp = el.shape.shapeProperties ?? {};

      const fillRgb = sp.shapeBackgroundFill?.solidFill?.color?.rgbColor;
      const fillColor = fillRgb ? rgbToHex(fillRgb.red, fillRgb.green, fillRgb.blue) : undefined;

      const outlineRgb = sp.outline?.outlineFill?.solidFill?.color?.rgbColor;
      const borderColor = outlineRgb ? rgbToHex(outlineRgb.red, outlineRgb.green, outlineRgb.blue) : undefined;
      const borderWidthPt = sp.outline?.weight?.magnitude != null
        ? emuToPoints(sp.outline.weight.magnitude)
        : undefined;
      const dashStyle: string | undefined = sp.outline?.dashStyle ?? undefined;

      if (!fillColor && !borderColor) continue;

      const shadow = sp.shadow;
      const shadowRgb = shadow?.color?.rgbColor;
      const shadowColor = shadowRgb ? rgbToHex(shadowRgb.red, shadowRgb.green, shadowRgb.blue) : undefined;
      const shadowBlurPt = shadow?.blurRadius?.magnitude != null
        ? emuToPoints(shadow.blurRadius.magnitude)
        : undefined;
      const shadowOffsetXPt = shadow?.transform?.translateX != null
        ? emuToPoints(shadow.transform.translateX)
        : undefined;
      const shadowOffsetYPt = shadow?.transform?.translateY != null
        ? emuToPoints(shadow.transform.translateY)
        : undefined;

      const ci = sp.contentInsets;
      const paddingPt: Insets | undefined = ci ? {
        top: ci.top?.magnitude ?? 0,
        right: ci.right?.magnitude ?? 0,
        bottom: ci.bottom?.magnitude ?? 0,
        left: ci.left?.magnitude ?? 0,
      } : undefined;

      const verticalAlignment: string | undefined = sp.contentAlignment ?? undefined;

      const entry = { fillColor, borderColor, borderWidthPt, dashStyle, shadowBlurPt, shadowColor, shadowOffsetXPt, shadowOffsetYPt, verticalAlignment, paddingPt };
      const fingerprint = JSON.stringify(entry);

      const existing = groups.get(fingerprint);
      if (existing) {
        existing.count++;
      } else {
        groups.set(fingerprint, { entry, count: 1 });
      }
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ entry, count }) => ({ ...entry, count }));
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

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutResult {
  widthPt: number;
  heightPt: number;
  marginLeftPt: number;
  marginTopPt: number;
  marginRightPt: number;
  marginBottomPt: number;
  verticalRhythmPt: number | null;
}

export function extractLayout(pageSize: any, slides: any[]): LayoutResult {
  const widthPt = emuToPoints(pageSize?.width?.magnitude);
  const heightPt = emuToPoints(pageSize?.height?.magnitude);

  let minX = Infinity, minY = Infinity, maxRight = 0, maxBottom = 0;
  const gaps: number[] = [];

  for (const slide of slides) {
    const elements = (slide.pageElements ?? [])
      .filter((el: any) => el.transform?.translateX != null);

    const sorted = [...elements].sort((a: any, b: any) =>
      (a.transform?.translateY ?? 0) - (b.transform?.translateY ?? 0)
    );

    for (let i = 0; i < sorted.length; i++) {
      const el = sorted[i];
      const x = emuToPoints(el.transform?.translateX ?? 0);
      const y = emuToPoints(el.transform?.translateY ?? 0);
      const w = emuToPoints(el.size?.width?.magnitude ?? 0);
      const h = emuToPoints(el.size?.height?.magnitude ?? 0);

      if (x > 0) minX = Math.min(minX, x);
      if (y > 0) minY = Math.min(minY, y);
      if (x + w > 0) maxRight = Math.max(maxRight, x + w);
      if (y + h > 0) maxBottom = Math.max(maxBottom, y + h);

      if (i > 0) {
        const prevEl = sorted[i - 1];
        const prevBottom = emuToPoints((prevEl.transform?.translateY ?? 0) + (prevEl.size?.height?.magnitude ?? 0));
        const gap = y - prevBottom;
        if (gap > 0) gaps.push(Math.round(gap));
      }
    }
  }

  return {
    widthPt,
    heightPt,
    marginLeftPt: isFinite(minX) ? minX : 0,
    marginTopPt: isFinite(minY) ? minY : 0,
    marginRightPt: widthPt - maxRight > 0 ? widthPt - maxRight : 0,
    marginBottomPt: heightPt - maxBottom > 0 ? heightPt - maxBottom : 0,
    verticalRhythmPt: modalValue(gaps),
  };
}
