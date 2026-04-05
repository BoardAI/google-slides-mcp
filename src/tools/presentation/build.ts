import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';
import { parseHexColor, genId } from '../shared/format.js';
import { Theme } from '../theme/types.js';
import { resolveColor } from '../theme/resolve.js';
import { slideBuildTool, ElementSpec } from '../slide/build.js';

interface SlideSpec {
  backgroundColor?: string;  // hex or theme color key (e.g. "bg_dark")
  elements: ElementSpec[];
  notes?: string;
}

export interface PresentationBuildParams {
  title: string;
  theme?: Theme;
  slides: SlideSpec[];
  validate?: boolean; // run post-build validation on each slide, default false
}

/**
 * Build an entire presentation in one call: create presentation,
 * remove the default blank slide, then create and populate each slide
 * with elements, background colors, and speaker notes.
 */
export async function presentationBuildTool(
  client: SlidesClient,
  params: PresentationBuildParams
): Promise<ToolResponse> {
  const warnings: string[] = [];

  try {
    // 1. Create the presentation
    const presentation = await client.createPresentation(params.title);
    const presentationId = presentation.presentationId!;

    // 2. If theme provided, set master page color scheme
    if (params.theme) {
      try {
        await applyThemeColorScheme(client, presentationId, params.theme);
      } catch (err: any) {
        // Non-fatal: color scheme is optional
        warnings.push(`Could not set master color scheme: ${err.message}`);
      }
    }

    // 3. Get the default blank slide ID so we can delete it after creating our slides
    const freshPresentation = await client.getPresentation(presentationId);
    const defaultSlideId = freshPresentation.slides?.[0]?.objectId;

    // 4. Create all slides with backgrounds
    const slideResults: Array<{ slideId: string; elementIds: string[] }> = [];

    for (let i = 0; i < params.slides.length; i++) {
      const spec = params.slides[i];
      const slideId = genId('slide');

      // Resolve background color from theme if needed
      let bgColor = spec.backgroundColor;
      if (bgColor && params.theme) {
        bgColor = resolveColor(bgColor, params.theme) || bgColor;
      }

      // Create the slide
      const createRequests: any[] = [
        {
          createSlide: {
            objectId: slideId,
            insertionIndex: i,
          },
        },
      ];

      // Set background color if specified
      if (bgColor) {
        createRequests.push({
          updatePageProperties: {
            objectId: slideId,
            pageProperties: {
              pageBackgroundFill: {
                solidFill: { color: { rgbColor: parseHexColor(bgColor) } },
              },
            },
            fields: 'pageBackgroundFill.solidFill',
          },
        });
      }

      await client.batchUpdate(presentationId, createRequests);

      // Build elements on this slide via existing slideBuildTool
      let elementIds: string[] = [];
      if (spec.elements && spec.elements.length > 0) {
        const buildResult = await slideBuildTool(client, {
          presentationId,
          slideId,
          elements: spec.elements,
          theme: params.theme,
          validate: params.validate,
          slideBgColor: spec.backgroundColor,
        });

        if (buildResult.success && buildResult.data?.elementIds) {
          elementIds = buildResult.data.elementIds;
          // Collect validation warnings from slide build
          if (buildResult.data?.warnings) {
            for (const w of buildResult.data.warnings) {
              warnings.push(`Slide ${i} (${slideId}): ${w.type}: ${w.message}`);
            }
          }
        } else if (!buildResult.success) {
          warnings.push(`Slide ${i}: element build failed: ${(buildResult as any).error?.message}`);
        }
      }

      // Set speaker notes if provided
      if (spec.notes) {
        try {
          await setSlideNotes(client, presentationId, slideId, spec.notes);
        } catch (err: any) {
          warnings.push(`Slide ${i}: could not set notes: ${err.message}`);
        }
      }

      slideResults.push({ slideId, elementIds });
    }

    // 5. Delete the default blank slide (it's now at the end since we inserted at indices 0..n)
    if (defaultSlideId) {
      try {
        await client.batchUpdate(presentationId, [
          { deleteObject: { objectId: defaultSlideId } },
        ]);
      } catch (err: any) {
        warnings.push(`Could not delete default blank slide: ${err.message}`);
      }
    }

    const url = `https://docs.google.com/presentation/d/${presentationId}`;
    const responseData: any = {
      presentationId,
      url,
      slideCount: slideResults.length,
    };
    if (warnings.length > 0) {
      responseData.warnings = warnings.join('; ');
    }

    return createSuccessResponse(
      formatResponse('complex', `Built presentation "${params.title}" with ${slideResults.length} slides`, responseData),
      {
        presentationId,
        url,
        slides: slideResults,
        warnings: warnings.length > 0 ? warnings : undefined,
      }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}

/**
 * Set speaker notes on a slide. We need to read the slide to find the notes
 * body element ID, then clear + insert text.
 */
async function setSlideNotes(
  client: SlidesClient,
  presentationId: string,
  slideId: string,
  text: string
): Promise<void> {
  const slide = await client.getSlide(presentationId, slideId);
  const elements: any[] = (slide as any).slideProperties?.notesPage?.pageElements ?? [];
  const body = elements.find(
    (el: any) => el.shape?.placeholder?.type === 'BODY'
  );
  const notesBodyId = body?.objectId;
  if (!notesBodyId) return;

  const requests: any[] = [
    {
      deleteText: {
        objectId: notesBodyId,
        textRange: { type: 'ALL' },
      },
    },
  ];

  if (text) {
    requests.push({
      insertText: {
        objectId: notesBodyId,
        insertionIndex: 0,
        text,
      },
    });
  }

  await client.batchUpdate(presentationId, requests);
}

/**
 * Apply theme colors to the master page's color scheme.
 * Maps theme color keys to Google Slides ThemeColorType values.
 */
async function applyThemeColorScheme(
  client: SlidesClient,
  presentationId: string,
  theme: Theme
): Promise<void> {
  const presentation = await client.getPresentation(presentationId);

  // Find the master page ID
  const masters = (presentation as any).masters;
  if (!masters || masters.length === 0) return;
  const masterPageId = masters[0].objectId;
  if (!masterPageId) return;

  const c = theme.colors;
  const colorPairs: Array<{ type: string; color: string }> = [
    { type: 'DARK1', color: c.bg_dark },
    { type: 'LIGHT1', color: c.bg_light },
    { type: 'DARK2', color: c.text_primary },
    { type: 'LIGHT2', color: c.bg_surface },
    { type: 'ACCENT1', color: c.accent },
    { type: 'ACCENT2', color: c.bg_surface_dk },
    { type: 'ACCENT3', color: c.text_secondary },
    { type: 'ACCENT4', color: c.text_muted },
    { type: 'ACCENT5', color: c.text_muted_dk },
    { type: 'ACCENT6', color: c.divider_dk },
    { type: 'HYPERLINK', color: c.accent },
    { type: 'FOLLOWED_HYPERLINK', color: c.text_muted },
  ];

  const colorScheme = colorPairs.map(({ type, color }) => ({
    type,
    color: parseHexColor(color),
  }));

  await client.batchUpdate(presentationId, [
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
}
