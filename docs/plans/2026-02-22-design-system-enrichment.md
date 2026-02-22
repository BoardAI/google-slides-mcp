# Design System Enrichment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the shallow `typography`/`shapeStyles` outputs with a contextually annotated full type scale, column grid detection, and role-labelled shape styles optimised for AI slide recreation.

**Architecture:** Three new pure extractor functions replace `extractTypography` and `extractShapeStyles`; `extractColumnGrid` is added. All are wired into `presentationGetDesignSystemTool` with breaking output changes (`typography` → `typeScale`, `shapeStyles.common[]` → `shapeStyles` object, `layout.grid` added).

**Tech Stack:** TypeScript, Jest/ts-jest. All changes in `src/tools/presentation/design-system.ts` and `tests/unit/tools/presentation-design-system.test.ts`.

**Run tests with:** `npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage`

---

## Task 1: Replace `extractTypography` with `extractTypeScale`

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

`extractTypeScale` scans every text run across all slides (not just placeholder elements), groups by style fingerprint, filters noise, infers context, and returns entries sorted largest → smallest.

### Step 1: Delete the old `extractTypography` describe block from the test file

Remove lines 29–74 (the entire `describe('extractTypography', ...)` block). Also remove `extractTypography` from the import at line 3.

### Step 2: Write failing tests for `extractTypeScale`

Add after the `describe('modalValue', ...)` block:

```typescript
import { extractTypeScale } from '../../../src/tools/presentation/design-system.js';

describe('extractTypeScale', () => {
  const P = 12700; // EMU per point

  const makeTextEl = (
    sizePt: number,
    fontFamily: string,
    bold: boolean,
    colorHex: string | null,
    placeholderType?: string,
    fillHex?: string,
  ) => ({
    transform: { translateX: P, translateY: 100 * P },
    size: { width: { magnitude: 100 * P }, height: { magnitude: 20 * P } },
    shape: {
      ...(placeholderType ? { placeholder: { type: placeholderType } } : {}),
      shapeProperties: fillHex ? {
        shapeBackgroundFill: { solidFill: { color: { rgbColor: {
          red: parseInt(fillHex.slice(1, 3), 16) / 255,
          green: parseInt(fillHex.slice(3, 5), 16) / 255,
          blue: parseInt(fillHex.slice(5, 7), 16) / 255,
        }}}},
      } : {},
      text: {
        textElements: [{
          textRun: {
            content: 'Sample text',
            style: {
              fontSize: { magnitude: sizePt },
              fontFamily,
              bold,
              ...(colorHex ? { foregroundColor: { rgbColor: {
                red: parseInt(colorHex.slice(1, 3), 16) / 255,
                green: parseInt(colorHex.slice(3, 5), 16) / 255,
                blue: parseInt(colorHex.slice(5, 7), 16) / 255,
              }}} : {}),
            },
          },
        }],
      },
    },
  });

  it('extracts placeholder text with correct role and context', () => {
    const el = makeTextEl(26, 'Figtree', false, null, 'TITLE');
    const slides = [{ pageElements: [el] }, { pageElements: [el] }];
    const result = extractTypeScale(slides);
    expect(result).toHaveLength(1);
    expect(result[0].sizePt).toBe(26);
    expect(result[0].roles).toContain('placeholder:TITLE');
    expect(result[0].context).toBe('slide title');
  });

  it('assigns freeform:amber role and callout label for text inside amber shapes', () => {
    const el = makeTextEl(12, 'Figtree', true, '#280818', undefined, '#F5B73B');
    const slides = [{ pageElements: [el] }, { pageElements: [el] }];
    const result = extractTypeScale(slides);
    expect(result[0].roles).toContain('freeform:amber');
    expect(result[0].context).toBe('callout label');
  });

  it('filters styles appearing fewer than 2 times as noise', () => {
    const el = makeTextEl(14, 'Figtree', false, null);
    const slides = [{ pageElements: [el] }]; // 1 occurrence only
    const result = extractTypeScale(slides);
    expect(result).toHaveLength(0);
  });

  it('sorts entries largest font size first', () => {
    const small = makeTextEl(12, 'Figtree', false, null);
    const large = makeTextEl(28, 'Figtree', false, null);
    const slides = [
      { pageElements: [small, large] },
      { pageElements: [small, large] },
    ];
    const result = extractTypeScale(slides);
    expect(result[0].sizePt).toBeGreaterThan(result[result.length - 1].sizePt);
  });

  it('labels the most frequent freeform style as body', () => {
    const body = makeTextEl(18, 'Figtree', false, null);
    const caption = makeTextEl(12, 'Figtree', false, null);
    // body: 4 occurrences, caption: 2
    const slides = [
      { pageElements: [body, body, caption] },
      { pageElements: [body, body, caption] },
    ];
    const result = extractTypeScale(slides);
    expect(result.find(e => e.sizePt === 18)?.context).toBe('body');
    expect(result.find(e => e.sizePt === 12)?.context).toBe('supporting text');
  });
});
```

### Step 3: Run tests — verify they fail

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: compilation error — `extractTypeScale` not exported from `design-system.ts`.

### Step 4: Implement `extractTypeScale` in `design-system.ts`

Remove the entire `extractTypography` block (lines 28–86 — from the `// ─── Typography` comment through the closing `}`).

Remove the top-level `TYPOGRAPHY_PLACEHOLDERS`, `PlaceholderRole`, `TypographyStyle`, `TypographyMap` declarations.

Replace with:

```typescript
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
      .filter(e => [...e.roles].every(r => r.startsWith('freeform')))
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
```

### Step 5: Run tests — verify they pass

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: all tests pass.

### Step 6: Commit

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: replace extractTypography with extractTypeScale for full type scale extraction"
```

---

## Task 2: Add `extractColumnGrid`

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

### Step 1: Write failing tests for `extractColumnGrid`

Add after the `describe('extractTypeScale', ...)` block:

```typescript
import { extractColumnGrid } from '../../../src/tools/presentation/design-system.js';

describe('extractColumnGrid', () => {
  const P = 12700;
  const makeEl = (xPt: number, wPt: number) => ({
    transform: { translateX: xPt * P, translateY: 10 * P },
    size: { width: { magnitude: wPt * P }, height: { magnitude: 20 * P } },
  });

  it('detects a three-column layout from repeated X positions', () => {
    const slide = { pageElements: [makeEl(17, 210), makeEl(255, 210), makeEl(493, 210)] };
    const result = extractColumnGrid([slide, slide], 720);
    expect(result.columnCount).toBe(3);
    expect(result.columns).toHaveLength(3);
    expect(result.columns[0].xPt).toBe(17);
    expect(result.columns[1].xPt).toBe(255);
  });

  it('returns columnCount 1 when all elements share the same X', () => {
    const slide = { pageElements: [makeEl(17, 686), makeEl(17, 686), makeEl(17, 686)] };
    const result = extractColumnGrid([slide, slide], 720);
    expect(result.columnCount).toBe(1);
    expect(result.columns).toEqual([]);
    expect(result.gutterPt).toBeNull();
  });

  it('merges X values within 8pt into a single column', () => {
    // 17 and 20 are 3pt apart — should merge
    const slide = { pageElements: [makeEl(17, 210), makeEl(20, 210)] };
    const result = extractColumnGrid([slide, slide], 720);
    expect(result.columnCount).toBe(1);
  });

  it('computes gutter between two columns', () => {
    // col1: x=17 w=200 → right=217; col2: x=245 → gutter=28
    const slide = { pageElements: [makeEl(17, 200), makeEl(245, 200)] };
    const result = extractColumnGrid([slide, slide], 720);
    expect(result.columnCount).toBe(2);
    expect(result.gutterPt).toBe(28);
  });
});
```

### Step 2: Run tests — verify they fail

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: compilation error — `extractColumnGrid` not exported.

### Step 3: Implement `extractColumnGrid` in `design-system.ts`

Add a new section before `// ─── Layout`:

```typescript
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

  const xWidths = new Map<number, number[]>();

  for (const slide of slides) {
    for (const el of slide.pageElements ?? []) {
      if (!el.transform?.translateX) continue;
      const rawX = emuToPoints(el.transform.translateX);
      const xPt = Math.round(rawX / ROUND_TO) * ROUND_TO;
      const wPt = emuToPoints(el.size?.width?.magnitude ?? 0);
      if (xPt <= 0 || wPt <= 0) continue;
      const list = xWidths.get(xPt) ?? [];
      list.push(wPt);
      xWidths.set(xPt, list);
    }
  }

  // Keep X positions that appear on multiple elements/slides
  const candidates = [...xWidths.entries()]
    .filter(([, widths]) => widths.length >= MIN_FREQ)
    .sort(([a], [b]) => a - b);

  if (candidates.length === 0) return { columnCount: 1, columns: [], gutterPt: null };

  // Merge X values within MERGE_WITHIN pt
  const merged: Array<{ xPt: number; widths: number[] }> = [];
  for (const [x, widths] of candidates) {
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
```

### Step 4: Run tests — verify they pass

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: all tests pass.

### Step 5: Commit

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: add extractColumnGrid for multi-column layout detection"
```

---

## Task 3: Replace `extractShapeStyles` with `extractAnnotatedShapeStyles`

**Files:**
- Modify: `src/tools/presentation/design-system.ts`
- Modify: `tests/unit/tools/presentation-design-system.test.ts`

### Step 1: Delete the old `extractShapeStyles` describe block from the test file

Remove the entire `describe('extractShapeStyles', ...)` block (lines 117–147 in the original; adjust for prior edits). Also remove `extractShapeStyles` from the import line.

### Step 2: Write failing tests for `extractAnnotatedShapeStyles`

Add after the `describe('extractColumnGrid', ...)` block:

```typescript
import { extractAnnotatedShapeStyles } from '../../../src/tools/presentation/design-system.js';

describe('extractAnnotatedShapeStyles', () => {
  function hexToRgb(hex: string) {
    return {
      red:   parseInt(hex.slice(1, 3), 16) / 255,
      green: parseInt(hex.slice(3, 5), 16) / 255,
      blue:  parseInt(hex.slice(5, 7), 16) / 255,
    };
  }

  const makeShape = (fillHex: string | null, borderHex: string | null, count = 1) => {
    const fill = fillHex ? {
      shapeBackgroundFill: { solidFill: { color: { rgbColor: hexToRgb(fillHex) } } },
    } : {};
    const border = borderHex ? {
      outline: {
        outlineFill: { solidFill: { color: { rgbColor: hexToRgb(borderHex) } } },
        weight: { magnitude: 12700 },
        dashStyle: 'SOLID',
      },
    } : {};
    return Array.from({ length: count }, () => ({
      shape: { shapeProperties: { ...fill, ...border } },
    }));
  };

  it('assigns role "callout" to amber fill shapes', () => {
    const slides = [{ pageElements: makeShape('#F5B73B', '#EEFF41', 3) }];
    const result = extractAnnotatedShapeStyles(slides);
    expect(result['callout']).toBeDefined();
    expect(result['callout'].inferredRole).toBe('callout');
    expect(result['callout'].count).toBe(3);
  });

  it('assigns role "ghost" to no-fill + black border shapes', () => {
    const slides = [{ pageElements: makeShape(null, '#000000', 2) }];
    const result = extractAnnotatedShapeStyles(slides);
    expect(result['ghost']).toBeDefined();
    expect(result['ghost'].inferredRole).toBe('ghost');
  });

  it('assigns role "slate-ghost" to no-fill + slate (#8598A7) border shapes', () => {
    const slides = [{ pageElements: makeShape(null, '#8598A7', 2) }];
    const result = extractAnnotatedShapeStyles(slides);
    expect(result['slate-ghost']).toBeDefined();
  });

  it('assigns role "card" to near-white fill + high-contrast (dark) border', () => {
    const slides = [{ pageElements: makeShape('#FFFFFF', '#000000', 5) }];
    const result = extractAnnotatedShapeStyles(slides);
    expect(result['card']).toBeDefined();
    expect(result['card'].inferredRole).toBe('card');
  });

  it('appends -2 suffix when two fingerprints map to the same role', () => {
    const slides = [{
      pageElements: [
        ...makeShape('#FFFFFF', '#000000', 3),  // card
        ...makeShape('#FAFAFA', '#111111', 2),  // also card → card-2
      ],
    }];
    const result = extractAnnotatedShapeStyles(slides);
    expect(result['card']).toBeDefined();
    expect(result['card-2']).toBeDefined();
  });

  it('excludes shapes with no fill and no border', () => {
    const slides = [{ pageElements: [{ shape: { shapeProperties: {} } }] }];
    const result = extractAnnotatedShapeStyles(slides);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
```

### Step 3: Run tests — verify they fail

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: compilation error — `extractAnnotatedShapeStyles` not exported.

### Step 4: Implement `extractAnnotatedShapeStyles` in `design-system.ts`

Remove the entire `extractShapeStyles` block (the `ShapeStyleEntry` interface + `extractShapeStyles` function). Keep the `Insets` interface — it's still used by table styles.

Replace with:

```typescript
// ─── Annotated shape styles ───────────────────────────────────────────────────

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
```

Note: `AMBER_FILL` was defined in Task 1. If that constant isn't already in scope, declare it at the top of the new shape styles section as `const AMBER_FILL = '#F5B73B';` — but if Task 1 is already done it will already exist. Remove the duplicate.

### Step 5: Run tests — verify they pass

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: all tests pass.

### Step 6: Commit

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: replace extractShapeStyles with extractAnnotatedShapeStyles with role inference"
```

---

## Task 4: Wire all three extractors into `presentationGetDesignSystemTool`

**Files:**
- Modify: `src/tools/presentation/design-system.ts` (the tool function at the bottom)
- Modify: `tests/unit/tools/presentation-design-system.test.ts` (integration tests)

### Step 1: Update the integration tests first

In `tests/unit/tools/presentation-design-system.test.ts`, find the `describe('presentationGetDesignSystemTool', ...)` block and update the `'returns structured design system data with all required keys'` test:

```typescript
it('returns structured design system data with all required keys', async () => {
  const result = await presentationGetDesignSystemTool(mockClient, { presentationId: 'pres-123' });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toHaveProperty('slideSize');
    expect(result.data).toHaveProperty('typeScale');      // was: typography
    expect(result.data).toHaveProperty('lists');
    expect(result.data).toHaveProperty('shapeStyles');
    expect(result.data).toHaveProperty('tableStyles');
    expect(result.data).toHaveProperty('colors');
    expect(result.data).toHaveProperty('layout');
    expect(result.data.layout).toHaveProperty('grid');    // new
    expect(result.data).not.toHaveProperty('typography'); // removed
  }
});
```

### Step 2: Run tests — verify the integration test now fails

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: the integration test fails on `typeHaveProperty('typeScale')`.

### Step 3: Update `presentationGetDesignSystemTool` in `design-system.ts`

Replace the entire function body:

```typescript
export async function presentationGetDesignSystemTool(
  client: SlidesClient,
  params: PresentationGetDesignSystemParams
): Promise<ToolResponse> {
  try {
    const presentation = await client.getPresentation(params.presentationId);

    const masters: any[] = (presentation as any).masters ?? [];
    const layouts: any[] = (presentation as any).layouts ?? [];
    const slides: any[] = presentation.slides ?? [];

    const typeScale = extractTypeScale(slides);
    const lists = extractLists(slides, masters, layouts);
    const shapeStyles = extractAnnotatedShapeStyles(slides);
    const tableStyles = extractTableStyles(slides);
    const colors = extractColors(slides);
    const layout = extractLayout((presentation as any).pageSize, slides);
    const grid = extractColumnGrid(slides, layout.widthPt);

    const designSystem = {
      slideSize: { widthPt: layout.widthPt, heightPt: layout.heightPt },
      typeScale,
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
        grid,
      },
    };

    const summary = [
      `Design system for "${presentation.title}" (${slides.length} slides)`,
      `Slide size: ${layout.widthPt}×${layout.heightPt}pt`,
      `Type scale entries: ${typeScale.length}`,
      `List types found: ${Object.keys(lists).join(', ') || 'none'}`,
      `Shape style roles: ${Object.keys(shapeStyles).join(', ') || 'none'}`,
      `Tables found: ${tableStyles.found}`,
      `Grid: ${grid.columnCount} column(s)`,
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

### Step 4: Run tests — verify all pass

```bash
npx jest tests/unit/tools/presentation-design-system.test.ts --no-coverage
```

Expected: all tests pass, no failures.

### Step 5: Commit

```bash
git add src/tools/presentation/design-system.ts tests/unit/tools/presentation-design-system.test.ts
git commit -m "feat: wire typeScale, annotated shapes, and column grid into design system tool"
```

---

## Done

Run the full test suite to confirm nothing else broke:

```bash
npx jest --no-coverage
```

All tests should pass. The `presentation_get_design_system` MCP tool now returns `typeScale`, role-annotated `shapeStyles`, and `layout.grid` in place of the previous shallow `typography` and `shapeStyles.common` array.
