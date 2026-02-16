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

## Element Tools

### element_delete

Delete an element (text box, shape, image, etc.) from a slide.

**Parameters:**
- `presentationId` (string, required): The ID of the presentation
- `elementId` (string, required): The ID of the element to delete

**Returns:**
Success message

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

1. **Always get presentation first**: Use `get_presentation` to understand structure before making changes

2. **Use helper tools**: Prefer `add_text_box` over low-level `element_create` for common operations

3. **Batch operations**: Group related changes together when possible (future feature)

4. **Handle errors gracefully**: Check for `success: false` and handle retryable errors

5. **Keep IDs**: Store presentation/slide/element IDs for subsequent operations
