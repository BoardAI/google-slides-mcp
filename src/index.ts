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
} from './tools/slide/index.js';
import {
  deleteElementTool,
  DeleteElementParams,
} from './tools/element/index.js';
import {
  addTextBoxTool,
  AddTextBoxParams,
} from './tools/helpers/text.js';

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
