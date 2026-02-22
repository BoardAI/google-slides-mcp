# Design System Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `presentation_get_design_system` MCP tool that extracts typography, list styles, shape/card styles, table styles, colors, and layout grid from a presentation in a compact token-efficient response.

**Architecture:** One call to `client.getPresentation()` server-side; all processing happens in TypeScript before the response is returned; the raw API blob never enters the conversation. Extraction is organized into pure helper functions that are independently testable.

**Tech Stack:** TypeScript, `@googleapis/slides`, Jest (existing test setup), `src/tools/shared/format.ts` for `emuToPoints`.

---

## Task 1: Helpers — `rgbToHex` and `modalValue`

**Files:**
- Create: `src/tools/presentation/design-system.ts`
- Create: `tests/unit/tools/presentation-design-system.test.ts`

These are pure functions needed by all later extractors.

**Step 1: Write the failing tests**

```ts
// tests/unit/tools/presentation-design-system.test.ts
import { describe, it, expect } from '@jest/globals';
import { rgbToHex, modalValue } from '../../../src/tools/presentation/design-system.js';

describe('rgbToHex', () => {
  it('converts float RGB to uppercase hex', () => {
    expect(rgbToHex(1, 0, 0)).toBe('#FF0000');
  });
  it('rounds fractional values', () => {
    expect(rgbToHex(0.1254, 0.4392, 0.8392)).toBe('#2070D6');
  });
  it('defaults missing channels to 0', () => {
    expect(rgbToHex(undefined, undefined, undefined)).toBe('#000000');
  });
});

describe('modalValue', () => {
  it('returns the most frequent value', () => {
    expect(modalValue([4, 8, 4, 8, 4])).toBe(4);
  });
  it('returns null for empty array', () => {
    expect(modalValue([])).toBeNull();
  });
});
```

**Step 2: Run to verify failure**

```bash
cd /Users/michaelpolansky/Development/google-slides
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: FAIL — module not found.

**Step 3: Create the file with just these helpers**

```ts
// src/tools/presentation/design-system.ts
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
```

**Step 4: Run tests to verify pass**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: add design-system tool skeleton with rgbToHex and modalValue helpers"
```

---

## Task 2: Typography Extractor

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

**Step 1: Write the failing test**

Add to the test file:

```ts
import { extractTypography } from '../../../src/tools/presentation/design-system.js';

describe('extractTypography', () => {
  it('extracts title style from layout placeholder', () => {
    const layouts = [{
      pageElements: [{
        shape: {
          placeholder: { type: 'TITLE' },
          text: {
            textElements: [
              { paragraphMarker: { paragraphStyle: { lineSpacing: 115, spaceAbove: { magnitude: 0, unit: 'PT' }, spaceBelow: { magnitude: 8, unit: 'PT' } } } },
              { textRun: { content: 'Title', style: { fontFamily: 'Google Sans', fontSize: { magnitude: 40, unit: 'PT' }, bold: false, foregroundColor: { rgbColor: { red: 0.125, green: 0.129, blue: 0.141 } } } } },
            ],
          },
        },
      }],
    }];
    const result = extractTypography(layouts, []);
    expect(result.title).toEqual({
      fontFamily: 'Google Sans',
      fontSizePt: 40,
      bold: false,
      color: '#202122',
      lineSpacing: 115,
      spaceAbovePt: 0,
      spaceBelowPt: 8,
    });
  });

  it('falls back to master if layout has no text style', () => {
    const masters = [{
      pageElements: [{
        shape: {
          placeholder: { type: 'BODY' },
          text: {
            textElements: [
              { paragraphMarker: { paragraphStyle: { lineSpacing: 150 } } },
              { textRun: { content: 'body', style: { fontFamily: 'Arial', fontSize: { magnitude: 18, unit: 'PT' } } } },
            ],
          },
        },
      }],
    }];
    const result = extractTypography([], masters);
    expect(result.body?.fontFamily).toBe('Arial');
    expect(result.body?.fontSizePt).toBe(18);
  });
});
```

**Step 2: Run to verify failure**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: FAIL — `extractTypography` not exported.

**Step 3: Implement `extractTypography`**

Add to `src/tools/presentation/design-system.ts`:

```ts
// Placeholder types that carry typography definitions
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
        if (!ph || !TYPOGRAPHY_PLACEHOLDERS.includes(ph)) continue;

        const key = ph.toLowerCase() as Lowercase<PlaceholderRole>;
        if (result[key]) continue; // already found from a higher-priority source

        const textElements = el.shape?.text?.textElements ?? [];

        // Paragraph style — look in paragraphMarker
        const paraMarker = textElements.find((te: any) => te.paragraphMarker?.paragraphStyle);
        const paraStyle = paraMarker?.paragraphMarker?.paragraphStyle ?? {};

        // Text run style — first textRun with a style
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

  // layouts first (more specific), then masters as fallback
  processPages(layouts);
  processPages(masters);

  return result;
}
```

**Step 4: Run tests**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: add extractTypography for design system tool"
```

---

## Task 3: Lists Extractor

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

The Google Slides API stores list definitions on pages in a `lists` map:
`{ [listId]: { listProperties: { nestingLevel: { [level]: { bulletStyle: { glyph, glyphType, glyphFormat, indentFirstLine, indentStart } } } } } }`

**Step 1: Write failing tests**

```ts
import { extractLists } from '../../../src/tools/presentation/design-system.js';

describe('extractLists', () => {
  it('extracts bullet list from slides', () => {
    const slides = [{
      lists: {
        'list-abc': {
          listProperties: {
            nestingLevel: {
              '0': { bulletStyle: { glyphType: 'DISC', indentStart: { magnitude: 36, unit: 'PT' }, indentFirstLine: { magnitude: -18, unit: 'PT' } } },
              '1': { bulletStyle: { glyphType: 'CIRCLE', indentStart: { magnitude: 72, unit: 'PT' }, indentFirstLine: { magnitude: -18, unit: 'PT' } } },
            },
          },
        },
      },
    }];
    const result = extractLists(slides, [], []);
    expect(result.bullet?.glyphType).toBe('DISC');
    expect(result.bullet?.levels).toHaveLength(2);
    expect(result.bullet?.levels[0].indentPt).toBe(36);
  });

  it('extracts numbered list', () => {
    const slides = [{
      lists: {
        'list-num': {
          listProperties: {
            nestingLevel: {
              '0': { bulletStyle: { glyphType: 'DECIMAL', indentStart: { magnitude: 36, unit: 'PT' } } },
            },
          },
        },
      },
    }];
    const result = extractLists(slides, [], []);
    expect(result.numbered?.glyphType).toBe('DECIMAL');
  });

  it('returns empty object when no lists', () => {
    expect(extractLists([], [], [])).toEqual({});
  });
});
```

**Step 2: Run to verify failure**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

**Step 3: Implement `extractLists`**

```ts
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
```

**Step 4: Run tests**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: add extractLists for design system tool"
```

---

## Task 4: Shape Styles Extractor

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

Groups shapes by visual fingerprint and returns the top patterns by frequency. Omits shapes with no fill AND no border (invisible structural shapes).

**Step 1: Write failing tests**

```ts
import { extractShapeStyles } from '../../../src/tools/presentation/design-system.js';

describe('extractShapeStyles', () => {
  const makeShape = (fillHex: string, borderHex: string, count: number) =>
    Array.from({ length: count }, () => ({
      shape: {
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: { red: parseInt(fillHex.slice(1,3),16)/255, green: parseInt(fillHex.slice(3,5),16)/255, blue: parseInt(fillHex.slice(5,7),16)/255 } } } },
          outline: { outlineFill: { solidFill: { color: { rgbColor: { red: parseInt(borderHex.slice(1,3),16)/255, green: parseInt(borderHex.slice(3,5),16)/255, blue: parseInt(borderHex.slice(5,7),16)/255 } } } }, weight: { magnitude: 12700, unit: 'EMU' }, dashStyle: 'SOLID' },
          contentAlignment: 'MIDDLE',
          contentInsets: { top: { magnitude: 9, unit: 'PT' }, bottom: { magnitude: 9, unit: 'PT' }, left: { magnitude: 12, unit: 'PT' }, right: { magnitude: 12, unit: 'PT' } },
        },
      },
    }));

  it('groups shapes by visual fingerprint and returns most frequent first', () => {
    const slides = [{ pageElements: [...makeShape('#F8F9FA', '#DADCE0', 5), ...makeShape('#1A73E8', '#1A73E8', 2)] }];
    const common = extractShapeStyles(slides);
    expect(common[0].count).toBe(5);
    expect(common[0].fillColor).toBe('#F8F9FA');
    expect(common[1].count).toBe(2);
  });

  it('omits shapes with no fill and no border', () => {
    const slides = [{ pageElements: [{ shape: { shapeProperties: {} } }] }];
    expect(extractShapeStyles(slides)).toHaveLength(0);
  });

  it('converts border weight from EMU to points', () => {
    const slides = [{ pageElements: makeShape('#FFFFFF', '#000000', 1) }];
    expect(extractShapeStyles(slides)[0].borderWidthPt).toBe(1);
  });
});
```

**Step 2: Run to verify failure**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

**Step 3: Implement `extractShapeStyles`**

```ts
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

      // Fill
      const fillRgb = sp.shapeBackgroundFill?.solidFill?.color?.rgbColor;
      const fillColor = fillRgb ? rgbToHex(fillRgb.red, fillRgb.green, fillRgb.blue) : undefined;

      // Border
      const outlineRgb = sp.outline?.outlineFill?.solidFill?.color?.rgbColor;
      const borderColor = outlineRgb ? rgbToHex(outlineRgb.red, outlineRgb.green, outlineRgb.blue) : undefined;
      const borderWidthPt = sp.outline?.weight?.magnitude != null
        ? emuToPoints(sp.outline.weight.magnitude)
        : undefined;
      const dashStyle: string | undefined = sp.outline?.dashStyle ?? undefined;

      // Skip invisible shapes
      if (!fillColor && !borderColor) continue;

      // Shadow
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

      // Padding
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
```

**Step 4: Run tests**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: add extractShapeStyles for design system tool"
```

---

## Task 5: Table Styles Extractor

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

**Step 1: Write failing tests**

```ts
import { extractTableStyles } from '../../../src/tools/presentation/design-system.js';

describe('extractTableStyles', () => {
  const makeCell = (hex: string) => ({
    tableCellProperties: {
      tableCellBackgroundFill: { solidFill: { color: { rgbColor: { red: parseInt(hex.slice(1,3),16)/255, green: parseInt(hex.slice(3,5),16)/255, blue: parseInt(hex.slice(5,7),16)/255 } } } },
      contentAlignment: 'TOP',
      contentInsets: { top: { magnitude: 5, unit: 'PT' }, bottom: { magnitude: 5, unit: 'PT' }, left: { magnitude: 5, unit: 'PT' }, right: { magnitude: 5, unit: 'PT' } },
    },
  });

  it('returns found=false when no tables', () => {
    expect(extractTableStyles([{ pageElements: [] }])).toEqual({ found: false });
  });

  it('extracts header and row fills', () => {
    const slides = [{
      pageElements: [{
        table: {
          rows: 3,
          columns: 2,
          tableRows: [
            { tableCells: [makeCell('#1A73E8'), makeCell('#1A73E8')], rowHeight: { magnitude: 380000, unit: 'EMU' } },
            { tableCells: [makeCell('#FFFFFF'), makeCell('#FFFFFF')], rowHeight: { magnitude: 380000, unit: 'EMU' } },
            { tableCells: [makeCell('#F8F9FA'), makeCell('#F8F9FA')], rowHeight: { magnitude: 380000, unit: 'EMU' } },
          ],
          tableColumns: [
            { columnWidth: { magnitude: 1524000, unit: 'EMU' } },
            { columnWidth: { magnitude: 1524000, unit: 'EMU' } },
          ],
          horizontalBorderRows: [
            { tableBorderCells: [{ tableBorderProperties: { borderFill: { solidFill: { color: { rgbColor: { red: 0.855, green: 0.855, blue: 0.855 } } } }, weight: { magnitude: 12700, unit: 'EMU' }, dashStyle: 'SOLID' } }] },
          ],
        },
      }],
    }];
    const result = extractTableStyles(slides);
    expect(result.found).toBe(true);
    expect(result.headerFill).toBe('#1A73E8');
    expect(result.rowFill).toBe('#FFFFFF');
    expect(result.alternateFill).toBe('#F8F9FA');
    expect(result.borderWidthPt).toBe(1);
    expect(result.defaultColumnWidthPt).toBe(120);
  });
});
```

**Step 2: Run to verify failure**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

**Step 3: Implement `extractTableStyles`**

```ts
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

      // Border from horizontalBorderRows
      const borderCell = table.horizontalBorderRows?.[0]?.tableBorderCells?.[0]?.tableBorderProperties;
      const borderRgb = borderCell?.borderFill?.solidFill?.color?.rgbColor;
      const borderColor = borderRgb ? rgbToHex(borderRgb.red, borderRgb.green, borderRgb.blue) : undefined;
      const borderWidthPt = borderCell?.weight?.magnitude != null
        ? emuToPoints(borderCell.weight.magnitude)
        : undefined;
      const dashStyle: string | undefined = borderCell?.dashStyle ?? undefined;

      // Column width (use first column as representative)
      const defaultColumnWidthPt = cols[0]?.columnWidth?.magnitude != null
        ? emuToPoints(cols[0].columnWidth.magnitude)
        : undefined;

      // Row height (use first row as representative)
      const defaultRowHeightPt = rows[0]?.rowHeight?.magnitude != null
        ? emuToPoints(rows[0].rowHeight.magnitude)
        : undefined;

      // Cell padding from first cell
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
```

**Step 4: Run tests**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: add extractTableStyles for design system tool"
```

---

## Task 6: Colors and Layout Extractors

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

**Step 1: Write failing tests**

```ts
import { extractColors, extractLayout } from '../../../src/tools/presentation/design-system.js';

describe('extractColors', () => {
  it('collects and deduplicates fill, text, background, and border colors', () => {
    const slides = [{
      pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.1, green: 0.45, blue: 0.91 } } } } },
      pageElements: [{
        shape: {
          shapeProperties: {
            shapeBackgroundFill: { solidFill: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } } },
            outline: { outlineFill: { solidFill: { color: { rgbColor: { red: 0.855, green: 0.855, blue: 0.855 } } } } },
          },
          text: {
            textElements: [{
              textRun: { style: { foregroundColor: { rgbColor: { red: 0.125, green: 0.129, blue: 0.141 } } } },
            }],
          },
        },
      }],
    }];
    const colors = extractColors(slides);
    expect(colors.backgrounds).toContain('#1A73E8');
    expect(colors.fills).toContain('#FFFFFF');
    expect(colors.borders).toContain('#DADADA');
    expect(colors.text).toContain('#20212');  // approximate
  });
});

describe('extractLayout', () => {
  it('converts page size from EMU to points', () => {
    const pageSize = { width: { magnitude: 9144000, unit: 'EMU' }, height: { magnitude: 5143500, unit: 'EMU' } };
    const slides = [{
      pageElements: [
        { transform: { translateX: 457200, translateY: 342900 }, size: { width: { magnitude: 7620000 }, height: { magnitude: 1143000 } } },
      ],
    }];
    const layout = extractLayout(pageSize, slides);
    expect(layout.widthPt).toBe(720);
    expect(layout.heightPt).toBe(405);  // approx
    expect(layout.marginLeftPt).toBe(36);
    expect(layout.marginTopPt).toBe(27);
  });
});
```

**Step 2: Run to verify failure**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

**Step 3: Implement `extractColors` and `extractLayout`**

```ts
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
    // Slide background
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

    // Sort by Y for gap analysis
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
```

**Step 4: Run tests**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: add extractColors and extractLayout for design system tool"
```

---

## Task 7: Assemble the Main Tool Function

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

**Step 1: Write failing test for the tool function**

```ts
import { presentationGetDesignSystemTool } from '../../../src/tools/presentation/design-system.js';
import { SlidesClient } from '../../../src/google/client.js';
import { jest, beforeEach } from '@jest/globals';

describe('presentationGetDesignSystemTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { getPresentation: jest.fn() } as any;
    mockClient.getPresentation.mockResolvedValue({
      presentationId: 'pres-123',
      pageSize: { width: { magnitude: 9144000, unit: 'EMU' }, height: { magnitude: 5143500, unit: 'EMU' } },
      masters: [],
      layouts: [],
      slides: [],
    });
  });

  it('calls getPresentation once and returns a success response', async () => {
    const result = await presentationGetDesignSystemTool(mockClient, { presentationId: 'pres-123' });
    expect(mockClient.getPresentation).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('returns structured design system data', async () => {
    const result = await presentationGetDesignSystemTool(mockClient, { presentationId: 'pres-123' });
    if (result.success) {
      expect(result.data).toHaveProperty('slideSize');
      expect(result.data).toHaveProperty('typography');
      expect(result.data).toHaveProperty('lists');
      expect(result.data).toHaveProperty('shapeStyles');
      expect(result.data).toHaveProperty('tableStyles');
      expect(result.data).toHaveProperty('colors');
      expect(result.data).toHaveProperty('layout');
    }
  });

  it('handles API errors gracefully', async () => {
    const { SlidesAPIError } = await import('../../../src/google/types.js');
    mockClient.getPresentation.mockRejectedValue(new SlidesAPIError('Not found', 404));
    const result = await presentationGetDesignSystemTool(mockClient, { presentationId: 'missing' });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run to verify failure**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -20
```

**Step 3: Implement `presentationGetDesignSystemTool`**

Append to `src/tools/presentation/design-system.ts`:

```ts
export interface PresentationGetDesignSystemParams {
  presentationId: string;
}

export async function presentationGetDesignSystemTool(
  client: SlidesClient,
  params: PresentationGetDesignSystemParams
): Promise<ToolResponse> {
  try {
    const presentation = await client.getPresentation(params.presentationId);

    const masters: any[] = presentation.masters ?? [];
    const layouts: any[] = presentation.layouts ?? [];
    const slides: any[] = presentation.slides ?? [];

    const typography = extractTypography(layouts, masters);
    const lists = extractLists(slides, masters, layouts);
    const shapeStyles = { common: extractShapeStyles(slides) };
    const tableStyles = extractTableStyles(slides);
    const colors = extractColors(slides);
    const layout = extractLayout(presentation.pageSize, slides);

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
        verticalRhythmPt: layout.verticalRhythmPt,
      },
    };

    const summary = [
      `Design system for "${presentation.title}" (${slides.length} slides)`,
      `Slide size: ${layout.widthPt}×${layout.heightPt}pt`,
      `Typography roles found: ${Object.keys(typography).join(', ') || 'none'}`,
      `List types found: ${Object.keys(lists).join(', ') || 'none'}`,
      `Shape style patterns: ${shapeStyles.common.length}`,
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
```

**Step 4: Run all design system tests**

```bash
npm test -- --testPathPattern="presentation-design-system" 2>&1 | tail -30
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: assemble presentationGetDesignSystemTool"
```

---

## Task 8: Wire Up Registration

**Files:**
- Modify: `src/tools/presentation/index.ts`
- Modify: `src/tools/registry.ts`
- Modify: `src/index.ts`

No tests needed — these are pure wiring changes verified by build.

**Step 1: Export from `src/tools/presentation/index.ts`**

Add this line at the top export block (after existing exports):

```ts
export { presentationGetDesignSystemTool, PresentationGetDesignSystemParams } from './design-system.js';
```

**Step 2: Add tool schema to `src/tools/registry.ts`**

Add after the `presentation_duplicate` entry (around line 117), inside the Presentation block:

```ts
{
  name: 'presentation_get_design_system',
  description: 'Extract a compact design system from a presentation: typography (fonts, sizes, spacing), list/bullet styles, shape/card styles (fills, borders, shadows, padding), table styles, all colors used, and layout grid (slide size, margins, vertical rhythm). Returns structured design tokens — does not return raw API data, so it is safe to use on large presentations without exhausting context.',
  inputSchema: {
    type: 'object',
    properties: {
      presentationId: { type: 'string', description: 'The ID of the presentation to analyze' },
    },
    required: ['presentationId'],
  },
},
```

**Step 3: Add import and case to `src/index.ts`**

Add to the import block from `./tools/presentation/index.js`:

```ts
presentationGetDesignSystemTool,
PresentationGetDesignSystemParams,
```

Add a case to the switch statement (after the `presentation_outline` case):

```ts
case 'presentation_get_design_system': {
  const params = args as unknown as PresentationGetDesignSystemParams;
  const result = await presentationGetDesignSystemTool(client, params);
  if (result.success) {
    return { content: [{ type: 'text', text: result.message }] };
  } else {
    return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
  }
}
```

**Step 4: Commit**

```bash
git add src/tools/presentation/index.ts src/tools/registry.ts src/index.ts
git commit -m "feat: register presentation_get_design_system tool"
```

---

## Task 9: Build and Full Test Suite

**Step 1: Run full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: All existing tests still pass, new design system tests pass.

**Step 2: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors, build succeeds.

**Step 3: Commit if any build-triggered fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any TypeScript build errors in design system tool"
```

(Only run this step if there were actual fixes; skip if build was clean.)

---

## Summary of Commits

By the end, git log should show (newest first):

```
feat: register presentation_get_design_system tool
feat: assemble presentationGetDesignSystemTool
feat: add extractColors and extractLayout for design system tool
feat: add extractTableStyles for design system tool
feat: add extractShapeStyles for design system tool
feat: add extractLists for design system tool
feat: add extractTypography for design system tool
feat: add design-system tool skeleton with rgbToHex and modalValue helpers
docs: add design system extraction design doc
```
