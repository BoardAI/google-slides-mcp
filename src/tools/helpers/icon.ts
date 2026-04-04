import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface AddIconParams {
  presentationId: string;
  slideId: string;
  icon: string;
  x: number;
  y: number;
  size?: number;       // pt, default 24
  color?: string;      // hex without #, default "000000"
  style?: string;      // icons8 style, default "ios-filled"
}

const EMU_PER_POINT = 12700;

// Icons8 URL builder
function buildIconUrl(icon: string, color: string, style: string): string {
  return `https://img.icons8.com/${style}/100/${color}/${icon}.png`;
}

export async function addIconTool(
  client: SlidesClient,
  params: AddIconParams
): Promise<ToolResponse> {
  const {
    presentationId,
    slideId,
    icon,
    x,
    y,
    size = 24,
    color = '000000',
    style = 'ios-filled',
  } = params;

  if (!icon) {
    return createErrorResponse('validation', 'Icon name is required (e.g. "search--v1", "shield", "edit--v1")');
  }

  // Strip # from color if provided
  const cleanColor = color.replace('#', '');

  const url = buildIconUrl(icon, cleanColor, style);
  const elementId = `icon_${Date.now()}`;
  const sizePt = size * EMU_PER_POINT;
  const xEmu = x * EMU_PER_POINT;
  const yEmu = y * EMU_PER_POINT;

  try {
    const response = await client.batchUpdate(presentationId, [
      {
        createImage: {
          objectId: elementId,
          url,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: sizePt, unit: 'EMU' },
              height: { magnitude: sizePt, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: xEmu,
              translateY: yEmu,
              unit: 'EMU',
            },
          },
        },
      },
    ]);

    const createdId = response.replies?.[0]?.createImage?.objectId ?? elementId;

    return createSuccessResponse(
      formatResponse('simple', `Added icon "${icon}" (${size}pt, #${cleanColor})`),
      { elementId: createdId, icon, url, size, color: cleanColor }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    // Provide a helpful message if the icon slug was bad
    if (error.message?.includes('problem retrieving the image')) {
      return createErrorResponse(
        'validation',
        `Icon "${icon}" not found on Icons8. Check the slug at https://icons8.com/icons/set/${icon}. Common slugs: search--v1, shield, edit--v1, book, bar-chart, handshake, conference-call, data-configuration, robot-2, visible, link, money, document, clock--v1, flash-on, lock, checkmark, goal, star`,
      );
    }
    return createErrorResponse('api', error.message);
  }
}
