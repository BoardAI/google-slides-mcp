import { Theme } from './types.js';

/**
 * Resolve an element spec through a theme: apply role defaults,
 * map color keys to hex values, map font keys to font families.
 * Per-element overrides always win over role defaults.
 */
export function resolveElement(element: any, theme: Theme): any {
  // If element has no role, return as-is
  if (!element.role) return element;

  const role = theme.roles[element.role];
  if (!role) return element;

  const resolved = { ...element };

  // Apply role defaults (only if element doesn't already specify)
  if (!resolved.fontSize && role.fontSize) resolved.fontSize = role.fontSize;
  if (resolved.bold === undefined && role.bold) resolved.bold = role.bold;
  if (resolved.italic === undefined && role.italic) resolved.italic = role.italic;
  if (!resolved.alignment && role.alignment) resolved.alignment = role.alignment;
  if (!resolved.lineSpacing && role.lineSpacing) resolved.lineSpacing = role.lineSpacing;

  // Resolve font family
  if (!resolved.fontFamily) {
    const fontKey = role.font;
    resolved.fontFamily = theme.fonts[fontKey] || fontKey;
  }

  // Resolve font color
  if (!resolved.fontColor) {
    const colorKey = role.color;
    resolved.fontColor = resolveColor(colorKey, theme) || colorKey;
  }

  // Clean up: remove role field (not needed for slide_build)
  delete resolved.role;

  return resolved;
}

/**
 * Resolve a color value: if it's a theme color key, look it up;
 * if it's already a hex string, return as-is.
 */
export function resolveColor(colorValue: string | undefined, theme: Theme): string | undefined {
  if (!colorValue) return undefined;
  if (colorValue.startsWith('#')) return colorValue;  // already hex
  return (theme.colors as any)[colorValue] || colorValue;
}
