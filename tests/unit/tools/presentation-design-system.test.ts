import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  rgbToHex,
  modalValue,
  extractLists,
  extractShapeStyles,
  extractTableStyles,
  extractTypeScale,
  extractColumnGrid,
  extractColors,
  extractLayout,
  presentationGetDesignSystemTool,
} from '../../../src/tools/presentation/design-system.js';
import { SlidesClient } from '../../../src/google/client.js';

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
    // 4 distinct body elements total (2 per slide × 2 slides), 2 caption elements
    const slides = [
      {
        pageElements: [
          makeTextEl(18, 'Figtree', false, null),
          makeTextEl(18, 'Figtree', false, null),
          makeTextEl(12, 'Figtree', false, null),
        ],
      },
      {
        pageElements: [
          makeTextEl(18, 'Figtree', false, null),
          makeTextEl(18, 'Figtree', false, null),
          makeTextEl(12, 'Figtree', false, null),
        ],
      },
    ];
    const result = extractTypeScale(slides);
    expect(result.find(e => e.sizePt === 18)?.context).toBe('body');
    expect(result.find(e => e.sizePt === 12)?.context).toBe('supporting text');
  });
});

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
    const slide = { pageElements: [makeEl(17, 210), makeEl(20, 210)] };
    const result = extractColumnGrid([slide, slide], 720);
    expect(result.columnCount).toBe(1);
  });

  it('computes gutter between two columns', () => {
    // col1: x=17 w=200 → right edge=217; col2: x=245 → gutter=28
    const slide = { pageElements: [makeEl(17, 200), makeEl(245, 200)] };
    const result = extractColumnGrid([slide, slide], 720);
    expect(result.columnCount).toBe(2);
    expect(result.gutterPt).toBe(28);
  });
});

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

  it('extracts header and row fills, alternate fill, border, and column width', () => {
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

describe('extractColors', () => {
  it('collects and deduplicates fill, text, background, and border colors', () => {
    const slides = [{
      pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.102, green: 0.451, blue: 0.914 } } } } },
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
    expect(colors.backgrounds.length).toBeGreaterThan(0);
    expect(colors.fills).toContain('#FFFFFF');
    expect(colors.borders.length).toBeGreaterThan(0);
    expect(colors.text.length).toBeGreaterThan(0);
  });
});

describe('extractLayout', () => {
  const P = 12700; // EMU per point
  const makeEl = (yPt: number, hPt: number) => ({
    transform: { translateX: P, translateY: yPt * P },
    size: { width: { magnitude: P * 100 }, height: { magnitude: hPt * P } },
  });
  const makePH = (type: string, yPt: number, hPt: number) => ({
    transform: { translateX: P, translateY: yPt * P },
    size: { width: { magnitude: P * 100 }, height: { magnitude: hPt * P } },
    shape: { placeholder: { type } },
  });

  it('converts page size from EMU to points', () => {
    const pageSize = { width: { magnitude: 9144000, unit: 'EMU' }, height: { magnitude: 5143500, unit: 'EMU' } };
    const slides = [{
      pageElements: [
        { transform: { translateX: 457200, translateY: 342900 }, size: { width: { magnitude: 7620000 }, height: { magnitude: 1143000 } } },
      ],
    }];
    const layout = extractLayout(pageSize, slides);
    expect(layout.widthPt).toBe(720);
    expect(layout.heightPt).toBe(405);
    expect(layout.marginLeftPt).toBe(36);
    expect(layout.marginTopPt).toBe(27);
  });

  it('returns empty spacingScale when no elements', () => {
    const pageSize = { width: { magnitude: 9144000 }, height: { magnitude: 5143500 } };
    const layout = extractLayout(pageSize, []);
    expect(layout.marginLeftPt).toBe(0);
    expect(layout.marginTopPt).toBe(0);
    expect(layout.spacingScale).toEqual([]);
  });

  it('returns multiple spacing values sorted ascending by size', () => {
    // Slide 1: gaps of 8, 8 (elements at 0/h20, 28/h20, 56/h20)
    // Slide 2: gaps of 16, 16 (elements at 0/h20, 36/h20, 72/h20)
    const slides = [
      { pageElements: [makeEl(0, 20), makeEl(28, 20), makeEl(56, 20)] },
      { pageElements: [makeEl(0, 20), makeEl(36, 20), makeEl(72, 20)] },
    ];
    const layout = extractLayout({}, slides);
    expect(layout.spacingScale).toEqual([8, 16]);
  });

  it('filters sub-2pt gaps as noise', () => {
    // el1 bottom=20, el2 y=21 → 1pt gap (noise), el3 y=49 → 8pt gap
    const slides = [{
      pageElements: [makeEl(0, 20), makeEl(21, 20), makeEl(49, 20)],
    }];
    const layout = extractLayout({}, slides);
    expect(layout.spacingScale).toEqual([8]);
  });

  it('includes at most 8 spacing values', () => {
    // Create 10 distinct gap sizes (3pt–12pt), each appearing once
    const elements: any[] = [];
    let y = 0;
    for (let gap = 3; gap <= 12; gap++) {
      elements.push(makeEl(y, 20));
      y += 20 + gap;
    }
    const layout = extractLayout({}, [{ pageElements: elements }]);
    expect(layout.spacingScale.length).toBeLessThanOrEqual(8);
  });

  it('returns empty placeholderSpacing when no placeholder elements', () => {
    const slides = [{ pageElements: [makeEl(0, 20), makeEl(28, 20)] }];
    const layout = extractLayout({}, slides);
    expect(layout.placeholderSpacing).toEqual({});
  });

  it('extracts gap between consecutive placeholder types as a TYPE→TYPE key', () => {
    // TITLE at y=0/h=20 → bottom=20; BODY at y=36/h=20 → gap=16pt
    const slides = [{ pageElements: [makePH('TITLE', 0, 20), makePH('BODY', 36, 20)] }];
    const layout = extractLayout({}, slides);
    expect(layout.placeholderSpacing).toEqual({ 'TITLE→BODY': 16 });
  });

  it('freeform spacingScale excludes placeholder elements', () => {
    // TITLE placeholder + two freeform shapes with an 8pt gap between them
    // freeform 1 bottom = 36+20 = 56; freeform 2 y = 64 → gap = 8pt
    const slides = [{
      pageElements: [makePH('TITLE', 0, 20), makeEl(36, 20), makeEl(64, 20)],
    }];
    const layout = extractLayout({}, slides);
    expect(layout.spacingScale).toEqual([8]);
    expect(layout.placeholderSpacing).toEqual({});
  });

  it('uses modal gap when the same placeholder pair appears on multiple slides', () => {
    // Both slides: TITLE→BODY gap = 16pt
    const slide = { pageElements: [makePH('TITLE', 0, 20), makePH('BODY', 36, 20)] };
    const layout = extractLayout({}, [slide, slide]);
    expect(layout.placeholderSpacing).toEqual({ 'TITLE→BODY': 16 });
  });
});

describe('presentationGetDesignSystemTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { getPresentation: jest.fn() } as any;
    (mockClient.getPresentation as jest.MockedFunction<any>).mockResolvedValue({
      presentationId: 'pres-123',
      title: 'Test Presentation',
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

  it('returns structured design system data with all required keys', async () => {
    const result = await presentationGetDesignSystemTool(mockClient, { presentationId: 'pres-123' });
    expect(result.success).toBe(true);
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
    (mockClient.getPresentation as jest.MockedFunction<any>).mockRejectedValue(new SlidesAPIError('Not found', 404));
    const result = await presentationGetDesignSystemTool(mockClient, { presentationId: 'missing' });
    expect(result.success).toBe(false);
  });
});
