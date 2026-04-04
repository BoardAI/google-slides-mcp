import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

interface ElementSpec {
  type: 'shape' | 'textbox' | 'image' | 'icon';
  id?: string;
  shapeType?: string; // RECTANGLE, ROUND_RECTANGLE, ELLIPSE, etc.
  x: number;
  y: number;
  width: number;
  height: number;
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
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace('#', '');
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function ptToEmu(pt: number): number {
  return Math.round(pt * 12700);
}

function generateSemanticId(el: ElementSpec, index: number): string {
  if (el.id) return el.id;

  const prefix = el.type; // shape, textbox, image, icon

  // Try to create a meaningful suffix from text content
  if (el.text) {
    const slug = el.text
      .substring(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return `${prefix}_${slug}_${index}`;
  }

  if (el.type === 'icon' && el.icon) {
    return `icon_${el.icon.replace(/[^a-z0-9]/g, '_')}_${index}`;
  }

  if (el.shapeType) {
    return `${el.shapeType.toLowerCase()}_${index}`;
  }

  return `${prefix}_${index}`;
}

function buildIconUrl(icon: string, color: string, style: string): string {
  return `https://img.icons8.com/${style}/100/${color.replace('#', '')}/${icon}.png`;
}

export async function slideBuildTool(
  client: SlidesClient,
  params: SlideBuildParams
): Promise<ToolResponse> {
  try {
    const requests: any[] = [];
    const createdIds: string[] = [];

    for (let i = 0; i < params.elements.length; i++) {
      const el = params.elements[i];
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
            solidFill: { color: { rgbColor: hexToRgb(el.fillColor) } },
          };
          fields.push('shapeBackgroundFill.solidFill.color');
        }
        if (el.borderColor) {
          shapeProperties.outline = {
            outlineFill: {
              solidFill: { color: { rgbColor: hexToRgb(el.borderColor) } },
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
            solidFill: { color: { rgbColor: hexToRgb(el.fillColor) } },
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
          style.foregroundColor = {
            opaqueColor: { rgbColor: hexToRgb(el.fontColor) },
          };
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
            rangeStyle.foregroundColor = {
              opaqueColor: { rgbColor: hexToRgb(el.boldRange.color) },
            };
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

    return createSuccessResponse(
      formatResponse('complex', `Built slide with ${params.elements.length} elements`, {
        slideId: params.slideId,
        elementCount: params.elements.length,
        elementIds: createdIds,
        requestCount: requests.length,
      }),
      { slideId: params.slideId, elementIds: createdIds }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
