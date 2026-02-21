# API Reference

Complete reference for all 43 MCP tools provided by Google Slides MCP Server.

## Coordinate System

All positions and sizes are in **points** (pt). A standard 16:9 slide is **720 × 405 pt**. Origin (0, 0) is top-left.

```
1 inch = 72 points
Slide: 720pt wide × 405pt tall  (16:9)
```

---

## Presentation Tools

### `presentation_create`

Create a new Google Slides presentation.

**Parameters:**
- `title` (string, required): Title of the presentation

**Returns:**
```json
{
  "presentationId": "abc123",
  "title": "My Presentation",
  "url": "https://docs.google.com/presentation/d/abc123"
}
```

---

### `presentation_get`

Get metadata and the list of slides in a presentation.

**Parameters:**
- `presentationId` (string, required): Presentation ID

**Returns:** Title, slide count, and slide IDs with layout names.

---

### `presentation_list`

List presentations in Google Drive.

**Parameters:**
- `nameFilter` (string, optional): Case-insensitive substring filter on title
- `maxResults` (number, optional): Maximum results to return (default: 20)

**Returns:** Array of `{ presentationId, title, modifiedTime, url }`.

---

### `presentation_export`

Export a presentation to PDF or PPTX.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `format` (string, required): `"pdf"` or `"pptx"`
- `outputPath` (string, required): Absolute file path to write to

**Returns:** Confirmation with the output file path.

---

### `presentation_create_from_template`

Copy a presentation and replace `{{token}}` placeholders with values.

**Parameters:**
- `templateId` (string, required): Source presentation ID to copy
- `title` (string, required): Title for the new presentation
- `replacements` (object, required): Map of `{ "token": "replacement" }` pairs

**Example:**
```json
{
  "templateId": "abc123",
  "title": "Q4 2024 Review",
  "replacements": {
    "QUARTER": "Q4",
    "YEAR": "2024",
    "PRESENTER": "Jane Smith"
  }
}
```

---

### `presentation_rename`

Rename a presentation.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `title` (string, required): New title

**Returns:**
```json
{ "presentationId": "abc123", "title": "New Title" }
```

---

## Slide Tools

### `slide_create`

Add a new slide to a presentation.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `insertionIndex` (number, optional): Zero-based index to insert at (default: append to end)

**Returns:** `{ slideId }` of the new slide.

---

### `slide_delete`

Delete a slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): ID of the slide to delete

---

### `slide_duplicate`

Duplicate a slide within a presentation.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): ID of the slide to duplicate

**Returns:** `{ originalSlideId, newSlideId }`.

---

### `slide_get`

List all elements on a slide with positions, sizes, types, and text content.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, optional): ID of the slide (use this or `slideIndex`)
- `slideIndex` (number, optional): Zero-based index of the slide
- `detailed` (boolean, optional): Include full raw API JSON for all elements (default: false)

**Returns (summary mode):**
```
Slide: slide_abc (3 elements)

1. SHAPE [elem_001]
   Position: 100pt, 50pt  Size: 400pt × 80pt
   Text: "Welcome to Q4 Review"

2. IMAGE [elem_002]
   Position: 50pt, 200pt  Size: 300pt × 200pt

3. TABLE [elem_003]
   Position: 50pt, 300pt  Size: 620pt × 100pt
   3 rows × 4 columns
```

**Tip:** Use `slide_get` to discover element IDs before editing or deleting.

---

### `slide_reorder`

Move a slide to a new position.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): ID of the slide to move
- `insertionIndex` (number, required): Zero-based target index

---

### `slide_set_background`

Set the background of a slide to a solid color or image.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): Slide ID
- `color` (string, optional): Hex color string, e.g. `"#1a73e8"`
- `imageUrl` (string, optional): URL of the background image

Provide either `color` or `imageUrl`.

---

### `slide_thumbnail`

Get a PNG thumbnail URL for a slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): Slide ID

**Returns:** `{ thumbnailUrl }` — a time-limited Google-hosted image URL.

---

### `slide_get_notes`

Read the speaker notes for a slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, optional): Slide ID (use this or `slideIndex`)
- `slideIndex` (number, optional): Zero-based slide index

**Returns:** `{ slideId, notes }` where `notes` is the plain text content.

---

### `slide_set_notes`

Write speaker notes for a slide (replaces existing notes).

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, optional): Slide ID (use this or `slideIndex`)
- `slideIndex` (number, optional): Zero-based slide index
- `notes` (string, required): New notes content (empty string clears notes)

---

## Element Tools

### `element_get`

Inspect a specific element — position, size, type, and text.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID
- `slideId` (string, optional): Scope search to this slide
- `detailed` (boolean, optional): Include full raw API JSON (default: false)

**Tip:** Use `detailed: true` to inspect fonts, colors, and transforms before updating.

---

### `element_delete`

Delete an element from a slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID

---

### `element_update_text`

Replace all text content in an element.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID
- `text` (string, required): New text content

**Note:** Replaces ALL text. Existing character-level formatting is not preserved.

---

### `element_move_resize`

Move and/or resize an element. Unspecified dimensions are preserved.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID
- `x` (number, optional): New x position in pt (left edge)
- `y` (number, optional): New y position in pt (top edge)
- `width` (number, optional): New width in pt
- `height` (number, optional): New height in pt

At least one of `x`, `y`, `width`, `height` must be provided.

---

### `element_add_shape`

Add a shape to a slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): Slide ID
- `shapeType` (string, required): Shape type — e.g. `"RECTANGLE"`, `"ELLIPSE"`, `"ROUND_RECTANGLE"`, `"RIGHT_ARROW"`, `"LEFT_ARROW"`, `"FIVE_POINTED_STAR"`, `"HEART"`, `"CLOUD"`, etc.
- `x` (number, optional): X position in pt (default: 100)
- `y` (number, optional): Y position in pt (default: 100)
- `width` (number, optional): Width in pt (default: 100)
- `height` (number, optional): Height in pt (default: 100)

**Returns:** `{ elementId, shapeType, x, y, width, height }`.

---

### `element_style`

Set the fill color, border color, and/or border width of an element.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID
- `fillColor` (string, optional): Hex fill color, e.g. `"#1a73e8"`. Use `"transparent"` for no fill.
- `borderColor` (string, optional): Hex border color
- `borderWidth` (number, optional): Border width in pt

At least one style property must be provided.

---

### `element_format_text`

Apply text formatting to all or part of an element's text.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID
- `bold` (boolean, optional): Set bold
- `italic` (boolean, optional): Set italic
- `underline` (boolean, optional): Set underline
- `strikethrough` (boolean, optional): Set strikethrough
- `fontSize` (number, optional): Font size in pt
- `fontFamily` (string, optional): Font family name, e.g. `"Roboto"`
- `color` (string, optional): Hex text color
- `alignment` (string, optional): `"START"`, `"CENTER"`, `"END"`, or `"JUSTIFIED"`
- `bulletPreset` (string, optional): Bullet/numbering style — e.g. `"BULLET_DISC_CIRCLE_SQUARE"`, `"NUMBERED_DIGIT_ALPHA_ROMAN"`
- `startIndex` (number, optional): Start of text range (default: 0)
- `endIndex` (number, optional): End of text range (default: full text)

---

### `element_find`

Search for elements by type, shape type, or text content.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, optional): Scope search to one slide (default: search all slides)
- `elementType` (string, optional): Filter by type — `"SHAPE"`, `"IMAGE"`, `"TABLE"`, `"LINE"`, etc.
- `shapeType` (string, optional): Filter by shape type (for SHAPE elements)
- `textContains` (string, optional): Filter by text content (case-insensitive substring match)

**Returns:** List of matching elements with IDs, positions, and text snippets.

---

### `element_replace_image`

Swap the image content of an IMAGE element while preserving its position and size.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID (must be an IMAGE element)
- `imageUrl` (string, required): URL of the new image

---

### `element_duplicate`

Duplicate an element on the same slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID to duplicate

**Returns:** `{ originalElementId, newElementId }`.

---

### `element_z_order`

Change the layering order of elements.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementIds` (string[], required): One or more element IDs
- `operation` (string, required): One of:
  - `"BRING_TO_FRONT"` — move above all others
  - `"SEND_TO_BACK"` — move below all others
  - `"BRING_FORWARD"` — move up one layer
  - `"SEND_BACKWARD"` — move down one layer

---

### `element_group`

Group two or more elements together so they move and resize as one unit.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementIds` (string[], required): At least two element IDs to group (must be on the same slide)

**Returns:** `{ groupId, elementIds }`.

---

### `element_ungroup`

Ungroup a previously grouped element.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `groupIds` (string[], required): One or more group element IDs to ungroup

---

### `element_set_link`

Add or remove a hyperlink on an element's text.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `elementId` (string, required): Element ID
- `url` (string, optional): URL to link to (must start with `https://`). Omit or pass empty string to remove the link.
- `startIndex` (number, optional): Start of text range to link
- `endIndex` (number, optional): End of text range to link

If `startIndex`/`endIndex` are omitted, the link is applied to all text in the element.

---

## Helper Tools

### `add_text_box`

Add a text box to a slide with content and position.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): Slide ID
- `text` (string, required): Text content
- `x` (number, optional): X position in pt (default: 100)
- `y` (number, optional): Y position in pt (default: 100)
- `width` (number, optional): Width in pt (default: 300)
- `height` (number, optional): Height in pt (default: 50)

**Returns:** `{ elementId, text }`.

---

### `add_image`

Insert an image from a URL onto a slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): Slide ID
- `imageUrl` (string, required): Public URL of the image
- `x` (number, optional): X position in pt (default: 100)
- `y` (number, optional): Y position in pt (default: 100)
- `width` (number, optional): Width in pt (default: 200)
- `height` (number, optional): Height in pt (default: 150)

**Returns:** `{ elementId, imageUrl, x, y, width, height }`.

---

### `add_table`

Insert a table onto a slide.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `slideId` (string, required): Slide ID
- `rows` (number, required): Number of rows
- `columns` (number, required): Number of columns
- `x` (number, optional): X position in pt (default: 100)
- `y` (number, optional): Y position in pt (default: 100)
- `width` (number, optional): Width in pt (default: 400)
- `height` (number, optional): Height in pt (default: 200)

**Returns:** `{ elementId, rows, columns }`.

---

## Table Tools

### `table_set_cell`

Set the text content of a table cell.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `row` (number, required): Zero-based row index
- `column` (number, required): Zero-based column index
- `text` (string, required): New cell content

---

### `table_format_cell_text`

Apply text formatting within a table cell.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `row` (number, required): Zero-based row index
- `column` (number, required): Zero-based column index
- `bold` (boolean, optional)
- `italic` (boolean, optional)
- `fontSize` (number, optional): Font size in pt
- `fontFamily` (string, optional)
- `color` (string, optional): Hex text color
- `alignment` (string, optional): `"START"`, `"CENTER"`, `"END"`, or `"JUSTIFIED"`

---

### `table_style_cell`

Set the background color and padding of a table cell.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `row` (number, required): Zero-based row index
- `column` (number, required): Zero-based column index
- `backgroundColor` (string, optional): Hex fill color
- `paddingTop` (number, optional): Top padding in pt
- `paddingBottom` (number, optional): Bottom padding in pt
- `paddingLeft` (number, optional): Left padding in pt
- `paddingRight` (number, optional): Right padding in pt

---

### `table_insert_rows`

Insert rows into a table.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `referenceRowIndex` (number, required): Zero-based index of reference row
- `insertBelow` (boolean, required): `true` to insert below reference row, `false` to insert above
- `count` (number, optional): Number of rows to insert (default: 1)

---

### `table_delete_rows`

Delete rows from a table.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `startIndex` (number, required): Zero-based index of first row to delete
- `count` (number, optional): Number of rows to delete (default: 1)

---

### `table_set_row_height`

Set the minimum height of a table row.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `rowIndex` (number, required): Zero-based row index
- `height` (number, required): Minimum row height in pt

---

### `table_insert_columns`

Insert columns into a table.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `referenceColumnIndex` (number, required): Zero-based index of reference column
- `insertRight` (boolean, required): `true` to insert to the right, `false` to insert to the left
- `count` (number, optional): Number of columns to insert (default: 1)

---

### `table_delete_columns`

Delete columns from a table.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `startIndex` (number, required): Zero-based index of first column to delete
- `count` (number, optional): Number of columns to delete (default: 1)

---

### `table_set_column_width`

Set the width of a table column.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `columnIndex` (number, required): Zero-based column index
- `width` (number, required): Column width in pt

---

### `table_merge_cells`

Merge a rectangular range of cells in a table.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `row` (number, required): Zero-based row index of the top-left cell
- `column` (number, required): Zero-based column index of the top-left cell
- `rowSpan` (number, required): Number of rows to merge (must be ≥ 1)
- `columnSpan` (number, required): Number of columns to merge (must be ≥ 1)

---

### `table_unmerge_cells`

Unmerge a previously merged range of cells.

**Parameters:**
- `presentationId` (string, required): Presentation ID
- `tableId` (string, required): Table element ID
- `row` (number, required): Zero-based row index of the top-left cell of the merged range
- `column` (number, required): Zero-based column index of the top-left cell
- `rowSpan` (number, required): Row span of the merged range (must be ≥ 1)
- `columnSpan` (number, required): Column span of the merged range (must be ≥ 1)

---

## Error Handling

All tools return consistent error responses:

```json
{
  "success": false,
  "error": {
    "type": "authentication | api | validation | network",
    "message": "Human-readable error message",
    "details": {},
    "retryable": true
  }
}
```

### Common Errors

| Error | Cause | Solution |
|---|---|---|
| `Not authenticated` | No tokens cached | Re-authenticate (restart triggers OAuth flow) |
| `404 Not Found` | ID doesn't exist or was deleted | Verify ID with `presentation_get` or `slide_get` |
| `403 Forbidden` | No edit access to presentation | Share presentation with your Google account |
| `429 Rate Limit` | Too many API calls | Server retries automatically with exponential backoff |

---

## Recommended Workflow

1. **Discover:** `presentation_get` → get slide IDs
2. **Inspect:** `slide_get` → get element IDs, positions, types on a slide
3. **Drill down:** `element_get` with `detailed: true` → inspect full properties
4. **Edit:** Call the appropriate update/add/delete tool with confirmed IDs

Element and slide IDs are stable for the lifetime of the object — store them for subsequent operations.
