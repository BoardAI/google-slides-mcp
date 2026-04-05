import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface SlideDuplicateModifyParams {
  presentationId: string;
  sourceSlideId: string;
  insertionIndex?: number;
  changes?: Array<{
    elementId: string;
    text?: string;
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string;
    bold?: boolean;
    fillColor?: string;
    borderColor?: string;
    imageUrl?: string;
    imageReplaceMethod?: 'CENTER_CROP';
  }>;
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

export async function slideDuplicateModifyTool(
  client: SlidesClient,
  params: SlideDuplicateModifyParams
): Promise<ToolResponse> {
  try {
    // Step 1: Duplicate the slide
    const dupRequests: any[] = [
      {
        duplicateObject: {
          objectId: params.sourceSlideId,
          objectIds: {},
        },
      },
    ];

    const dupResponse = await client.batchUpdate(params.presentationId, dupRequests);
    const newSlideId = dupResponse.replies?.[0]?.duplicateObject?.objectId;

    if (!newSlideId) {
      return createErrorResponse('api', 'No duplicated slide ID returned from API');
    }

    // The duplicateObject response doesn't directly expose the element ID mapping
    // in a simple field. We need to read the original and new slides to build the mapping.
    // However, Google Slides API does not return objectIds mapping in the response for
    // duplicateObject when objectIds is empty {}. The new IDs are auto-generated.
    // We need to read both slides and match elements by position/type to build the mapping.

    // Step 2: Build element ID mapping by reading both slides
    const presentation = await client.getPresentation(params.presentationId);
    const originalSlide = presentation.slides?.find(s => s.objectId === params.sourceSlideId);
    const newSlide = presentation.slides?.find(s => s.objectId === newSlideId);

    if (!originalSlide || !newSlide) {
      return createErrorResponse('api', 'Could not find original or new slide after duplication');
    }

    // Build mapping: original element ID -> new element ID
    // Match by index since duplicateObject preserves element order
    const elementIdMapping: Record<string, string> = {};
    const origElements = originalSlide.pageElements ?? [];
    const newElements = newSlide.pageElements ?? [];

    for (let i = 0; i < origElements.length && i < newElements.length; i++) {
      const origId = origElements[i].objectId;
      const newId = newElements[i].objectId;
      if (origId && newId) {
        elementIdMapping[origId] = newId;
      }
    }

    // Step 3: If insertionIndex is specified, move the slide
    if (params.insertionIndex !== undefined) {
      await client.batchUpdate(params.presentationId, [
        {
          updateSlidesPosition: {
            slideObjectIds: [newSlideId],
            insertionIndex: params.insertionIndex,
          },
        },
      ]);
    }

    // Step 4: Apply changes to the duplicated slide elements
    if (params.changes && params.changes.length > 0) {
      const modifyRequests: any[] = [];

      for (const change of params.changes) {
        // Find the new element ID from the mapping
        const targetElementId = elementIdMapping[change.elementId] || change.elementId;

        // Text replacement: delete existing text, then insert new
        if (change.text !== undefined) {
          modifyRequests.push({
            deleteText: {
              objectId: targetElementId,
              textRange: { type: 'ALL' },
            },
          });
          if (change.text) {
            modifyRequests.push({
              insertText: {
                objectId: targetElementId,
                text: change.text,
                insertionIndex: 0,
              },
            });
          }
        }

        // Text style changes
        const textStyle: any = {};
        const textFields: string[] = [];

        if (change.fontSize !== undefined) {
          textStyle.fontSize = { magnitude: change.fontSize, unit: 'PT' };
          textFields.push('fontSize');
        }
        if (change.fontColor !== undefined) {
          textStyle.foregroundColor = {
            opaqueColor: { rgbColor: hexToRgb(change.fontColor) },
          };
          textFields.push('foregroundColor');
        }
        if (change.fontFamily !== undefined) {
          textStyle.fontFamily = change.fontFamily;
          textFields.push('fontFamily');
        }
        if (change.bold !== undefined) {
          textStyle.bold = change.bold;
          textFields.push('bold');
        }

        if (textFields.length > 0) {
          modifyRequests.push({
            updateTextStyle: {
              objectId: targetElementId,
              textRange: { type: 'ALL' },
              style: textStyle,
              fields: textFields.join(','),
            },
          });
        }

        // Shape property changes
        const shapeProps: any = {};
        const shapeFields: string[] = [];

        if (change.fillColor !== undefined) {
          shapeProps.shapeBackgroundFill = {
            solidFill: { color: { rgbColor: hexToRgb(change.fillColor) } },
          };
          shapeFields.push('shapeBackgroundFill.solidFill.color');
        }
        if (change.borderColor !== undefined) {
          shapeProps.outline = {
            outlineFill: {
              solidFill: { color: { rgbColor: hexToRgb(change.borderColor) } },
            },
          };
          shapeFields.push('outline.outlineFill.solidFill.color');
        }

        if (shapeFields.length > 0) {
          modifyRequests.push({
            updateShapeProperties: {
              objectId: targetElementId,
              shapeProperties: shapeProps,
              fields: shapeFields.join(','),
            },
          });
        }

        // Image replacement
        if (change.imageUrl) {
          if (!change.imageUrl.startsWith('https://')) {
            return createErrorResponse('validation', `imageUrl must start with https:// (got "${change.imageUrl}")`);
          }
          const replaceReq: any = {
            imageObjectId: targetElementId,
            url: change.imageUrl,
          };
          if (change.imageReplaceMethod) {
            replaceReq.imageReplaceMethod = change.imageReplaceMethod;
          }
          modifyRequests.push({ replaceImage: replaceReq });
        }
      }

      if (modifyRequests.length > 0) {
        await client.batchUpdate(params.presentationId, modifyRequests);
      }
    }

    return createSuccessResponse(
      formatResponse('complex', 'Duplicated slide and applied modifications', {
        sourceSlideId: params.sourceSlideId,
        newSlideId,
        elementIdMapping,
        changesApplied: params.changes?.length ?? 0,
      }),
      {
        sourceSlideId: params.sourceSlideId,
        newSlideId,
        elementIdMapping,
      }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
