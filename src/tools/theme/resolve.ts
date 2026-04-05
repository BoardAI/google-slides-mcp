import { Theme } from './types.js';

/**
 * Map from our theme color keys to Google Slides ThemeColorType values.
 * These must match the mapping in presentation/build.ts applyThemeColorScheme().
 */
const COLOR_KEY_TO_THEME_COLOR: Record<string, string> = {
  bg_dark: 'DARK1',
  bg_light: 'LIGHT1',
  text_primary: 'DARK2',
  bg_surface: 'LIGHT2',
  accent: 'ACCENT1',
  bg_surface_dk: 'ACCENT2',
  text_secondary: 'ACCENT3',
  text_muted: 'ACCENT4',
  text_muted_dk: 'ACCENT5',
  divider_dk: 'ACCENT6',
};

/**
 * Build a reverse map: hex value -> ThemeColorType for a given theme.
 * Used to detect when an explicit hex value matches a theme color.
 */
function buildHexToThemeColorMap(theme: Theme): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, themeColorType] of Object.entries(COLOR_KEY_TO_THEME_COLOR)) {
    const hex = (theme.colors as any)[key];
    if (hex) map[hex.toUpperCase()] = themeColorType;
  }
  // text_inv (white) maps to LIGHT1
  if (theme.colors.text_inv) {
    map[theme.colors.text_inv.toUpperCase()] = 'LIGHT1';
  }
  return map;
}

/**
 * Resolve a color for the Google Slides API. Returns either a themeColor
 * reference (inherits from master) or an rgbColor (static).
 *
 * Priority:
 * 1. If colorValue is a theme key (e.g. "accent"), return { themeColor: "ACCENT1" }
 * 2. If colorValue is a hex that matches a theme color, return { themeColor: ... }
 * 3. Otherwise return { rgbColor: { red, green, blue } }
 */
export function resolveColorForAPI(
  colorValue: string,
  theme?: Theme
): { themeColor: string } | { rgbColor: { red: number; green: number; blue: number } } {
  if (theme) {
    // Check if it's a theme color key name
    const themeColorType = COLOR_KEY_TO_THEME_COLOR[colorValue];
    if (themeColorType) {
      return { themeColor: themeColorType };
    }

    // Check if the hex value matches a theme color
    if (colorValue.startsWith('#')) {
      const hexMap = buildHexToThemeColorMap(theme);
      const match = hexMap[colorValue.toUpperCase()];
      if (match) {
        return { themeColor: match };
      }
    }
  }

  // Fallback: resolve to hex if it's a theme key, then convert to RGB
  const hex = theme ? (resolveColor(colorValue, theme) || colorValue) : colorValue;
  return { rgbColor: hexToRgbValues(hex) };
}

function hexToRgbValues(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace('#', '');
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

/**
 * Check if a hex color is visually dark (luminance < 0.4).
 * Used to auto-swap text colors on dark backgrounds.
 */
function isDark(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  // Relative luminance (sRGB)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.4;
}

// Map dark-only text color keys to their light counterparts
const DARK_BG_COLOR_SWAPS: Record<string, string> = {
  text_primary: 'text_inv',
  text_secondary: 'text_muted_dk',
};

/**
 * Resolve an element spec through a theme: apply role defaults,
 * map color keys to hex values, map font keys to font families.
 * Per-element overrides always win over role defaults.
 *
 * If slideBgHex is provided and is a dark color, text color keys that would
 * be unreadable on dark backgrounds are auto-swapped to light variants.
 * This only applies to role-derived colors (not explicit per-element fontColor).
 */
export function resolveElement(element: any, theme: Theme, slideBgHex?: string): any {
  // If element has no role, return as-is
  if (!element.role) return element;

  const role = theme.roles[element.role];
  if (!role) return element;

  const resolved = { ...element };
  const onDarkBg = slideBgHex ? isDark(slideBgHex) : false;

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

  // Resolve font color (with dark-background auto-swap)
  if (!resolved.fontColor) {
    let colorKey = role.color;

    // Auto-swap dark text colors when on a dark background
    if (onDarkBg && DARK_BG_COLOR_SWAPS[colorKey]) {
      colorKey = DARK_BG_COLOR_SWAPS[colorKey];
    }

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
