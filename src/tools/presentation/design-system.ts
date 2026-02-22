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
