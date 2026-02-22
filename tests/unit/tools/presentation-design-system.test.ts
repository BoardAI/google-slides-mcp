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
