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
} from './tools/element/index.js';
import {
  addTextBoxTool,
  AddTextBoxParams,
} from './tools/helpers/text.js';
import {
  addImageTool,
  AddImageParams,
} from './tools/helpers/image.js';

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
          name: 'create_presentation',
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
          name: 'get_presentation',
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
          name: 'create_slide',
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
          name: 'delete_slide',
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
          name: 'duplicate_slide',
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
        case 'create_presentation': {
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

        case 'get_presentation': {
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

        case 'create_slide': {
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

        case 'delete_slide': {
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

        case 'duplicate_slide': {
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
