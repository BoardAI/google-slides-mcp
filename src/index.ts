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
import { TOOL_REGISTRY } from './tools/registry.js';
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
  presentationGetDesignSystemTool,
  PresentationGetDesignSystemParams,
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
  slideBuildTool,
  SlideBuildParams,
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
  addIconTool,
  AddIconParams,
} from './tools/helpers/icon.js';
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
    const raw = JSON.parse(credentialsData);
    // Google downloads credentials wrapped in "installed" (Desktop app) or "web"
    return raw.installed ?? raw.web ?? raw;
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
    return { tools: TOOL_REGISTRY };
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

        case 'slide_build': {
          const params = args as unknown as SlideBuildParams;
          const result = await slideBuildTool(client, params);
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

        case 'add_icon': {
          const params = args as unknown as AddIconParams;
          const result = await addIconTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
          }
        }

        case 'presentation_get_design_system': {
          const params = args as unknown as PresentationGetDesignSystemParams;
          const result = await presentationGetDesignSystemTool(client, params);
          if (result.success) {
            return { content: [{ type: 'text', text: result.message }] };
          } else {
            return { content: [{ type: 'text', text: `Error: ${result.error.message}` }], isError: true };
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
