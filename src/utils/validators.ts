import { HEX_COLOR_RE } from '../tools/shared/format.js';

export type Alignment = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';

const VALID_ALIGNMENTS: ReadonlySet<string> = new Set(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']);

export function validateHexColor(value: string | undefined | null, fieldName: string): string | null {
  if (value == null) return null;
  if (!HEX_COLOR_RE.test(value)) {
    return `${fieldName} must be a valid hex color (e.g. "#FF0000"), got "${value}"`;
  }
  return null;
}

export function validateAlignment(value: string | undefined | null): string | null {
  if (value == null) return null;
  if (!VALID_ALIGNMENTS.has(value)) {
    return `alignment must be one of LEFT, CENTER, RIGHT, JUSTIFIED, got "${value}"`;
  }
  return null;
}

export function validatePositiveNumber(value: number | undefined | null, fieldName: string): string | null {
  if (value == null) return null;
  if (typeof value !== 'number' || value <= 0) {
    return `${fieldName} must be a positive number, got ${value}`;
  }
  return null;
}
