import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { emuToPoints } from '../shared/format.js';

export interface SlideReadParams {
  presentationId: string;
  slideId?: string;
  slideIndex?: number;
}

interface ReadElementSpec {
  type: 'shape' | 'textbox' | 'image';
  id: string;
  shapeType?: string;
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
  alignment?: string;
  lineSpacing?: number;
  verticalAlignment?: string;
  imageUrl?: string;
}

function rgbToHex(rgb: any): string | undefined {
  if (!rgb) return undefined;
  const r = Math.round((rgb.red ?? 0) * 255);
  const g = Math.round((rgb.green ?? 0) * 255);
  const b = Math.round((rgb.blue ?? 0) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function extractPosition(element: any): { x: number; y: number; width: number; height: number } {
  const transform = element.transform ?? {};
  const size = element.size ?? {};
  return {
    x: emuToPoints(transform.translateX),
    y: emuToPoints(transform.translateY),
    width: emuToPoints(size.width?.magnitude),
    height: emuToPoints(size.height?.magnitude),
  };
}

function extractTextContent(shape: any): {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: string;
  lineSpacing?: number;
} {
  const result: any = {};

  if (!shape.text) return result;

  // Extract full text
  const textElements = shape.text.textElements ?? [];
  const textParts: string[] = [];
  let firstRunStyle: any = null;
  let firstParagraphStyle: any = null;

  for (const te of textElements) {
    if (te.textRun?.content) {
      textParts.push(te.textRun.content);
      if (!firstRunStyle && te.textRun.style) {
        firstRunStyle = te.textRun.style;
      }
    }
    if (te.paragraphMarker?.style && !firstParagraphStyle) {
      firstParagraphStyle = te.paragraphMarker.style;
    }
  }

  const fullText = textParts.join('').replace(/\n$/, ''); // trim trailing newline
  if (fullText) result.text = fullText;

  // Extract style from the first text run
  if (firstRunStyle) {
    if (firstRunStyle.fontSize?.magnitude) {
      result.fontSize = firstRunStyle.fontSize.magnitude;
    }
    if (firstRunStyle.fontFamily) {
      result.fontFamily = firstRunStyle.fontFamily;
    }
    if (firstRunStyle.foregroundColor?.opaqueColor?.rgbColor) {
      result.fontColor = rgbToHex(firstRunStyle.foregroundColor.opaqueColor.rgbColor);
    }
    if (firstRunStyle.bold) result.bold = true;
    if (firstRunStyle.italic) result.italic = true;
  }

  // Extract paragraph style
  if (firstParagraphStyle) {
    if (firstParagraphStyle.alignment) {
      const alignment = firstParagraphStyle.alignment;
      result.alignment = alignment === 'START' ? 'LEFT' : alignment;
    }
    if (firstParagraphStyle.lineSpacing) {
      result.lineSpacing = firstParagraphStyle.lineSpacing;
    }
  }

  return result;
}

function extractFillColor(shapeProperties: any): string | undefined {
  const fill = shapeProperties?.shapeBackgroundFill?.solidFill;
  if (!fill) return undefined;
  return rgbToHex(fill.color?.rgbColor);
}

function extractBorderInfo(shapeProperties: any): { borderColor?: string; borderWidth?: number } {
  const outline = shapeProperties?.outline;
  if (!outline) return {};
  const result: any = {};
  const solidFill = outline.outlineFill?.solidFill;
  if (solidFill?.color?.rgbColor) {
    result.borderColor = rgbToHex(solidFill.color.rgbColor);
  }
  if (outline.weight?.magnitude) {
    result.borderWidth = emuToPoints(outline.weight.magnitude);
  }
  return result;
}

export async function slideReadTool(
  client: SlidesClient,
  params: SlideReadParams
): Promise<ToolResponse> {
  try {
    const presentation = await client.getPresentation(params.presentationId);
    const slides = presentation.slides ?? [];

    // Find the target slide
    let targetSlide: any = null;
    let slideId: string | undefined;

    if (params.slideId) {
      targetSlide = slides.find((s: any) => s.objectId === params.slideId);
      slideId = params.slideId;
    } else if (params.slideIndex !== undefined) {
      if (params.slideIndex >= 0 && params.slideIndex < slides.length) {
        targetSlide = slides[params.slideIndex];
        slideId = targetSlide?.objectId;
      }
    } else {
      // Default to first slide
      targetSlide = slides[0];
      slideId = targetSlide?.objectId;
    }

    if (!targetSlide) {
      return createErrorResponse(
        'validation',
        `Slide not found: ${params.slideId ?? `index ${params.slideIndex}`}`
      );
    }

    // Extract background color
    let backgroundColor: string | undefined;
    const bgFill = targetSlide.slideProperties?.pageBackgroundFill?.solidFill;
    if (bgFill?.color?.rgbColor) {
      backgroundColor = rgbToHex(bgFill.color.rgbColor);
    }

    // Convert each pageElement to an ElementSpec-like object
    const elements: ReadElementSpec[] = [];
    const pageElements = targetSlide.pageElements ?? [];

    for (const pe of pageElements) {
      const pos = extractPosition(pe);
      const id = pe.objectId ?? '';

      // Image element
      if (pe.image) {
        const spec: ReadElementSpec = {
          type: 'image',
          id,
          ...pos,
          imageUrl: pe.image.contentUrl || pe.image.sourceUrl || undefined,
        };
        elements.push(spec);
        continue;
      }

      // Shape element (including text boxes)
      if (pe.shape) {
        const shapeType = pe.shape.shapeType ?? 'RECTANGLE';
        const isTextBox = shapeType === 'TEXT_BOX';

        const spec: ReadElementSpec = {
          type: isTextBox ? 'textbox' : 'shape',
          id,
          ...pos,
        };

        if (!isTextBox) {
          spec.shapeType = shapeType;
        }

        // Extract fill and border
        const props = pe.shape.shapeProperties;
        if (props) {
          const fill = extractFillColor(props);
          if (fill) spec.fillColor = fill;

          const border = extractBorderInfo(props);
          if (border.borderColor) spec.borderColor = border.borderColor;
          if (border.borderWidth) spec.borderWidth = border.borderWidth;

          // Vertical alignment
          if (props.contentAlignment) {
            spec.verticalAlignment = props.contentAlignment;
          }
        }

        // Extract text content and formatting
        const textInfo = extractTextContent(pe.shape);
        Object.assign(spec, textInfo);

        elements.push(spec);
        continue;
      }

      // Skip tables, videos, lines, etc. for now (not supported by slide_build)
    }

    const slideSpec: any = {
      slideId,
      elements,
    };
    if (backgroundColor) {
      slideSpec.backgroundColor = backgroundColor;
    }

    return createSuccessResponse(
      formatResponse('complex', `Read slide with ${elements.length} elements`, slideSpec),
      slideSpec
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
