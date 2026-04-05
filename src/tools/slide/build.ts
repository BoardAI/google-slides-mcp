import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { Theme } from '../theme/types.js';
import { resolveElement, resolveColor, resolveColorForAPI } from '../theme/resolve.js';
import { computeLayout } from '../layout/engine.js';
import { LayoutContainer } from '../layout/types.js';
import { validateSlide, ValidationWarning } from '../validation/check.js';

export interface ElementSpec {
  type: 'shape' | 'textbox' | 'image' | 'icon';
  id?: string;
  role?: string; // theme role (e.g. "title", "h1", "body") - resolved via theme
  shapeType?: string; // RECTANGLE, ROUND_RECTANGLE, ELLIPSE, etc.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  verticalAlignment?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  lineSpacing?: number;
  imageUrl?: string;
  // For mixed formatting: bold a substring
  boldRange?: { start: number; end: number; fontSize?: number; color?: string };
  // Auto-fit for text boxes
  autoFit?: 'NONE' | 'TEXT_AUTOFIT' | 'SHAPE_AUTOFIT';
  // Icon-specific (type: 'icon')
  icon?: string;      // Icons8 slug, e.g. "search--v1", "shield"
  iconColor?: string;  // hex without #, default "000000"
  iconStyle?: string;  // Icons8 style, default "ios-filled"
}

export interface SlideBuildParams {
  presentationId: string;
  slideId: string;
  elements: ElementSpec[];
  theme?: Theme;
  layout?: {
    type: 'row' | 'column' | 'grid';
    columns?: number;
    gap?: number;
    x?: number;       // container x, default 60
    y?: number;       // container y, default 100
    width?: number;   // container width, default 600
    height?: number;  // container height, default 260
  };
  validate?: boolean; // run post-build validation (extra API call), default false
  slideBgColor?: string; // hex bg color of this slide, used for auto dark/light text color swapping
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace('#', '');
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

// Theme-aware color: returns { themeColor } when possible, { rgbColor } otherwise.
// Used for shape fills, borders, and text colors so they inherit from the master.
let _buildTheme: Theme | undefined;
function apiColor(colorValue: string): any {
  return resolveColorForAPI(colorValue, _buildTheme);
}
function apiOpaqueColor(colorValue: string): any {
  return { opaqueColor: resolveColorForAPI(colorValue, _buildTheme) };
}

function ptToEmu(pt: number): number {
  return Math.round(pt * 12700);
}

// Short random suffix to avoid ID collisions across slides in the same presentation
const _uid = () => Math.random().toString(36).substring(2, 6);

function generateSemanticId(el: ElementSpec, index: number): string {
  if (el.id) return el.id;

  const suffix = `${index}_${_uid()}`;
  const prefix = el.type; // shape, textbox, image, icon

  // Try to create a meaningful name from text content
  if (el.text) {
    const slug = el.text
      .substring(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return `${prefix}_${slug}_${suffix}`;
  }

  if (el.type === 'icon' && el.icon) {
    return `icon_${el.icon.replace(/[^a-z0-9]/g, '_')}_${suffix}`;
  }

  if (el.shapeType) {
    return `${el.shapeType.toLowerCase()}_${suffix}`;
  }

  return `${prefix}_${suffix}`;
}

function buildIconUrl(icon: string, color: string, style: string): string {
  return `https://img.icons8.com/${style}/100/${color.replace('#', '')}/${icon}.png`;
}

export async function slideBuildTool(
  client: SlidesClient,
  params: SlideBuildParams
): Promise<ToolResponse> {
  try {
    // Set the theme for the apiColor/apiOpaqueColor helpers
    _buildTheme = params.theme;

    // Resolve theme roles and color keys if a theme is provided
    // Pass slideBgColor so the resolver can auto-swap text colors on dark backgrounds
    const bgHex = params.slideBgColor
      ? (params.theme ? resolveColor(params.slideBgColor, params.theme) || params.slideBgColor : params.slideBgColor)
      : undefined;

    if (params.theme) {
      params.elements = params.elements.map((el) => {
        const resolved = resolveElement(el, params.theme!, bgHex);
        // Also resolve color keys in fillColor, borderColor
        if (resolved.fillColor) resolved.fillColor = resolveColor(resolved.fillColor, params.theme!) || resolved.fillColor;
        if (resolved.borderColor) resolved.borderColor = resolveColor(resolved.borderColor, params.theme!) || resolved.borderColor;
        if (resolved.fontColor) resolved.fontColor = resolveColor(resolved.fontColor, params.theme!) || resolved.fontColor;
        return resolved;
      });
    }

    // Apply layout to elements without explicit x/y/width/height
    if (params.layout) {
      const layoutElements = params.elements.filter(
        el => el.x === undefined && el.y === undefined && el.width === undefined && el.height === undefined
      );

      if (layoutElements.length > 0) {
        const container: LayoutContainer = {
          x: params.layout.x ?? 60,
          y: params.layout.y ?? 100,
          width: params.layout.width ?? 600,
          height: params.layout.height ?? 260,
        };

        const positions = computeLayout(container, layoutElements.length, {
          type: params.layout.type,
          columns: params.layout.columns,
          gap: params.layout.gap,
        });

        let layoutIdx = 0;
        for (const el of params.elements) {
          if (el.x === undefined && el.y === undefined && el.width === undefined && el.height === undefined) {
            const pos = positions[layoutIdx];
            el.x = pos.x;
            el.y = pos.y;
            el.width = pos.width;
            el.height = pos.height;
            layoutIdx++;
          }
        }
      }
    }

    // Default any remaining undefined positions to 0
    for (const el of params.elements) {
      if (el.x === undefined) el.x = 0;
      if (el.y === undefined) el.y = 0;
      if (el.width === undefined) el.width = 100;
      if (el.height === undefined) el.height = 100;
    }

    const requests: any[] = [];
    const createdIds: string[] = [];

    for (let i = 0; i < params.elements.length; i++) {
      const el = params.elements[i] as ElementSpec & { x: number; y: number; width: number; height: number };
      const elementId = generateSemanticId(el, i);
      createdIds.push(elementId);

      // ─── Icon ───────────────────────────────────────────────────────
      if (el.type === 'icon') {
        const iconSlug = el.icon || '';
        const iconColor = (el.iconColor || el.fontColor || '000000').replace('#', '');
        const iconStyle = el.iconStyle || 'ios-filled';
        const url = buildIconUrl(iconSlug, iconColor, iconStyle);

        requests.push({
          createImage: {
            objectId: elementId,
            url,
            elementProperties: {
              pageObjectId: params.slideId,
              size: {
                width: { magnitude: ptToEmu(el.width), unit: 'EMU' },
                height: { magnitude: ptToEmu(el.height), unit: 'EMU' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: ptToEmu(el.x),
                translateY: ptToEmu(el.y),
                unit: 'EMU',
              },
            },
          },
        });
        continue;
      }

      // ─── Image ──────────────────────────────────────────────────────
      if (el.type === 'image') {
        requests.push({
          createImage: {
            objectId: elementId,
            url: el.imageUrl,
            elementProperties: {
              pageObjectId: params.slideId,
              size: {
                width: { magnitude: ptToEmu(el.width), unit: 'EMU' },
                height: { magnitude: ptToEmu(el.height), unit: 'EMU' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: ptToEmu(el.x),
                translateY: ptToEmu(el.y),
                unit: 'EMU',
              },
            },
          },
        });
        continue;
      }

      // ─── Shape ──────────────────────────────────────────────────────
      if (el.type === 'shape') {
        requests.push({
          createShape: {
            objectId: elementId,
            shapeType: el.shapeType || 'RECTANGLE',
            elementProperties: {
              pageObjectId: params.slideId,
              size: {
                width: { magnitude: ptToEmu(el.width), unit: 'EMU' },
                height: { magnitude: ptToEmu(el.height), unit: 'EMU' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: ptToEmu(el.x),
                translateY: ptToEmu(el.y),
                unit: 'EMU',
              },
            },
          },
        });

        // Style the shape (fill, border, vertical alignment)
        // NOTE: autoFit is NOT supported on non-TEXT_BOX shapes (causes read-only field error)
        const shapeProperties: any = {};
        const fields: string[] = [];

        if (el.fillColor) {
          shapeProperties.shapeBackgroundFill = {
            solidFill: { color: apiColor(el.fillColor) },
          };
          fields.push('shapeBackgroundFill.solidFill.color');
        }
        if (el.borderColor) {
          shapeProperties.outline = {
            outlineFill: {
              solidFill: { color: apiColor(el.borderColor) },
            },
            weight: { magnitude: ptToEmu(el.borderWidth || 0.5), unit: 'EMU' },
          };
          fields.push('outline');
        }
        if (el.verticalAlignment) {
          shapeProperties.contentAlignment = el.verticalAlignment;
          fields.push('contentAlignment');
        }

        if (fields.length > 0) {
          requests.push({
            updateShapeProperties: {
              objectId: elementId,
              shapeProperties,
              fields: fields.join(','),
            },
          });
        }

        // Insert text into shape
        if (el.text) {
          requests.push({
            insertText: {
              objectId: elementId,
              text: el.text,
              insertionIndex: 0,
            },
          });
        }
      }

      // ─── Textbox ────────────────────────────────────────────────────
      if (el.type === 'textbox') {
        requests.push({
          createShape: {
            objectId: elementId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: params.slideId,
              size: {
                width: { magnitude: ptToEmu(el.width), unit: 'EMU' },
                height: { magnitude: ptToEmu(el.height), unit: 'EMU' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: ptToEmu(el.x),
                translateY: ptToEmu(el.y),
                unit: 'EMU',
              },
            },
          },
        });

        // Insert text
        if (el.text) {
          requests.push({
            insertText: {
              objectId: elementId,
              text: el.text,
              insertionIndex: 0,
            },
          });
        }

        // Style background and autoFit
        const tbProps: any = {};
        const tbFields: string[] = [];

        if (el.fillColor) {
          tbProps.shapeBackgroundFill = {
            solidFill: { color: apiColor(el.fillColor) },
          };
          tbFields.push('shapeBackgroundFill.solidFill.color');
        }
        if (el.autoFit) {
          tbProps.autofit = { autofitType: el.autoFit };
          tbFields.push('autofit');
        }

        if (tbFields.length > 0) {
          requests.push({
            updateShapeProperties: {
              objectId: elementId,
              shapeProperties: tbProps,
              fields: tbFields.join(','),
            },
          });
        }
      }

      // ─── Text formatting (shapes + textboxes) ──────────────────────
      if (el.text && (el.fontSize || el.fontFamily || el.fontColor || el.bold !== undefined)) {
        const style: any = {};
        const fields: string[] = [];

        if (el.fontSize) {
          style.fontSize = { magnitude: el.fontSize, unit: 'PT' };
          fields.push('fontSize');
        }
        if (el.fontFamily) {
          style.fontFamily = el.fontFamily;
          fields.push('fontFamily');
        }
        if (el.fontColor) {
          style.foregroundColor = apiOpaqueColor(el.fontColor);
          fields.push('foregroundColor');
        }
        if (el.bold !== undefined) {
          style.bold = el.bold;
          fields.push('bold');
        }
        if (el.italic !== undefined) {
          style.italic = el.italic;
          fields.push('italic');
        }

        if (fields.length > 0) {
          requests.push({
            updateTextStyle: {
              objectId: elementId,
              textRange: { type: 'ALL' },
              style,
              fields: fields.join(','),
            },
          });
        }

        // Paragraph style (alignment, line spacing)
        if (el.alignment || el.lineSpacing) {
          const paragraphStyle: any = {};
          const pFields: string[] = [];
          if (el.alignment) {
            const alignmentValue = el.alignment === 'LEFT' ? 'START' : el.alignment;
            paragraphStyle.alignment = alignmentValue;
            pFields.push('alignment');
          }
          if (el.lineSpacing) {
            paragraphStyle.lineSpacing = el.lineSpacing;
            pFields.push('lineSpacing');
          }
          requests.push({
            updateParagraphStyle: {
              objectId: elementId,
              textRange: { type: 'ALL' },
              style: paragraphStyle,
              fields: pFields.join(','),
            },
          });
        }

        // Bold a substring if specified
        if (el.boldRange) {
          const rangeStyle: any = { bold: true };
          const rangeFields: string[] = ['bold'];
          if (el.boldRange.fontSize) {
            rangeStyle.fontSize = { magnitude: el.boldRange.fontSize, unit: 'PT' };
            rangeFields.push('fontSize');
          }
          if (el.boldRange.color) {
            rangeStyle.foregroundColor = apiOpaqueColor(el.boldRange.color);
            rangeFields.push('foregroundColor');
          }
          requests.push({
            updateTextStyle: {
              objectId: elementId,
              textRange: {
                type: 'FIXED_RANGE',
                startIndex: el.boldRange.start,
                endIndex: el.boldRange.end,
              },
              style: rangeStyle,
              fields: rangeFields.join(','),
            },
          });
        }
      }
    }

    await client.batchUpdate(params.presentationId, requests);

    // Build structured element summary from resolved specs (positions are final at this point)
    const elementSummaries: string[] = [];
    for (let i = 0; i < params.elements.length; i++) {
      const el = params.elements[i] as ElementSpec & { x: number; y: number; width: number; height: number };
      const id = createdIds[i];
      const rolePart = el.role ? `, role: ${el.role}` : '';

      let typePart: string;
      if (el.type === 'textbox') {
        typePart = `textbox${rolePart}`;
      } else if (el.type === 'shape') {
        typePart = `shape, ${el.shapeType || 'RECTANGLE'}${rolePart}`;
      } else if (el.type === 'image') {
        typePart = `image${rolePart}`;
      } else if (el.type === 'icon') {
        typePart = `icon, ${el.icon || 'unknown'}${rolePart}`;
      } else {
        typePart = `${el.type}${rolePart}`;
      }

      elementSummaries.push(
        `  ${id} (${typePart}) at ${Math.round(el.x)},${Math.round(el.y)} ${Math.round(el.width)}x${Math.round(el.height)}`
      );
    }

    // Run validation if requested
    let validationWarnings: ValidationWarning[] = [];
    if (params.validate) {
      try {
        validationWarnings = await validateSlide(
          client,
          params.presentationId,
          params.slideId,
          createdIds
        );
      } catch (_err) {
        // Validation is best-effort, don't fail the build
      }
    }

    const warningsText = validationWarnings.length > 0
      ? validationWarnings.map(w => `  ${w.type}: ${w.message}`).join('\n')
      : 'none';

    const message = [
      `Built slide with ${params.elements.length} elements`,
      '',
      `Slide Id: ${params.slideId}`,
      'Elements:',
      ...elementSummaries,
      '',
      `Warnings: ${warningsText}`,
    ].join('\n');

    return createSuccessResponse(message, {
      slideId: params.slideId,
      elementIds: createdIds,
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
    });
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
