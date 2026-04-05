/**
 * Tool registry — all MCP tool schemas in one place.
 * Imported by src/index.ts for the ListToolsRequestSchema handler.
 * Add new tools here; the handler switch-case in index.ts is the only other place to touch.
 */
export const TOOL_REGISTRY = [
  // ─── Presentation ───────────────────────────────────────────────────────────
  {
    name: 'presentation_create',
    description: 'Create a new Google Slides presentation',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title of the new presentation' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation to retrieve' },
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
        format: { type: 'string', enum: ['pdf', 'pptx'], description: 'Export format: "pdf" (default) or "pptx"' },
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
        query: { type: 'string', description: 'Filter by name (case-insensitive substring match, e.g. "Budget")' },
        limit: { type: 'integer', description: 'Maximum number of results to return (1–100, default 20)', minimum: 1, maximum: 100 },
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
    name: 'presentation_get_design_system',
    description: 'Extract a compact design system from a presentation: typography (fonts, sizes, spacing), list/bullet styles, shape/card styles (fills, borders, shadows, padding), table styles, all colors used, and layout grid (slide size, margins, vertical rhythm). Returns structured design tokens — does not return raw API data, so it is safe to use on large presentations without exhausting context.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation to analyze' },
      },
      required: ['presentationId'],
    },
  },

  {
    name: 'presentation_get_theme',
    description: 'Read the color theme from a presentation\'s master page. Returns the color scheme mapped to semantic keys (bg_dark, accent, text_primary, etc.). Use this to understand the current theme before adding elements or to copy a theme to another presentation.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
      },
      required: ['presentationId'],
    },
  },
  {
    name: 'presentation_set_theme',
    description: 'Set or update the color theme on a presentation\'s master page. Supports partial updates (only pass the colors you want to change). All elements using themeColor references will update automatically. Color keys: bg_dark, bg_light, bg_surface, bg_surface_dk, text_primary, text_inv, text_secondary, text_muted, text_muted_dk, accent, divider_dk.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        colors: {
          type: 'object',
          description: 'Color values to set (partial update supported). Keys: bg_dark, bg_light, bg_surface, bg_surface_dk, text_primary, text_inv, text_secondary, text_muted, text_muted_dk, accent, divider_dk. Values are hex strings.',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['presentationId', 'colors'],
    },
  },

  {
    name: 'presentation_build',
    description: 'Build an entire presentation from scratch in a single call. Creates the presentation, sets theme colors on the master, then creates each slide with background color, elements (shapes, text boxes, images, icons), and speaker notes. Elements can use theme roles (e.g. role: "title") instead of specifying fontSize/fontFamily/fontColor individually. Much faster than creating slides one at a time.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the new presentation' },
        theme: {
          type: 'object',
          description: 'Optional design theme with colors, fonts, and text style roles. If provided, elements can use role: "title" etc. to inherit styles.',
          properties: {
            colors: {
              type: 'object',
              description: 'Named color palette. Keys: bg_dark, bg_light, bg_surface, bg_surface_dk, text_primary, text_inv, text_secondary, text_muted, text_muted_dk, accent, divider_dk. Values are hex strings.',
              additionalProperties: { type: 'string' },
            },
            fonts: {
              type: 'object',
              description: 'Font families. Keys: heading, body.',
              properties: {
                heading: { type: 'string', description: 'Heading font family, e.g. "Playfair Display"' },
                body: { type: 'string', description: 'Body font family, e.g. "Inter"' },
              },
              required: ['heading', 'body'],
            },
            roles: {
              type: 'object',
              description: 'Named text style roles. Built-in keys: title, h1, h2, subtitle, body, caption, stat, stat_label, label, card_title, card_body, button. Custom roles are allowed.',
              additionalProperties: {
                type: 'object',
                properties: {
                  fontSize: { type: 'number' },
                  bold: { type: 'boolean' },
                  italic: { type: 'boolean' },
                  font: { type: 'string', enum: ['heading', 'body'], description: 'Font key to resolve from theme.fonts' },
                  color: { type: 'string', description: 'Color key from theme.colors (e.g. "text_primary") or hex string' },
                  alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] },
                  lineSpacing: { type: 'number' },
                },
                required: ['fontSize', 'font', 'color'],
              },
            },
          },
          required: ['colors', 'fonts', 'roles'],
        },
        slides: {
          type: 'array',
          description: 'Array of slide specifications',
          items: {
            type: 'object',
            properties: {
              backgroundColor: { type: 'string', description: 'Background color as hex (e.g. "#0F172A") or theme color key (e.g. "bg_dark")' },
              notes: { type: 'string', description: 'Speaker notes text for this slide' },
              elements: {
                type: 'array',
                description: 'Array of element specifications (same as slide_build elements, plus optional role field)',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['shape', 'textbox', 'image', 'icon'], description: 'Element type' },
                    role: { type: 'string', description: 'Theme role name (e.g. "title", "h1", "body"). Inherits fontSize, fontFamily, fontColor, bold, italic, alignment, lineSpacing from the role. Per-element overrides win.' },
                    id: { type: 'string', description: 'Optional custom element ID' },
                    shapeType: { type: 'string', description: 'Shape type: RECTANGLE, ROUND_RECTANGLE, ELLIPSE, etc.' },
                    x: { type: 'number', description: 'X position in points' },
                    y: { type: 'number', description: 'Y position in points' },
                    width: { type: 'number', description: 'Width in points' },
                    height: { type: 'number', description: 'Height in points' },
                    fillColor: { type: 'string', description: 'Fill color as hex or theme color key' },
                    borderColor: { type: 'string', description: 'Border color as hex or theme color key' },
                    borderWidth: { type: 'number', description: 'Border width in points (min 0.5)' },
                    text: { type: 'string', description: 'Text content' },
                    fontSize: { type: 'number', description: 'Font size in points (overrides role)' },
                    fontFamily: { type: 'string', description: 'Font family (overrides role)' },
                    fontColor: { type: 'string', description: 'Text color as hex or theme color key (overrides role)' },
                    bold: { type: 'boolean', description: 'Bold text (overrides role)' },
                    italic: { type: 'boolean', description: 'Italic text (overrides role)' },
                    alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], description: 'Text alignment (overrides role)' },
                    lineSpacing: { type: 'number', description: 'Line spacing as percentage (overrides role)' },
                    imageUrl: { type: 'string', description: 'Public HTTPS URL for image elements' },
                    boldRange: {
                      type: 'object',
                      properties: {
                        start: { type: 'integer' },
                        end: { type: 'integer' },
                        fontSize: { type: 'number' },
                        color: { type: 'string' },
                      },
                      required: ['start', 'end'],
                    },
                    autoFit: { type: 'string', enum: ['NONE', 'TEXT_AUTOFIT', 'SHAPE_AUTOFIT'] },
                    verticalAlignment: { type: 'string', enum: ['TOP', 'MIDDLE', 'BOTTOM'] },
                    icon: { type: 'string', description: 'Icons8 icon slug' },
                    iconColor: { type: 'string', description: 'Icon color hex without #' },
                    iconStyle: { type: 'string', enum: ['ios-filled', 'ios', 'fluency', 'material-rounded', 'color'] },
                  },
                  required: ['type', 'x', 'y', 'width', 'height'],
                },
              },
            },
            required: ['elements'],
          },
        },
      },
      required: ['title', 'slides'],
    },
  },

  // ─── Slide ──────────────────────────────────────────────────────────────────
  {
    name: 'slide_create',
    description: 'Create a new slide in a presentation. Accepts an optional backgroundColor so the background can be set in a single call without a separate slide_set_background step.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        insertionIndex: { type: 'number', description: 'Optional zero-based index where the slide should be inserted' },
        backgroundColor: { type: 'string', description: 'Optional background color as hex, e.g. "#1A73E8". Sets the background in the same API call.' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to delete' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to duplicate' },
        insertionIndex: { type: 'number', description: 'Optional zero-based index where the duplicated slide should be inserted' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide (provide this or slideIndex)' },
        slideIndex: { type: 'integer', description: 'Zero-based position of the slide (provide this or slideId)', minimum: 0 },
        detailed: { type: 'boolean', description: 'When true, includes full raw API properties for each element (default: false)' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to move' },
        insertionIndex: { type: 'number', description: 'The 0-based position to move the slide to (e.g. 0 = first, 1 = second)' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide' },
        color: { type: 'string', description: 'Background color as hex, e.g. "#1A1A2E". Cannot be used with imageUrl.' },
        imageUrl: { type: 'string', description: 'Public HTTPS URL of a background image. Cannot be used with color.' },
      },
      required: ['presentationId', 'slideId'],
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
    name: 'slide_build',
    description: 'Build an entire slide in a single API call. Pass an array of element specs (shapes, text boxes, images, icons) and they are all created, sized, styled, and formatted in one batch request. This is much faster than creating elements one at a time. Shapes are created with correct size/position (bypasses the element_add_shape sizing bug). Text is inserted and formatted inline. Icons use Icons8 PNG library (pass icon slug + color). Optionally pass a theme object to use role-based styling.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to build on' },
        theme: {
          type: 'object',
          description: 'Optional theme for role-based styling. Same schema as presentation_build theme.',
          properties: {
            colors: { type: 'object', additionalProperties: { type: 'string' } },
            fonts: { type: 'object', properties: { heading: { type: 'string' }, body: { type: 'string' } }, required: ['heading', 'body'] },
            roles: { type: 'object', additionalProperties: { type: 'object' } },
          },
        },
        elements: {
          type: 'array',
          description: 'Array of element specifications',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['shape', 'textbox', 'image', 'icon'], description: 'Element type' },
              role: { type: 'string', description: 'Theme role name (e.g. "title", "body"). Requires theme to be set.' },
              id: { type: 'string', description: 'Optional custom element ID' },
              shapeType: { type: 'string', description: 'Shape type: RECTANGLE, ROUND_RECTANGLE, ELLIPSE, etc.' },
              x: { type: 'number', description: 'X position in points' },
              y: { type: 'number', description: 'Y position in points' },
              width: { type: 'number', description: 'Width in points' },
              height: { type: 'number', description: 'Height in points' },
              fillColor: { type: 'string', description: 'Fill color as hex, e.g. "#3B82F6"' },
              borderColor: { type: 'string', description: 'Border color as hex' },
              borderWidth: { type: 'number', description: 'Border width in points (min 0.5)' },
              text: { type: 'string', description: 'Text content' },
              fontSize: { type: 'number', description: 'Font size in points' },
              fontFamily: { type: 'string', description: 'Font family, e.g. "Google Sans"' },
              fontColor: { type: 'string', description: 'Text color as hex' },
              bold: { type: 'boolean', description: 'Bold text' },
              italic: { type: 'boolean', description: 'Italic text' },
              alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], description: 'Text alignment' },
              lineSpacing: { type: 'number', description: 'Line spacing as percentage, e.g. 150' },
              imageUrl: { type: 'string', description: 'Public HTTPS URL for image elements' },
              boldRange: {
                type: 'object',
                description: 'Bold a substring with optional different size/color',
                properties: {
                  start: { type: 'integer', description: 'Start index (inclusive)' },
                  end: { type: 'integer', description: 'End index (exclusive)' },
                  fontSize: { type: 'number', description: 'Optional different font size for bold range' },
                  color: { type: 'string', description: 'Optional different color for bold range' },
                },
                required: ['start', 'end'],
              },
              autoFit: { type: 'string', enum: ['NONE', 'TEXT_AUTOFIT', 'SHAPE_AUTOFIT'], description: 'Auto-fit: TEXT_AUTOFIT shrinks text to fit, SHAPE_AUTOFIT expands box to fit text' },
              verticalAlignment: { type: 'string', enum: ['TOP', 'MIDDLE', 'BOTTOM'], description: 'Vertical text alignment within shapes (default: TOP)' },
              icon: { type: 'string', description: 'Icons8 icon slug for type "icon", e.g. "search--v1", "shield", "edit--v1", "book", "bar-chart", "handshake", "robot-2", "visible", "money", "document", "lock", "flash-on"' },
              iconColor: { type: 'string', description: 'Icon color hex without # (default: "000000"). Use accent for brand, "FFFFFF" for white on dark bg' },
              iconStyle: { type: 'string', enum: ['ios-filled', 'ios', 'fluency', 'material-rounded', 'color'], description: 'Icons8 style (default: "ios-filled")' },
            },
            required: ['type'],
          },
        },
        layout: {
          type: 'object',
          description: 'Auto-layout directive. Elements WITHOUT explicit x/y/width/height are positioned by the layout engine. Elements WITH explicit positions are left alone. Combine a manually-positioned title with auto-laid-out cards.',
          properties: {
            type: { type: 'string', enum: ['row', 'column', 'grid'], description: 'Layout type: row (horizontal), column (vertical), grid (N columns with auto rows)' },
            columns: { type: 'integer', description: 'Number of columns for grid layout (default: 2)', minimum: 1 },
            gap: { type: 'number', description: 'Gap in points between items (default: 15)' },
            x: { type: 'number', description: 'Container x position in points (default: 60)' },
            y: { type: 'number', description: 'Container y position in points (default: 100)' },
            width: { type: 'number', description: 'Container width in points (default: 600)' },
            height: { type: 'number', description: 'Container height in points (default: 260)' },
          },
          required: ['type'],
        },
      },
      required: ['presentationId', 'slideId', 'elements'],
    },
  },

  {
    name: 'slide_duplicate_modify',
    description: 'Duplicate a slide and apply targeted element changes (text, colors, fonts) in one call. Returns the new slide ID and element ID mapping (original -> new). Changes reference original element IDs and are automatically mapped to the duplicated elements.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        sourceSlideId: { type: 'string', description: 'The ID of the slide to duplicate' },
        insertionIndex: { type: 'number', description: 'Optional zero-based index where the duplicated slide should be inserted' },
        changes: {
          type: 'array',
          description: 'Array of element changes to apply after duplication. Use the ORIGINAL element IDs (they are mapped to new IDs automatically).',
          items: {
            type: 'object',
            properties: {
              elementId: { type: 'string', description: 'The original element ID to modify (mapped to new ID automatically)' },
              text: { type: 'string', description: 'New text content (replaces existing text)' },
              fontSize: { type: 'number', description: 'New font size in points' },
              fontColor: { type: 'string', description: 'New text color as hex, e.g. "#FFFFFF"' },
              fontFamily: { type: 'string', description: 'New font family' },
              bold: { type: 'boolean', description: 'Set text bold' },
              fillColor: { type: 'string', description: 'New shape fill color as hex' },
              borderColor: { type: 'string', description: 'New shape border color as hex' },
              imageUrl: { type: 'string', description: 'Public HTTPS URL to replace image content. Only works on image elements.' },
              imageReplaceMethod: { type: 'string', enum: ['CENTER_CROP'], description: 'How to fit the new image. Omit to preserve aspect ratio.' },
            },
            required: ['elementId'],
          },
        },
      },
      required: ['presentationId', 'sourceSlideId'],
    },
  },

  {
    name: 'slide_read',
    description: 'Read a slide and return its content as ElementSpec-compatible JSON. Enables round-trip editing: read a slide, modify the output, pass it back to slide_build. Extracts shapes, text boxes, and images with their positions, sizes, colors, text content, and font properties. Identify slide by slideId or slideIndex (0-based).',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to read (provide this or slideIndex)' },
        slideIndex: { type: 'integer', description: 'Zero-based slide position (provide this or slideId)', minimum: 0 },
      },
      required: ['presentationId'],
    },
  },

  // ─── Element ─────────────────────────────────────────────────────────────────
  {
    name: 'element_delete',
    description: 'Delete an element (text box, shape, image, etc.) from a slide',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        elementId: { type: 'string', description: 'The ID of the element to delete' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        elementId: { type: 'string', description: 'The ID of the element to retrieve' },
        slideId: { type: 'string', description: 'Optional: ID of the slide to scope the search to. Produces a more specific error if the element is not on that slide.' },
        detailed: { type: 'boolean', description: 'When true, includes full raw API properties (default: false)' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        elementId: { type: 'string', description: 'The ID of the element to update' },
        text: { type: 'string', description: 'The new text content — replaces all existing text' },
      },
      required: ['presentationId', 'elementId', 'text'],
    },
  },
  {
    name: 'element_move_resize',
    description: 'Move, resize, and/or rotate an existing element. Position (x, y) and size (width, height) are in points. Rotation is in degrees (clockwise, e.g. 45 = 45° clockwise).',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        elementId: { type: 'string', description: 'The ID of the element to move or resize' },
        x: { type: 'number', description: 'New x position in points (distance from left edge of slide)' },
        y: { type: 'number', description: 'New y position in points (distance from top edge of slide)' },
        width: { type: 'number', description: 'New width in points' },
        height: { type: 'number', description: 'New height in points' },
        rotation: { type: 'number', description: 'Rotation in degrees, clockwise (e.g. 45 = 45° clockwise, -90 = 90° counter-clockwise). Replaces any existing rotation.' },
      },
      required: ['presentationId', 'elementId'],
    },
  },
  {
    name: 'element_add_shape',
    description: 'Add a shape (rectangle, ellipse, arrow, star, etc.) to a slide. Accepts optional inline fill/border styling and text so a fully styled, labelled shape can be created in a single call.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to add the shape to' },
        shapeType: { type: 'string', description: 'Shape type, e.g. RECTANGLE, ELLIPSE, TRIANGLE, RIGHT_ARROW, LEFT_ARROW, STAR_5, HEART, DIAMOND, etc.' },
        x: { type: 'number', description: 'X position in points from left edge (default: 100)' },
        y: { type: 'number', description: 'Y position in points from top edge (default: 100)' },
        width: { type: 'number', description: 'Width in points (default: 200)' },
        height: { type: 'number', description: 'Height in points (default: 150)' },
        fillColor: { type: 'string', description: 'Shape fill color as hex, e.g. "#1A73E8"' },
        borderColor: { type: 'string', description: 'Border color as hex, e.g. "#000000"' },
        borderWidth: { type: 'number', description: 'Border width in points, e.g. 2' },
        text: { type: 'string', description: 'Text to insert into the shape' },
        bold: { type: 'boolean', description: 'Set text bold' },
        italic: { type: 'boolean', description: 'Set text italic' },
        fontSize: { type: 'number', description: 'Font size in points', exclusiveMinimum: 0 },
        fontFamily: { type: 'string', description: 'Font family name, e.g. "Google Sans"' },
        foregroundColor: { type: 'string', description: 'Text color as hex, e.g. "#FFFFFF"' },
        textAlignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], description: 'Text paragraph alignment' },
        autoFit: { type: 'string', enum: ['NONE', 'TEXT_AUTOFIT', 'SHAPE_AUTOFIT'], description: 'Auto-fit behavior: NONE (fixed), TEXT_AUTOFIT (shrink text to fit box), SHAPE_AUTOFIT (resize box to fit text)' },
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
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        elementId: { type: 'string', description: 'The ID of the element to style' },
        fillColor: { type: 'string', description: 'Fill/background color as hex, e.g. "#FF0000" for red' },
        borderColor: { type: 'string', description: 'Border/outline color as hex, e.g. "#000000" for black' },
        borderWidth: { type: 'number', description: 'Border width in points, e.g. 1 or 2' },
      },
      required: ['presentationId', 'elementId'],
    },
  },
  {
    name: 'element_find',
    description: 'Search for elements across all slides (or one slide) by type, shape type, text content, or placeholder role. Returns matching elements with their slide location and placeholder info.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'Limit search to this slide ID (optional)' },
        slideIndex: { type: 'integer', description: 'Limit search to this slide (0-based, optional)', minimum: 0 },
        type: { type: 'string', enum: ['SHAPE', 'IMAGE', 'TABLE', 'LINE', 'VIDEO', 'WORD_ART', 'SHEETS_CHART'], description: 'Filter by element type' },
        shapeType: { type: 'string', description: 'Filter shapes by shape type, e.g. "TEXT_BOX", "RECTANGLE", "ELLIPSE"' },
        text: { type: 'string', description: 'Filter by text content (case-insensitive substring match)' },
        placeholderType: { type: 'string', enum: ['TITLE', 'BODY', 'CENTERED_TITLE', 'SUBTITLE', 'DATE_AND_TIME', 'SLIDE_NUMBER', 'FOOTER', 'HEADER', 'OBJECT', 'MEDIA', 'PICTURE', 'CHART', 'TABLE', 'CLIP_ART', 'DIAGRAM', 'SLIDE_IMAGE', 'NONE'], description: 'Filter by placeholder role — e.g. "TITLE" to find title placeholders, "BODY" for content areas' },
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
        elementIds: { type: 'array', items: { type: 'string' }, description: 'IDs of the elements to reorder (must be on the same slide)', minItems: 1 },
        operation: { type: 'string', enum: ['BRING_TO_FRONT', 'SEND_TO_BACK', 'BRING_FORWARD', 'SEND_BACKWARD'], description: 'BRING_TO_FRONT: move above all others; SEND_TO_BACK: move below all others; BRING_FORWARD / SEND_BACKWARD: move one step' },
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
        elementIds: { type: 'array', items: { type: 'string' }, description: 'IDs of the elements to group (must be on the same slide, minimum 2)', minItems: 2 },
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
        groupIds: { type: 'array', items: { type: 'string' }, description: 'IDs of the group elements to ungroup (minimum 1)', minItems: 1 },
      },
      required: ['presentationId', 'groupIds'],
    },
  },
  {
    name: 'element_duplicate',
    description: 'Duplicate an existing element on a slide, creating an identical copy with a new element ID. Optionally offset the copy so it does not land on top of the original.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        elementId: { type: 'string', description: 'The ID of the element to duplicate' },
        offsetX: { type: 'number', description: 'Horizontal offset in points for the duplicate (default: 0, copy lands on top of original)' },
        offsetY: { type: 'number', description: 'Vertical offset in points for the duplicate (default: 0)' },
      },
      required: ['presentationId', 'elementId'],
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
        imageReplaceMethod: { type: 'string', enum: ['CENTER_CROP'], description: 'How to fit the new image: CENTER_CROP scales and crops to fill the frame. Omit to preserve aspect ratio.' },
      },
      required: ['presentationId', 'elementId', 'url'],
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

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  {
    name: 'add_text_box',
    description: 'Add a text box to a slide with specified content and position. Accepts optional inline formatting so text style can be applied in a single call without a separate element_format_text step.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide' },
        text: { type: 'string', description: 'The text content' },
        x: { type: 'number', description: 'X position in points (default: 100)' },
        y: { type: 'number', description: 'Y position in points (default: 100)' },
        width: { type: 'number', description: 'Width in points (default: 300)' },
        height: { type: 'number', description: 'Height in points (default: 50)' },
        bold: { type: 'boolean', description: 'Set text bold' },
        italic: { type: 'boolean', description: 'Set text italic' },
        fontSize: { type: 'number', description: 'Font size in points, e.g. 18', exclusiveMinimum: 0 },
        fontFamily: { type: 'string', description: 'Font family name, e.g. "Arial" or "Google Sans"' },
        foregroundColor: { type: 'string', description: 'Text color as hex, e.g. "#FF0000"' },
        backgroundColor: { type: 'string', description: 'Text highlight color as hex, e.g. "#FFFF00"' },
        alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], description: 'Paragraph alignment' },
        lineSpacing: { type: 'number', description: 'Line spacing as a percentage, e.g. 150 for 1.5×', minimum: 0 },
        autoFit: { type: 'string', enum: ['NONE', 'TEXT_AUTOFIT', 'SHAPE_AUTOFIT'], description: 'Auto-fit behavior: NONE (fixed size), TEXT_AUTOFIT (shrink text to fit), SHAPE_AUTOFIT (expand box to fit text)' },
      },
      required: ['presentationId', 'slideId', 'text'],
    },
  },
  {
    name: 'add_image',
    description: 'Insert an image from a public HTTPS URL onto a slide',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to add the image to' },
        url: { type: 'string', description: 'Public HTTPS URL of the image (PNG, JPG, GIF, SVG)' },
        x: { type: 'number', description: 'X position in points from left edge (default: 100)' },
        y: { type: 'number', description: 'Y position in points from top edge (default: 100)' },
        width: { type: 'number', description: 'Width in points. If omitted, Google uses the image\'s native width.' },
        height: { type: 'number', description: 'Height in points. If omitted, Google uses the image\'s native height.' },
      },
      required: ['presentationId', 'slideId', 'url'],
    },
  },
  {
    name: 'add_icon',
    description: 'Add an icon from Icons8 to a slide. Uses Icons8 PNG library (thousands of professional icons). Pass the icon slug (e.g. "search--v1", "shield", "edit--v1") and optional color/size. Browse icons at https://icons8.com/icons',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide' },
        icon: { type: 'string', description: 'Icons8 icon slug, e.g. "search--v1", "shield", "edit--v1", "book", "bar-chart", "handshake", "robot-2", "visible", "money", "document", "lock", "flash-on", "conference-call", "data-configuration", "checkmark", "goal", "star", "clock--v1", "link"' },
        x: { type: 'number', description: 'X position in points' },
        y: { type: 'number', description: 'Y position in points' },
        size: { type: 'number', description: 'Icon size in points (default: 24). Use 20-24 for inline, 28-32 for cards, 40-48 for large features' },
        color: { type: 'string', description: 'Icon color as hex (with or without #). Default: "000000" (black). Use accent color for brand, "FFFFFF" for white on dark backgrounds' },
        style: { type: 'string', enum: ['ios-filled', 'ios', 'fluency', 'material-rounded', 'color'], description: 'Icons8 style (default: "ios-filled"). ios-filled = solid, ios = outline, fluency = modern colored, color = full color' },
      },
      required: ['presentationId', 'slideId', 'icon', 'x', 'y'],
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

  // ─── Table ───────────────────────────────────────────────────────────────────
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
  // ─── Batch Duplication ──────────────────────────────────────────────────────
  {
    name: 'slide_duplicate_batch',
    description: 'Duplicate multiple slides in a single call. Returns an array of original-to-new slide ID mappings. Optionally move all duplicates to a specific position.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideIds: { type: 'array', items: { type: 'string' }, description: 'Array of slide IDs to duplicate', minItems: 1 },
        insertionIndex: { type: 'number', description: 'Optional zero-based index where the first duplicated slide should be inserted (rest follow sequentially)' },
      },
      required: ['presentationId', 'slideIds'],
    },
  },

  // ─── Slide Registry ───────────────────────────────────────────────────────
  {
    name: 'registry_save_slide',
    description: 'Save a slide to the reusable slide registry. The slide can later be copied into any presentation using registry_use_slide. If a slide with the same name already exists, it is overwritten.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Unique human-readable name for this template, e.g. "team-intro", "pricing-table", "title-dark"' },
        presentationId: { type: 'string', description: 'The ID of the presentation containing the slide' },
        slideId: { type: 'string', description: 'The ID of the slide to save' },
        description: { type: 'string', description: 'Optional description of the slide template' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for filtering, e.g. ["dark", "intro", "client-deck"]' },
      },
      required: ['name', 'presentationId', 'slideId'],
    },
  },
  {
    name: 'registry_list_slides',
    description: 'List all slides saved in the reusable slide registry. Optionally filter by name, description, or tag substring.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional filter: matches against name, description, and tags (case-insensitive substring)' },
      },
    },
  },
  {
    name: 'registry_remove_slide',
    description: 'Remove a slide from the reusable slide registry by name',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The name of the registry entry to remove' },
      },
      required: ['name'],
    },
  },
  {
    name: 'registry_use_slide',
    description: 'Copy a slide from the registry into a target presentation. If the source is in the same presentation, duplicates it directly. For cross-presentation copies, creates a temporary single-slide presentation (Google API limitation prevents direct cross-deck slide injection). Returns the new slide ID and element mapping for same-presentation copies, or the temp presentation details for cross-presentation copies.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Registry entry name of the slide to use' },
        targetPresentationId: { type: 'string', description: 'The ID of the destination presentation' },
        insertionIndex: { type: 'number', description: 'Optional zero-based index where the slide should be inserted' },
      },
      required: ['name', 'targetPresentationId'],
    },
  },
] as const;
