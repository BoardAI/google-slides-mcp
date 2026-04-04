import { SlidesClient } from '../../google/client.js';

export interface ValidationWarning {
  type: 'overlap' | 'outside_safe_area' | 'small_text' | 'low_contrast';
  elementId: string;
  message: string;
}

interface BoundingBox {
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasText: boolean;
  minFontSize: number | null;
}

function emuToPt(emu: number | null | undefined): number {
  return (emu ?? 0) / 12700;
}

/**
 * Extract bounding box and text info from a page element.
 */
function extractBoundingBox(element: any): BoundingBox | null {
  const id = element.objectId;
  if (!id) return null;

  const transform = element.transform;
  const size = element.size;

  const x = emuToPt(transform?.translateX);
  const y = emuToPt(transform?.translateY);
  const scaleX = transform?.scaleX ?? 1;
  const scaleY = transform?.scaleY ?? 1;
  const width = emuToPt(size?.width?.magnitude) * Math.abs(scaleX);
  const height = emuToPt(size?.height?.magnitude) * Math.abs(scaleY);

  // Check for text and minimum font size
  let hasText = false;
  let minFontSize: number | null = null;

  const textElements = element.shape?.text?.textElements ?? [];
  for (const te of textElements) {
    if (te.textRun?.content?.trim()) {
      hasText = true;
      const fs = te.textRun?.style?.fontSize?.magnitude;
      if (fs != null) {
        if (minFontSize === null || fs < minFontSize) {
          minFontSize = fs;
        }
      }
    }
  }

  return { elementId: id, x, y, width, height, hasText, minFontSize };
}

/**
 * Check if two bounding boxes overlap by more than a threshold in both dimensions.
 * Returns true if they overlap by more than `threshold` points in both x and y.
 */
function overlaps(a: BoundingBox, b: BoundingBox, threshold: number): boolean {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapX > threshold && overlapY > threshold;
}

// Standard slide dimensions in points (10" x 5.625" at 72 dpi)
const SLIDE_WIDTH = 720;
const SLIDE_HEIGHT = 405;

/**
 * Validate a slide after building for common spatial issues.
 * Reads back the actual element data from the API and checks for:
 *   - Elements outside the safe area (0..720 x 0..405 pt)
 *   - Overlapping elements (>10pt overlap in both dimensions)
 *   - Small text (fontSize < 8pt)
 */
export async function validateSlide(
  client: SlidesClient,
  presentationId: string,
  slideId: string,
  createdIds: string[]
): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  const presentation = await client.getPresentation(presentationId);
  const slide = (presentation.slides ?? []).find(
    (s: any) => s.objectId === slideId
  );
  if (!slide) return warnings;

  const pageElements: any[] = (slide as any).pageElements ?? [];
  const createdSet = new Set(createdIds);

  // Extract bounding boxes for created elements only
  const boxes: BoundingBox[] = [];
  for (const el of pageElements) {
    if (!createdSet.has(el.objectId)) continue;
    const box = extractBoundingBox(el);
    if (box) boxes.push(box);
  }

  for (const box of boxes) {
    // Outside safe area check
    const right = box.x + box.width;
    const bottom = box.y + box.height;
    if (box.x < 0 || box.y < 0 || right > SLIDE_WIDTH || bottom > SLIDE_HEIGHT) {
      warnings.push({
        type: 'outside_safe_area',
        elementId: box.elementId,
        message: `Element "${box.elementId}" extends outside slide bounds (${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}, slide is ${SLIDE_WIDTH}x${SLIDE_HEIGHT})`,
      });
    }

    // Small text check
    if (box.hasText && box.minFontSize !== null && box.minFontSize < 8) {
      warnings.push({
        type: 'small_text',
        elementId: box.elementId,
        message: `Element "${box.elementId}" has text smaller than 8pt (${box.minFontSize}pt)`,
      });
    }
  }

  // Overlap check: compare every pair
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j], 10)) {
        warnings.push({
          type: 'overlap',
          elementId: boxes[i].elementId,
          message: `Elements "${boxes[i].elementId}" and "${boxes[j].elementId}" overlap by more than 10pt in both dimensions`,
        });
      }
    }
  }

  return warnings;
}
