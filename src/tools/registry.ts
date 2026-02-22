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
    name: 'presentation_list_layouts',
    description: 'List all available slide layouts in a presentation, returning their IDs and display names. Use the returned layoutId with slide_set_layout to apply a layout to a slide.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
      },
      required: ['presentationId'],
    },
  },
  {
    name: 'presentation_outline',
    description: 'Get a readable text outline of all slides in a presentation — slide titles and body text content. Useful for understanding what is in a presentation before editing, or for generating a table of contents.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
      },
      required: ['presentationId'],
    },
  },
  {
    name: 'presentation_duplicate',
    description: 'Create a full copy of an existing presentation in Google Drive. Returns the new presentation ID and URL. Useful for creating backups before major edits or for using a finished presentation as a starting point.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation to duplicate' },
        title: { type: 'string', description: 'Title for the copy (defaults to "Copy of <original title>")' },
      },
      required: ['presentationId'],
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
    name: 'slide_set_layout',
    description: 'Apply a slide layout to a slide. Use presentation_list_layouts to get the available layoutId values.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to update' },
        layoutId: { type: 'string', description: 'The objectId of the layout to apply (from presentation_list_layouts)' },
      },
      required: ['presentationId', 'slideId', 'layoutId'],
    },
  },
  {
    name: 'slide_extract',
    description: 'Extract a single slide from a presentation into a brand-new standalone presentation. Copies the source presentation, removes all other slides, and returns the new presentation ID. Note: the Slides API does not support inserting slides into an existing presentation from another presentation.',
    inputSchema: {
      type: 'object',
      properties: {
        sourcePresentationId: { type: 'string', description: 'The ID of the source presentation to extract the slide from' },
        slideIndex: { type: 'integer', description: 'Index of the slide to extract (0-based). Use this or slideId.', minimum: 0 },
        slideId: { type: 'string', description: 'Object ID of the slide to extract. Use this or slideIndex.' },
        title: { type: 'string', description: 'Title for the new presentation (defaults to "Slide N from <source title>")' },
      },
      required: ['sourcePresentationId'],
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
    name: 'element_replace_text',
    description: 'Find and replace text across all slides (or a single slide). Returns the number of replacements made. Useful for filling in template placeholders like "{{name}}" or "{{date}}".',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        search: { type: 'string', description: 'Text to search for, e.g. "{{company}}"' },
        replacement: { type: 'string', description: 'Text to substitute in place of the search text' },
        matchCase: { type: 'boolean', description: 'Whether the search is case-sensitive (default: false)' },
        slideId: { type: 'string', description: 'Limit replacement to this slide ID (optional — omit to replace across all slides)' },
      },
      required: ['presentationId', 'search', 'replacement'],
    },
  },
  {
    name: 'element_set_autofit',
    description: 'Control how a shape or text box resizes to fit its text content. NONE: fixed size (default), TEXT_AUTOFIT: shrink text to fit the box, SHAPE_AUTOFIT: grow/shrink the box to fit the text.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        elementId: { type: 'string', description: 'The ID of the shape or text box element' },
        autoFit: { type: 'string', enum: ['NONE', 'TEXT_AUTOFIT', 'SHAPE_AUTOFIT'], description: 'NONE: fixed size; TEXT_AUTOFIT: shrink text to fit; SHAPE_AUTOFIT: resize box to fit text' },
      },
      required: ['presentationId', 'elementId', 'autoFit'],
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
    name: 'add_video',
    description: 'Embed a YouTube video on a slide. Accepts a full YouTube URL (e.g. "https://www.youtube.com/watch?v=dQw4w9WgXcQ") or a bare 11-character video ID.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to add the video to' },
        videoId: { type: 'string', description: 'YouTube video ID or full YouTube URL' },
        x: { type: 'number', description: 'X position in points from left edge (default: 100)' },
        y: { type: 'number', description: 'Y position in points from top edge (default: 100)' },
        width: { type: 'number', description: 'Width in points (default: 400)' },
        height: { type: 'number', description: 'Height in points (default: 225, i.e. 16:9 at 400pt wide)' },
      },
      required: ['presentationId', 'slideId', 'videoId'],
    },
  },
  {
    name: 'add_line',
    description: 'Draw a straight, bent, or curved line between two points on a slide. Specify start (x1,y1) and end (x2,y2) coordinates in points; the tool handles all transform math including diagonal direction. Supports optional color, width, dash style, and arrow heads — all applied in a single API call.',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        slideId: { type: 'string', description: 'The ID of the slide to draw the line on' },
        x1: { type: 'number', description: 'Start x position in points from left edge of slide' },
        y1: { type: 'number', description: 'Start y position in points from top edge of slide' },
        x2: { type: 'number', description: 'End x position in points from left edge of slide' },
        y2: { type: 'number', description: 'End y position in points from top edge of slide' },
        lineCategory: { type: 'string', enum: ['STRAIGHT', 'BENT', 'CURVED'], description: 'Line shape category (default: STRAIGHT)' },
        lineColor: { type: 'string', description: 'Line color as hex, e.g. "#000000"' },
        lineWidth: { type: 'number', description: 'Line thickness in points, e.g. 2' },
        dashStyle: { type: 'string', enum: ['SOLID', 'DOT', 'DASH', 'DASH_DOT', 'LONG_DASH', 'LONG_DASH_DOT'], description: 'Dash pattern (default: SOLID)' },
        startArrow: { type: 'string', enum: ['NONE', 'OPEN_ARROW', 'FILLED_ARROW', 'STEALTH_ARROW', 'OPEN_CIRCLE', 'FILLED_CIRCLE', 'OPEN_SQUARE', 'FILLED_SQUARE'], description: 'Arrowhead at the start of the line' },
        endArrow: { type: 'string', enum: ['NONE', 'OPEN_ARROW', 'FILLED_ARROW', 'STEALTH_ARROW', 'OPEN_CIRCLE', 'FILLED_CIRCLE', 'OPEN_SQUARE', 'FILLED_SQUARE'], description: 'Arrowhead at the end of the line' },
      },
      required: ['presentationId', 'slideId', 'x1', 'y1', 'x2', 'y2'],
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
    name: 'table_set_border',
    description: 'Set border style (color, width, dash pattern) on a range of table cells. Use borderPosition to target specific sides (ALL, TOP, BOTTOM, LEFT, RIGHT, INNER_HORIZONTAL, INNER_VERTICAL, OUTER, INNER).',
    inputSchema: {
      type: 'object',
      properties: {
        presentationId: { type: 'string', description: 'The ID of the presentation' },
        tableId: { type: 'string', description: 'The ID of the table element' },
        row: { type: 'integer', description: 'Top-left row index of the cell range (0-based)', minimum: 0 },
        column: { type: 'integer', description: 'Top-left column index of the cell range (0-based)', minimum: 0 },
        rowSpan: { type: 'integer', description: 'Number of rows in the range (default: 1)', minimum: 1 },
        columnSpan: { type: 'integer', description: 'Number of columns in the range (default: 1)', minimum: 1 },
        borderPosition: { type: 'string', enum: ['ALL', 'BOTTOM', 'INNER', 'INNER_HORIZONTAL', 'INNER_VERTICAL', 'LEFT', 'OUTER', 'RIGHT', 'TOP'], description: 'Which border sides to style (default: ALL)' },
        borderColor: { type: 'string', description: 'Border color in hex format, e.g. "#000000"' },
        borderWidth: { type: 'number', description: 'Border width in points, e.g. 1.0', exclusiveMinimum: 0 },
        dashStyle: { type: 'string', enum: ['SOLID', 'DOT', 'DASH', 'DASH_DOT', 'LONG_DASH', 'LONG_DASH_DOT'], description: 'Border dash pattern' },
      },
      required: ['presentationId', 'tableId', 'row', 'column'],
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
] as const;
