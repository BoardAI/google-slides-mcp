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
