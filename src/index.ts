#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OAuthManager, OAuthCredentials } from './auth/oauth.js';
import { TokenStore } from './auth/token-store.js';
import { SlidesClient } from './google/client.js';
import {
  createPresentationTool,
  CreatePresentationParams,
  getPresentationTool,
  GetPresentationParams,
  presentationListTool,
  PresentationListParams,
  presentationExportTool,
  PresentationExportParams,
  createFromTemplateTool,
  CreateFromTemplateParams,
  presentationRenameTool,
  PresentationRenameParams,
} from './tools/presentation/index.js';
import {
  createSlideTool,
  CreateSlideParams,
  deleteSlideTool,
  DeleteSlideParams,
  duplicateSlideTool,
  DuplicateSlideParams,
  slideGetTool,
  SlideGetParams,
  slideReorderTool,
  SlideReorderParams,
  slideSetBackgroundTool,
  SlideSetBackgroundParams,
  slideThumbnailTool,
  SlideThumbnailParams,
  slideGetNotesTool,
  SlideGetNotesParams,
  slideSetNotesTool,
  SlideSetNotesParams,
} from './tools/slide/index.js';
import {
  deleteElementTool,
  DeleteElementParams,
  elementGetTool,
  ElementGetParams,
  elementUpdateTextTool,
  ElementUpdateTextParams,
  elementMoveResizeTool,
  ElementMoveResizeParams,
  elementAddShapeTool,
  ElementAddShapeParams,
  elementStyleTool,
  ElementStyleParams,
  elementFormatTextTool,
  ElementFormatTextParams,
  elementFindTool,
  ElementFindParams,
  elementReplaceImageTool,
  ElementReplaceImageParams,
  elementDuplicateTool,
  ElementDuplicateParams,
  elementZOrderTool,
  ElementZOrderParams,
  elementGroupTool,
  ElementGroupParams,
  elementUngroupTool,
  ElementUngroupParams,
  elementSetLinkTool,
  ElementSetLinkParams,
} from './tools/element/index.js';
import {
  addTextBoxTool,
  AddTextBoxParams,
} from './tools/helpers/text.js';
import {
  addImageTool,
  AddImageParams,
} from './tools/helpers/image.js';
import {
  addTableTool,
  AddTableParams,
} from './tools/helpers/table.js';
import {
  tableSetCellTool,
  tableFormatCellTextTool,
  tableStyleCellTool,
  tableInsertRowsTool,
  tableDeleteRowsTool,
  tableSetRowHeightTool,
  tableInsertColumnsTool,
  tableDeleteColumnsTool,
  tableSetColumnWidthTool,
  tableMergeCellsTool,
  tableUnmergeCellsTool,
  TableUnmergeCellsParams,
  TableSetCellParams,
  TableFormatCellTextParams,
  TableStyleCellParams,
  TableInsertRowsParams,
  TableDeleteRowsParams,
  TableSetRowHeightParams,
  TableInsertColumnsParams,
  TableDeleteColumnsParams,
  TableSetColumnWidthParams,
  TableMergeCellsParams,
} from './tools/table/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load credentials from config file
function loadCredentials(): OAuthCredentials {
  const credentialsPath = join(__dirname, '..', 'config', 'credentials.json');
  try {
    const credentialsData = readFileSync(credentialsPath, 'utf-8');
    return JSON.parse(credentialsData);
  } catch (error: any) {
    console.error('❌ Error loading credentials.json');
    console.error('Please ensure config/credentials.json exists with your OAuth credentials.');
    console.error('See config/credentials.example.json for the required format.');
    process.exit(1);
  }
}

// Initialize OAuth and check authentication
async function initializeAuth(): Promise<{ oauthManager: OAuthManager; client: SlidesClient }> {
  const credentials = loadCredentials();
  const tokenStore = new TokenStore();
  const oauthManager = new OAuthManager(credentials, tokenStore);

  // Check if already authenticated
  const isAuthenticated = await oauthManager.isAuthenticated();

  if (!isAuthenticated) {
    console.error('🔐 Not authenticated. Starting OAuth flow...\n');
    try {
      await oauthManager.authenticate();
    } catch (error: any) {
      console.error('❌ Authentication failed:', error.message);
      process.exit(1);
    }
  }

  const client = new SlidesClient(oauthManager);
  return { oauthManager, client };
}

// Main server setup
async function main() {
  console.error('🚀 Starting Google Slides MCP Server...\n');

  // Initialize authentication
  const { client } = await initializeAuth();

  console.error('✅ Authentication successful!\n');

  // Create MCP server
  const server = new Server(
    {
      name: 'google-slides-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'presentation_create',
          description: 'Create a new Google Slides presentation',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The title of the new presentation',
              },
            },
            required: ['title'],
          },
        },
        {
          name: 'presentation_get',
          description: 'Get details of an existing Google Slides presentation',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation to retrieve',
              },
            },
            required: ['presentationId'],
          },
        },
        {
          name: 'presentation_create_from_template',
          description: 'Copy an existing presentation as a template, then replace placeholder tokens (e.g. "{{name}}" → "Alice") throughout the copy',
          inputSchema: {
            type: 'object',
            properties: {
              templateId: { type: 'string', description: 'The ID of the presentation to use as a template' },
              title: { type: 'string', description: 'Title for the new presentation' },
              replacements: {
                type: 'object',
                description: 'Token → value map, e.g. { "{{name}}": "Alice", "{{date}}": "Feb 2026" }',
                additionalProperties: { type: 'string' },
              },
            },
            required: ['templateId', 'title'],
          },
        },
        {
          name: 'presentation_export',
          description: 'Export a presentation to a local file as PDF or PPTX',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation to export' },
              outputPath: { type: 'string', description: 'Absolute local file path to write to, e.g. "/tmp/slides.pdf"' },
              format: {
                type: 'string',
                enum: ['pdf', 'pptx'],
                description: 'Export format: "pdf" (default) or "pptx"',
              },
            },
            required: ['presentationId', 'outputPath'],
          },
        },
        {
          name: 'presentation_list',
          description: 'List presentations in Google Drive, optionally filtered by name. Returns presentation IDs, names, and links.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Filter by name (case-insensitive substring match, e.g. "Budget")',
              },
              limit: {
                type: 'integer',
                description: 'Maximum number of results to return (1–100, default 20)',
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: 'presentation_rename',
          description: 'Rename a Google Slides presentation',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation to rename' },
              title: { type: 'string', description: 'The new title for the presentation' },
            },
            required: ['presentationId', 'title'],
          },
        },
        {
          name: 'slide_create',
          description: 'Create a new slide in a presentation',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              insertionIndex: {
                type: 'number',
                description: 'Optional zero-based index where the slide should be inserted',
              },
            },
            required: ['presentationId'],
          },
        },
        {
          name: 'slide_delete',
          description: 'Delete a slide from a presentation',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide to delete',
              },
            },
            required: ['presentationId', 'slideId'],
          },
        },
        {
          name: 'slide_duplicate',
          description: 'Duplicate a slide in a presentation',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide to duplicate',
              },
              insertionIndex: {
                type: 'number',
                description: 'Optional zero-based index where the duplicated slide should be inserted',
              },
            },
            required: ['presentationId', 'slideId'],
          },
        },
        {
          name: 'slide_get',
          description: 'Get all elements on a slide with their IDs, types, positions, and text content. Identify the slide by slideId or slideIndex (0-based).',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide (provide this or slideIndex)',
              },
              slideIndex: {
                type: 'integer',
                description: 'Zero-based position of the slide (provide this or slideId)',
                minimum: 0,
              },
              detailed: {
                type: 'boolean',
                description: 'When true, includes full raw API properties for each element (default: false)',
              },
            },
            required: ['presentationId'],
          },
        },
        {
          name: 'slide_reorder',
          description: 'Move a slide to a different position in the presentation (0-based index)',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide to move',
              },
              insertionIndex: {
                type: 'number',
                description: 'The 0-based position to move the slide to (e.g. 0 = first, 1 = second)',
              },
            },
            required: ['presentationId', 'slideId', 'insertionIndex'],
          },
        },
        {
          name: 'slide_thumbnail',
          description: 'Get a PNG thumbnail URL for a slide. The URL is temporary (~30 min). Identify the slide by slideId or slideIndex.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              slideId: { type: 'string', description: 'The ID of the slide (provide this or slideIndex)' },
              slideIndex: { type: 'integer', description: 'Zero-based slide position (provide this or slideId)', minimum: 0 },
              size: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'], description: 'Thumbnail size (default: LARGE)' },
            },
            required: ['presentationId'],
          },
        },
        {
          name: 'slide_set_background',
          description: 'Set a slide\'s background to a solid color or an image',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide',
              },
              color: {
                type: 'string',
                description: 'Background color as hex, e.g. "#1A1A2E". Cannot be used with imageUrl.',
              },
              imageUrl: {
                type: 'string',
                description: 'Public HTTPS URL of a background image. Cannot be used with color.',
              },
            },
            required: ['presentationId', 'slideId'],
          },
        },
        {
          name: 'element_delete',
          description: 'Delete an element (text box, shape, image, etc.) from a slide',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              elementId: {
                type: 'string',
                description: 'The ID of the element to delete',
              },
            },
            required: ['presentationId', 'elementId'],
          },
        },
        {
          name: 'element_get',
          description: 'Get details of a specific element by ID (position, size, type, text content)',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              elementId: {
                type: 'string',
                description: 'The ID of the element to retrieve',
              },
              slideId: {
                type: 'string',
                description: 'Optional: ID of the slide to scope the search to. Produces a more specific error if the element is not on that slide.',
              },
              detailed: {
                type: 'boolean',
                description: 'When true, includes full raw API properties (default: false)',
              },
            },
            required: ['presentationId', 'elementId'],
          },
        },
        {
          name: 'element_update_text',
          description: 'Replace the text content of an existing element (clears existing text, inserts new text)',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              elementId: {
                type: 'string',
                description: 'The ID of the element to update',
              },
              text: {
                type: 'string',
                description: 'The new text content — replaces all existing text',
              },
            },
            required: ['presentationId', 'elementId', 'text'],
          },
        },
        {
          name: 'element_move_resize',
          description: 'Move and/or resize an existing element by setting new position (x, y) and/or size (width, height) in points',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              elementId: {
                type: 'string',
                description: 'The ID of the element to move or resize',
              },
              x: {
                type: 'number',
                description: 'New x position in points (distance from left edge of slide)',
              },
              y: {
                type: 'number',
                description: 'New y position in points (distance from top edge of slide)',
              },
              width: {
                type: 'number',
                description: 'New width in points',
              },
              height: {
                type: 'number',
                description: 'New height in points',
              },
            },
            required: ['presentationId', 'elementId'],
          },
        },
        {
          name: 'element_add_shape',
          description: 'Add a shape (rectangle, ellipse, arrow, star, etc.) to a slide. Use element_move_resize to reposition afterward.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide to add the shape to',
              },
              shapeType: {
                type: 'string',
                description: 'Shape type, e.g. RECTANGLE, ELLIPSE, TRIANGLE, RIGHT_ARROW, LEFT_ARROW, STAR_5, HEART, DIAMOND, etc.',
              },
              x: {
                type: 'number',
                description: 'X position in points from left edge (default: 100)',
              },
              y: {
                type: 'number',
                description: 'Y position in points from top edge (default: 100)',
              },
              width: {
                type: 'number',
                description: 'Width in points (default: 200)',
              },
              height: {
                type: 'number',
                description: 'Height in points (default: 150)',
              },
            },
            required: ['presentationId', 'slideId', 'shapeType'],
          },
        },
        {
          name: 'element_style',
          description: 'Set fill color, border color, and/or border width on a shape or text box element',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              elementId: {
                type: 'string',
                description: 'The ID of the element to style',
              },
              fillColor: {
                type: 'string',
                description: 'Fill/background color as hex, e.g. "#FF0000" for red',
              },
              borderColor: {
                type: 'string',
                description: 'Border/outline color as hex, e.g. "#000000" for black',
              },
              borderWidth: {
                type: 'number',
                description: 'Border width in points, e.g. 1 or 2',
              },
            },
            required: ['presentationId', 'elementId'],
          },
        },
        {
          name: 'element_find',
          description: 'Search for elements across all slides (or one slide) by type, shape type, or text content. Returns matching elements with their slide location.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              slideId: { type: 'string', description: 'Limit search to this slide ID (optional)' },
              slideIndex: { type: 'integer', description: 'Limit search to this slide (0-based, optional)', minimum: 0 },
              type: {
                type: 'string',
                enum: ['SHAPE', 'IMAGE', 'TABLE', 'LINE', 'VIDEO', 'WORD_ART', 'SHEETS_CHART'],
                description: 'Filter by element type',
              },
              shapeType: {
                type: 'string',
                description: 'Filter shapes by shape type, e.g. "TEXT_BOX", "RECTANGLE", "ELLIPSE"',
              },
              text: {
                type: 'string',
                description: 'Filter by text content (case-insensitive substring match)',
              },
            },
            required: ['presentationId'],
          },
        },
        {
          name: 'element_set_link',
          description: 'Add or remove a hyperlink on an element or a text range within it. Pass an empty string for url to remove an existing link.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              elementId: { type: 'string', description: 'The ID of the element' },
              url: { type: 'string', description: 'HTTPS URL to link to, e.g. "https://example.com". Pass empty string to remove the link.' },
              startIndex: { type: 'integer', description: 'Start of character range (inclusive, 0-based). Omit to apply to all text.', minimum: 0 },
              endIndex: { type: 'integer', description: 'End of character range (exclusive). Omit to apply to all text.', minimum: 1 },
            },
            required: ['presentationId', 'elementId', 'url'],
          },
        },
        {
          name: 'element_z_order',
          description: 'Change the z-order (layering) of one or more elements on a slide: bring to front, send to back, move forward one step, or move backward one step',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              elementIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs of the elements to reorder (must be on the same slide)',
                minItems: 1,
              },
              operation: {
                type: 'string',
                enum: ['BRING_TO_FRONT', 'SEND_TO_BACK', 'BRING_FORWARD', 'SEND_BACKWARD'],
                description: 'BRING_TO_FRONT: move above all others; SEND_TO_BACK: move below all others; BRING_FORWARD / SEND_BACKWARD: move one step',
              },
            },
            required: ['presentationId', 'elementIds', 'operation'],
          },
        },
        {
          name: 'element_group',
          description: 'Group two or more elements so they can be moved, resized, and styled as a unit. Returns the new group element ID.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              elementIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs of the elements to group (must be on the same slide, minimum 2)',
                minItems: 2,
              },
            },
            required: ['presentationId', 'elementIds'],
          },
        },
        {
          name: 'element_ungroup',
          description: 'Ungroup one or more group elements, releasing their children back to the slide as independent elements',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              groupIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs of the group elements to ungroup (minimum 1)',
                minItems: 1,
              },
            },
            required: ['presentationId', 'groupIds'],
          },
        },
        {
          name: 'element_duplicate',
          description: 'Duplicate an existing element on a slide, creating an identical copy with a new element ID',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              elementId: { type: 'string', description: 'The ID of the element to duplicate' },
            },
            required: ['presentationId', 'elementId'],
          },
        },
        {
          name: 'slide_get_notes',
          description: 'Get the speaker notes text for a slide. Identify the slide by slideId or slideIndex (0-based).',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              slideId: { type: 'string', description: 'The ID of the slide (provide this or slideIndex)' },
              slideIndex: { type: 'integer', description: 'Zero-based slide position (provide this or slideId)', minimum: 0 },
            },
            required: ['presentationId'],
          },
        },
        {
          name: 'slide_set_notes',
          description: 'Set (replace) the speaker notes text for a slide. Pass an empty string to clear notes.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              slideId: { type: 'string', description: 'The ID of the slide (provide this or slideIndex)' },
              slideIndex: { type: 'integer', description: 'Zero-based slide position (provide this or slideId)', minimum: 0 },
              text: { type: 'string', description: 'New speaker notes text. Pass empty string to clear.' },
            },
            required: ['presentationId', 'text'],
          },
        },
        {
          name: 'element_replace_image',
          description: 'Replace the image content of an existing image element with a new URL, preserving its position, size, and element ID',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              elementId: { type: 'string', description: 'The ID of the image element to update' },
              url: { type: 'string', description: 'Public HTTPS URL of the replacement image' },
              imageReplaceMethod: {
                type: 'string',
                enum: ['CENTER_CROP'],
                description: 'How to fit the new image: CENTER_CROP scales and crops to fill the frame. Omit to preserve aspect ratio.',
              },
            },
            required: ['presentationId', 'elementId', 'url'],
          },
        },
        {
          name: 'add_image',
          description: 'Insert an image from a public HTTPS URL onto a slide',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide to add the image to',
              },
              url: {
                type: 'string',
                description: 'Public HTTPS URL of the image (PNG, JPG, GIF, SVG)',
              },
              x: {
                type: 'number',
                description: 'X position in points from left edge (default: 100)',
              },
              y: {
                type: 'number',
                description: 'Y position in points from top edge (default: 100)',
              },
              width: {
                type: 'number',
                description: 'Width in points. If omitted, Google uses the image\'s native width.',
              },
              height: {
                type: 'number',
                description: 'Height in points. If omitted, Google uses the image\'s native height.',
              },
            },
            required: ['presentationId', 'slideId', 'url'],
          },
        },
        {
          name: 'element_format_text',
          description: 'Apply text formatting (bold, italic, font size, color, alignment, bullets, etc.) to all or a character range of an element. Use startIndex/endIndex to target a substring; omit both to format all text.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              elementId: { type: 'string', description: 'The ID of the element to format' },
              startIndex: { type: 'integer', description: 'Start of character range (inclusive, 0-based). Omit to start from beginning.', minimum: 0 },
              endIndex: { type: 'integer', description: 'End of character range (exclusive). Omit to extend to end of text.', minimum: 1 },
              bold: { type: 'boolean', description: 'Set bold on or off' },
              italic: { type: 'boolean', description: 'Set italic on or off' },
              underline: { type: 'boolean', description: 'Set underline on or off' },
              strikethrough: { type: 'boolean', description: 'Set strikethrough on or off' },
              fontSize: { type: 'number', description: 'Font size in points, e.g. 18', exclusiveMinimum: 0 },
              fontFamily: { type: 'string', description: 'Font family name, e.g. "Arial" or "Georgia"' },
              foregroundColor: { type: 'string', description: 'Text color as hex, e.g. "#FF0000"' },
              backgroundColor: { type: 'string', description: 'Text highlight/background color as hex, e.g. "#FFFF00"' },
              alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], description: 'Paragraph alignment' },
              lineSpacing: { type: 'number', description: 'Line spacing as a percentage, e.g. 150 for 1.5×', minimum: 0 },
              spaceAbove: { type: 'number', description: 'Space above paragraph in points', minimum: 0 },
              spaceBelow: { type: 'number', description: 'Space below paragraph in points', minimum: 0 },
              bulletPreset: { type: ['string', 'null'], description: 'Apply a bullet/numbered list preset (e.g. "BULLET_DISC_CIRCLE_SQUARE", "NUMBERED_DIGIT_ALPHA_ROMAN"), or null to remove bullets' },
            },
            required: ['presentationId', 'elementId'],
          },
        },
        {
          name: 'add_table',
          description: 'Insert a table onto a slide with a specified number of rows and columns',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              slideId: { type: 'string', description: 'The ID of the slide to add the table to' },
              rows: { type: 'integer', description: 'Number of rows', minimum: 1 },
              columns: { type: 'integer', description: 'Number of columns', minimum: 1 },
              x: { type: 'number', description: 'X position in points from left edge (default: 100)' },
              y: { type: 'number', description: 'Y position in points from top edge (default: 100)' },
              width: { type: 'number', description: 'Width in points (default: 400)' },
              height: { type: 'number', description: 'Height in points (default: 200)' },
            },
            required: ['presentationId', 'slideId', 'rows', 'columns'],
          },
        },
        {
          name: 'table_set_cell',
          description: 'Set the text content of a table cell, replacing any existing text',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              row: { type: 'integer', description: 'Row index (0-based)', minimum: 0 },
              column: { type: 'integer', description: 'Column index (0-based)', minimum: 0 },
              text: { type: 'string', description: 'Text to place in the cell. Pass empty string to clear.' },
            },
            required: ['presentationId', 'tableId', 'row', 'column', 'text'],
          },
        },
        {
          name: 'table_format_cell_text',
          description: 'Apply text formatting (bold, font size, color, alignment, etc.) to all or a character range within a table cell',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              row: { type: 'integer', description: 'Row index (0-based)', minimum: 0 },
              column: { type: 'integer', description: 'Column index (0-based)', minimum: 0 },
              startIndex: { type: 'integer', description: 'Start of character range (inclusive, 0-based). Omit to start from beginning.', minimum: 0 },
              endIndex: { type: 'integer', description: 'End of character range (exclusive). Omit to extend to end of text.', minimum: 1 },
              bold: { type: 'boolean' },
              italic: { type: 'boolean' },
              underline: { type: 'boolean' },
              strikethrough: { type: 'boolean' },
              fontSize: { type: 'number', description: 'Font size in points', exclusiveMinimum: 0 },
              fontFamily: { type: 'string', description: 'Font family name, e.g. "Arial"' },
              foregroundColor: { type: 'string', description: 'Text color as hex, e.g. "#FF0000"' },
              backgroundColor: { type: 'string', description: 'Text highlight color as hex' },
              alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] },
            },
            required: ['presentationId', 'tableId', 'row', 'column'],
          },
        },
        {
          name: 'table_style_cell',
          description: 'Set background color and/or padding (contentInsets) on a table cell or a range of cells',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              row: { type: 'integer', description: 'Top-left row index (0-based)', minimum: 0 },
              column: { type: 'integer', description: 'Top-left column index (0-based)', minimum: 0 },
              rowSpan: { type: 'integer', description: 'Number of rows to style (default: 1)', minimum: 1 },
              columnSpan: { type: 'integer', description: 'Number of columns to style (default: 1)', minimum: 1 },
              backgroundColor: { type: 'string', description: 'Cell background color as hex, e.g. "#FF0000"' },
              paddingTop: { type: 'number', description: 'Top padding in points', minimum: 0 },
              paddingBottom: { type: 'number', description: 'Bottom padding in points', minimum: 0 },
              paddingLeft: { type: 'number', description: 'Left padding in points', minimum: 0 },
              paddingRight: { type: 'number', description: 'Right padding in points', minimum: 0 },
            },
            required: ['presentationId', 'tableId', 'row', 'column'],
          },
        },
        {
          name: 'table_insert_rows',
          description: 'Insert one or more rows into a table above or below a reference row',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              rowIndex: { type: 'integer', description: 'Reference row index (0-based)', minimum: 0 },
              count: { type: 'integer', description: 'Number of rows to insert (default: 1)', minimum: 1 },
              insertBelow: { type: 'boolean', description: 'Insert below the reference row (default: true). Set false to insert above.' },
            },
            required: ['presentationId', 'tableId', 'rowIndex'],
          },
        },
        {
          name: 'table_delete_rows',
          description: 'Delete one or more rows from a table by their indices',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              rowIndices: { type: 'array', items: { type: 'integer', minimum: 0 }, description: 'Row indices to delete (0-based). Multiple indices are deleted highest-first to avoid shifting.' },
            },
            required: ['presentationId', 'tableId', 'rowIndices'],
          },
        },
        {
          name: 'table_set_row_height',
          description: 'Set the minimum row height for one or more table rows (rows may grow taller to fit content)',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              rowIndices: { type: 'array', items: { type: 'integer', minimum: 0 }, description: 'Row indices to set height for (0-based)' },
              minHeight: { type: 'number', description: 'Minimum row height in points', exclusiveMinimum: 0 },
            },
            required: ['presentationId', 'tableId', 'rowIndices', 'minHeight'],
          },
        },
        {
          name: 'table_insert_columns',
          description: 'Insert one or more columns into a table left or right of a reference column',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              columnIndex: { type: 'integer', description: 'Reference column index (0-based)', minimum: 0 },
              count: { type: 'integer', description: 'Number of columns to insert (default: 1)', minimum: 1 },
              insertRight: { type: 'boolean', description: 'Insert to the right of the reference column (default: true). Set false to insert to the left.' },
            },
            required: ['presentationId', 'tableId', 'columnIndex'],
          },
        },
        {
          name: 'table_delete_columns',
          description: 'Delete one or more columns from a table by their indices',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              columnIndices: { type: 'array', items: { type: 'integer', minimum: 0 }, description: 'Column indices to delete (0-based). Multiple indices are deleted highest-first to avoid shifting.' },
            },
            required: ['presentationId', 'tableId', 'columnIndices'],
          },
        },
        {
          name: 'table_set_column_width',
          description: 'Set the width of one or more table columns',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              columnIndices: { type: 'array', items: { type: 'integer', minimum: 0 }, description: 'Column indices to resize (0-based)' },
              width: { type: 'number', description: 'Column width in points', exclusiveMinimum: 0 },
            },
            required: ['presentationId', 'tableId', 'columnIndices', 'width'],
          },
        },
        {
          name: 'table_merge_cells',
          description: 'Merge a rectangular range of table cells into one cell',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              row: { type: 'integer', description: 'Top-left row index (0-based)', minimum: 0 },
              column: { type: 'integer', description: 'Top-left column index (0-based)', minimum: 0 },
              rowSpan: { type: 'integer', description: 'Number of rows to merge', minimum: 1 },
              columnSpan: { type: 'integer', description: 'Number of columns to merge', minimum: 1 },
            },
            required: ['presentationId', 'tableId', 'row', 'column', 'rowSpan', 'columnSpan'],
          },
        },
        {
          name: 'table_unmerge_cells',
          description: 'Unmerge a previously merged range of table cells, splitting them back into individual cells',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string', description: 'The ID of the presentation' },
              tableId: { type: 'string', description: 'The ID of the table element' },
              row: { type: 'integer', description: 'Top-left row index of the merged range (0-based)', minimum: 0 },
              column: { type: 'integer', description: 'Top-left column index of the merged range (0-based)', minimum: 0 },
              rowSpan: { type: 'integer', description: 'Number of rows in the merged range', minimum: 1 },
              columnSpan: { type: 'integer', description: 'Number of columns in the merged range', minimum: 1 },
            },
            required: ['presentationId', 'tableId', 'row', 'column', 'rowSpan', 'columnSpan'],
          },
        },
        {
          name: 'add_text_box',
          description: 'Add a text box to a slide with specified content and position',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: {
                type: 'string',
                description: 'The ID of the presentation',
              },
              slideId: {
                type: 'string',
                description: 'The ID of the slide',
              },
              text: {
                type: 'string',
                description: 'The text content',
              },
              x: {
                type: 'number',
                description: 'X position in points (default: 100)',
              },
              y: {
                type: 'number',
                description: 'Y position in points (default: 100)',
              },
              width: {
                type: 'number',
                description: 'Width in points (default: 300)',
              },
              height: {
                type: 'number',
                description: 'Height in points (default: 50)',
              },
            },
            required: ['presentationId', 'slideId', 'text'],
          },
        },
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'presentation_create': {
          const params = args as unknown as CreatePresentationParams;
          const result = await createPresentationTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'presentation_create_from_template': {
          const params = args as unknown as CreateFromTemplateParams;
          const result = await createFromTemplateTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'presentation_export': {
          const params = args as unknown as PresentationExportParams;
          const result = await presentationExportTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'presentation_list': {
          const params = args as unknown as PresentationListParams;
          const result = await presentationListTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'presentation_rename': {
          const params = args as unknown as PresentationRenameParams;
          const result = await presentationRenameTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'presentation_get': {
          const params = args as unknown as GetPresentationParams;
          const result = await getPresentationTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'slide_create': {
          const params = args as unknown as CreateSlideParams;
          const result = await createSlideTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'slide_delete': {
          const params = args as unknown as DeleteSlideParams;
          const result = await deleteSlideTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'slide_duplicate': {
          const params = args as unknown as DuplicateSlideParams;
          const result = await duplicateSlideTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'slide_get': {
          const params = args as unknown as SlideGetParams;
          const result = await slideGetTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'slide_reorder': {
          const params = args as unknown as SlideReorderParams;
          const result = await slideReorderTool(client, params);

          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return {
              content: [{ type: 'text', text: `Error: ${result.error.message}` }],
              isError: true,
            };
          }
        }

        case 'slide_thumbnail': {
          const params = args as unknown as SlideThumbnailParams;
          const result = await slideThumbnailTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'slide_set_background': {
          const params = args as unknown as SlideSetBackgroundParams;
          const result = await slideSetBackgroundTool(client, params);

          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return {
              content: [{ type: 'text', text: `Error: ${result.error.message}` }],
              isError: true,
            };
          }
        }

        case 'element_delete': {
          const params = args as unknown as DeleteElementParams;
          const result = await deleteElementTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'element_get': {
          const params = args as unknown as ElementGetParams;
          const result = await elementGetTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'element_update_text': {
          const params = args as unknown as ElementUpdateTextParams;
          const result = await elementUpdateTextTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'element_move_resize': {
          const params = args as unknown as ElementMoveResizeParams;
          const result = await elementMoveResizeTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'element_add_shape': {
          const params = args as unknown as ElementAddShapeParams;
          const result = await elementAddShapeTool(client, params);

          if (result.success) {
            return {
              content: [{ type: 'text', text: result.message }],
            };
          } else {
            return {
              content: [{ type: 'text', text: `Error: ${result.error.message}` }],
              isError: true,
            };
          }
        }

        case 'element_style': {
          const params = args as unknown as ElementStyleParams;
          const result = await elementStyleTool(client, params);

          if (result.success) {
            return {
              content: [{ type: 'text', text: result.message }],
            };
          } else {
            return {
              content: [{ type: 'text', text: `Error: ${result.error.message}` }],
              isError: true,
            };
          }
        }

        case 'element_replace_image': {
          const params = args as unknown as ElementReplaceImageParams;
          const result = await elementReplaceImageTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'element_duplicate': {
          const params = args as unknown as ElementDuplicateParams;
          const result = await elementDuplicateTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'element_set_link': {
          const params = args as unknown as ElementSetLinkParams;
          const result = await elementSetLinkTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'element_z_order': {
          const params = args as unknown as ElementZOrderParams;
          const result = await elementZOrderTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'element_group': {
          const params = args as unknown as ElementGroupParams;
          const result = await elementGroupTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'element_ungroup': {
          const params = args as unknown as ElementUngroupParams;
          const result = await elementUngroupTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'slide_get_notes': {
          const params = args as unknown as SlideGetNotesParams;
          const result = await slideGetNotesTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'slide_set_notes': {
          const params = args as unknown as SlideSetNotesParams;
          const result = await slideSetNotesTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'element_find': {
          const params = args as unknown as ElementFindParams;
          const result = await elementFindTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'element_format_text': {
          const params = args as unknown as ElementFormatTextParams;
          const result = await elementFormatTextTool(client, params);

          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return {
              content: [{ type: 'text', text: `Error: ${result.error.message}` }],
              isError: true,
            };
          }
        }

        case 'add_table': {
          const params = args as unknown as AddTableParams;
          const result = await addTableTool(client, params);

          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return {
              content: [{ type: 'text', text: `Error: ${result.error.message}` }],
              isError: true,
            };
          }
        }

        case 'table_set_cell': {
          const params = args as unknown as TableSetCellParams;
          const result = await tableSetCellTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_format_cell_text': {
          const params = args as unknown as TableFormatCellTextParams;
          const result = await tableFormatCellTextTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_style_cell': {
          const params = args as unknown as TableStyleCellParams;
          const result = await tableStyleCellTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_insert_rows': {
          const params = args as unknown as TableInsertRowsParams;
          const result = await tableInsertRowsTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_delete_rows': {
          const params = args as unknown as TableDeleteRowsParams;
          const result = await tableDeleteRowsTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_set_row_height': {
          const params = args as unknown as TableSetRowHeightParams;
          const result = await tableSetRowHeightTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_insert_columns': {
          const params = args as unknown as TableInsertColumnsParams;
          const result = await tableInsertColumnsTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_delete_columns': {
          const params = args as unknown as TableDeleteColumnsParams;
          const result = await tableDeleteColumnsTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_set_column_width': {
          const params = args as unknown as TableSetColumnWidthParams;
          const result = await tableSetColumnWidthTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_unmerge_cells': {
          const params = args as unknown as TableUnmergeCellsParams;
          const result = await tableUnmergeCellsTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'table_merge_cells': {
          const params = args as unknown as TableMergeCellsParams;
          const result = await tableMergeCellsTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'add_image': {
          const params = args as unknown as AddImageParams;
          const result = await addImageTool(client, params);

          if (result.success) {
            return {
              content: [{ type: 'text', text: result.message }],
            };
          } else {
            return {
              content: [{ type: 'text', text: `Error: ${result.error.message}` }],
              isError: true,
            };
          }
        }

        case 'add_text_box': {
          const params = args as unknown as AddTextBoxParams;
          const result = await addTextBoxTool(client, params);

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('📡 MCP Server running on stdio\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n👋 Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n👋 Shutting down MCP server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
