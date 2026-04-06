import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { parseHexColor } from '../shared/format.js';
import { Theme, ThemeColors } from '../theme/types.js';

// Reverse map: ThemeColorType -> our color key
const THEME_COLOR_TO_KEY: Record<string, keyof ThemeColors> = {
  DARK1: 'bg_dark',
  LIGHT1: 'bg_light',
  DARK2: 'text_primary',
  LIGHT2: 'bg_surface',
  ACCENT1: 'accent',
  ACCENT2: 'bg_surface_dk',
  ACCENT3: 'text_secondary',
  ACCENT4: 'text_muted',
  ACCENT5: 'text_muted_dk',
  ACCENT6: 'divider_dk',
};

// Forward map: our color key -> ThemeColorType
const COLOR_KEY_TO_THEME: Record<string, string> = {
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

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Read the theme color scheme from a presentation's master page.
 */
async function readThemeColors(
  client: SlidesClient,
  presentationId: string
): Promise<ThemeColors | null> {
  const presentation = await client.getPresentation(presentationId);
  const masters = (presentation as any).masters;
  if (!masters || masters.length === 0) return null;

  const master = masters[0];
  const colorScheme = master.pageProperties?.colorScheme?.colors;
  if (!colorScheme) return null;

  const colors: any = {};
  for (const pair of colorScheme) {
    const key = THEME_COLOR_TO_KEY[pair.type];
    if (key && pair.color?.rgbColor) {
      const { red = 0, green = 0, blue = 0 } = pair.color.rgbColor;
      colors[key] = rgbToHex(red, green, blue);
    }
  }

  return colors as ThemeColors;
}

// ─── Get Theme Tool ──────────────────────────────────────────────────────

export interface PresentationGetThemeParams {
  presentationId: string;
}

export async function presentationGetThemeTool(
  client: SlidesClient,
  params: PresentationGetThemeParams
): Promise<ToolResponse> {
  try {
    const colors = await readThemeColors(client, params.presentationId);
    if (!colors) {
      return createErrorResponse('api', 'Could not read theme from presentation master');
    }

    return createSuccessResponse(
      formatResponse('complex', 'Theme colors read from presentation master', { colors }),
      { colors }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

// ─── Set Theme Tool ──────────────────────────────────────────────────────

export interface PresentationSetThemeParams {
  presentationId: string;
  colors: Partial<ThemeColors>;
}

export async function presentationSetThemeTool(
  client: SlidesClient,
  params: PresentationSetThemeParams
): Promise<ToolResponse> {
  try {
    const presentation = await client.getPresentation(params.presentationId);
    const masters = (presentation as any).masters;
    if (!masters || masters.length === 0) {
      return createErrorResponse('api', 'No master page found in presentation');
    }
    const masterPageId = masters[0].objectId;

    // Read existing theme colors first (so partial updates work)
    const existing = await readThemeColors(client, params.presentationId);
    const merged = { ...existing, ...params.colors };

    // Build the full 12-color scheme (all are required by the API)
    const colorPairs: Array<{ type: string; color: string }> = [
      { type: 'DARK1', color: merged.bg_dark || '#0F172A' },
      { type: 'LIGHT1', color: merged.bg_light || '#FFFFFF' },
      { type: 'DARK2', color: merged.text_primary || '#0F172A' },
      { type: 'LIGHT2', color: merged.bg_surface || '#F1F5F9' },
      { type: 'ACCENT1', color: merged.accent || '#3B82F6' },
      { type: 'ACCENT2', color: merged.bg_surface_dk || '#1E293B' },
      { type: 'ACCENT3', color: merged.text_secondary || '#64748B' },
      { type: 'ACCENT4', color: merged.text_muted || '#94A3B8' },
      { type: 'ACCENT5', color: merged.text_muted_dk || '#CBD5E1' },
      { type: 'ACCENT6', color: merged.divider_dk || '#334155' },
      { type: 'HYPERLINK', color: merged.accent || '#3B82F6' },
      { type: 'FOLLOWED_HYPERLINK', color: merged.text_muted || '#94A3B8' },
    ];

    const colorScheme = colorPairs.map(({ type, color }) => ({
      type,
      color: parseHexColor(color),
    }));

    await client.batchUpdate(params.presentationId, [
      {
        updatePageProperties: {
          objectId: masterPageId,
          pageProperties: {
            colorScheme: { colors: colorScheme },
          },
          fields: 'colorScheme',
        },
      },
    ]);

    return createSuccessResponse(
      formatResponse('complex', 'Theme colors updated on presentation master. All elements using themeColor references will update automatically.', {
        colors: merged,
        presentationId: params.presentationId,
      }),
      { colors: merged, presentationId: params.presentationId }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
