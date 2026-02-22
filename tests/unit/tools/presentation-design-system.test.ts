import { describe, it, expect } from '@jest/globals';
import { rgbToHex, modalValue } from '../../../src/tools/presentation/design-system.js';
import { extractTypography } from '../../../src/tools/presentation/design-system.js';
import { extractLists } from '../../../src/tools/presentation/design-system.js';
import { extractShapeStyles } from '../../../src/tools/presentation/design-system.js';

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
      color: '#202124',
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
