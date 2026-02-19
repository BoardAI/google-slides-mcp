# API Documentation

Complete reference for all MCP tools provided by Google Slides MCP Server.

## Presentation Tools

### create_presentation

Create a new Google Slides presentation.

**Parameters:**
- `title` (string, required): The title of the presentation

**Returns:**
```json
{
  "presentationId": "abc123",
  "title": "My Presentation",
  "url": "https://docs.google.com/presentation/d/abc123"
}
```

**Example:**
```typescript
{
  "name": "create_presentation",
  "arguments": {
    "title": "Q4 Review 2024"
  }
}
```

---

### get_presentation

Retrieve presentation metadata and structure.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation

**Returns:**
```json
{
  "presentationId": "abc123",
  "title": "My Presentation",
  "slideCount": 5,
  "slides": [...]
}
```

**Example:**
```typescript
{
  "name": "get_presentation",
  "arguments": {
    "presentationId": "abc123"
  }
}
```

---

## Slide Tools

### create_slide

Add a new slide to a presentation.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `insertionIndex` (number, optional): Zero-based index where slide should be inserted. If omitted, appends to end.

**Returns:**
```json
{
  "slideId": "slide_abc123"
}
```

**Example:**
```typescript
{
  "name": "create_slide",
  "arguments": {
    "presentationId": "abc123",
    "insertionIndex": 1
  }
}
```

---

### delete_slide

Delete a slide from a presentation.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `slideId` (string, required): The ID of the slide to delete

**Returns:**
Success message

**Example:**
```typescript
{
  "name": "delete_slide",
  "arguments": {
    "presentationId": "abc123",
    "slideId": "slide_xyz"
  }
}
```

---

### duplicate_slide

Duplicate a slide within a presentation.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `slideId` (string, required): The ID of the slide to duplicate

**Returns:**
```json
{
  "slideId": "slide_xyz_copy"
}
```

---

### slide_get

Get all elements on a slide with their IDs, types, positions, and text content.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `slideId` (string, required): The ID of the slide
- `detailed` (boolean, optional): When `true`, appends full raw API JSON for all elements (default: `false`)

**Returns (summary mode):**
```
Slide: slide_abc (3 elements)

1. SHAPE [elem_001]
   Position: 100pt, 50pt  Size: 400pt × 80pt
   Text: "Welcome to Q4 Review"

2. IMAGE [elem_002]
   Position: 50pt, 200pt  Size: 300pt × 200pt
   URL: https://lh3.googleusercontent.com/...

3. TABLE [elem_003]
   Position: 50pt, 420pt  Size: 620pt × 100pt
   3 rows × 4 columns
```

**Element types reported:** SHAPE, IMAGE, TABLE, VIDEO, LINE, WORD ART, SHEETS CHART

**Example:**
```typescript
{
  "name": "slide_get",
  "arguments": {
    "presentationId": "abc123",
    "slideId": "slide_xyz"
  }
}
```

**Tip:** Use `slide_get` after `get_presentation` to discover element IDs before editing or deleting.

---

## Element Tools

### element_delete

Delete an element (text box, shape, image, etc.) from a slide.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `elementId` (string, required): The ID of the element to delete

**Returns:**
Success message

---

### element_get

Get details of a specific element by ID. By default searches all slides in the presentation. Pass `slideId` to scope the search to one slide and get a more specific error if the element is not found there.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `elementId` (string, required): The ID of the element to retrieve
- `slideId` (string, optional): When provided, limits the search to this slide. If the element is not on that slide, the error message will say so explicitly.
- `detailed` (boolean, optional): When `true`, appends full raw API JSON for the element (default: `false`)

**Returns (summary mode):**
```
SHAPE [elem_001]
   Position: 100pt, 50pt  Size: 400pt × 80pt
   Text: "Welcome to Q4 Review"
```

**Returns (detailed mode):** Same summary, plus the complete raw `PageElement` JSON from the Google Slides API.

**Example:**
```typescript
{
  "name": "element_get",
  "arguments": {
    "presentationId": "abc123",
    "elementId": "elem_001",
    "detailed": true
  }
}
```

**Tip:** Use `element_get` with `detailed: true` to inspect full styling properties (fonts, colors, transforms) before issuing an update.

---

### element_update_text

Replace the text content of an existing element. Clears all existing text and inserts the new content.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `elementId` (string, required): The ID of the element to update
- `text` (string, required): The new text content (replaces all existing text)

**Returns:**
```json
{
  "elementId": "elem_001",
  "text": "Updated text content"
}
```

**Example:**
```typescript
{
  "name": "element_update_text",
  "arguments": {
    "presentationId": "abc123",
    "elementId": "elem_001",
    "text": "New slide title"
  }
}
```

**Note:** Replaces ALL text in the element. Existing character-level formatting (fonts, colors, bold) is not preserved — the inserted text takes the element's default style.

**Tip:** Use `element_get` first to confirm the element ID and that it is a SHAPE before calling `element_update_text`.

---

## Helper Tools

### add_text_box

Add a text box to a slide with specified content and position.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `slideId` (string, required): The ID of the slide
- `text` (string, required): The text content
- `x` (number, optional): X position in points (default: 100)
- `y` (number, optional): Y position in points (default: 100)
- `width` (number, optional): Width in points (default: 300)
- `height` (number, optional): Height in points (default: 50)

**Coordinate System:**
- Origin (0,0) is top-left corner
- Units are in points (1 inch = 72 points)
- Standard slide is 720 x 540 points (10" x 7.5")

**Returns:**
```json
{
  "elementId": "textbox_1234567890",
  "text": "Hello, World!"
}
```

**Example:**
```typescript
{
  "name": "add_text_box",
  "arguments": {
    "presentationId": "abc123",
    "slideId": "slide_xyz",
    "text": "Welcome to the presentation!",
    "x": 50,
    "y": 50,
    "width": 400,
    "height": 100
  }
}
```

---

## Error Handling

All tools return consistent error responses:

```json
{
  "success": false,
  "error": {
    "type": "authentication | api | validation | network",
    "message": "Human-readable error message",
    "details": { /* additional context */ },
    "retryable": true | false
  }
}
```

### Common Errors

**Authentication Error**
```
Not authenticated. Please run authentication flow first.
```
Solution: Delete tokens and re-authenticate

**404 Not Found**
```
Presentation/Slide/Element ID 'xyz' not found. It may have been deleted.
```
Solution: Verify ID is correct and resource exists

**403 Forbidden**
```
You don't have permission to access presentation ID: xyz
```
Solution: Check sharing settings in Google Slides

**429 Rate Limit**
```
Rate limited. Try again in X seconds.
```
Note: Server automatically retries with exponential backoff

---

## Best Practices

1. **Use the drill-down workflow**: Start broad and narrow down before editing:
   - `get_presentation` → discover slide IDs and count
   - `slide_get` → discover element IDs, types, and positions on a specific slide
   - `element_get` (with `detailed: true`) → inspect full properties of one element
   - Then issue your edit or delete

2. **Use helper tools**: Prefer `add_text_box` over low-level element creation for common operations

3. **Handle errors gracefully**: Check for `success: false` and handle retryable errors

4. **Keep IDs**: Store presentation/slide/element IDs for subsequent operations — they are stable for the lifetime of the object

5. **Read before writing**: Always call `slide_get` or `element_get` before `element_delete` or future update tools to confirm you have the right element ID
