# Examples

Detailed examples for presentation_build, themes, roles, auto-layout, and editing workflows.

## Full presentation_build Example

One call creates the entire deck: presentation, slides, theme, elements, speaker notes.

```json
{
  "title": "Q4 Product Review",
  "theme": {
    "colors": {
      "bg_dark": "#181818",
      "bg_light": "#FAFAFA",
      "bg_surface": "#F0EEFF",
      "bg_surface_dk": "#242424",
      "text_primary": "#181818",
      "text_inv": "#FFFFFF",
      "text_secondary": "#46484D",
      "text_muted": "#7A7C82",
      "text_muted_dk": "#B0B2B8",
      "accent": "#4318FF",
      "divider_dk": "#3A3A3A"
    },
    "fonts": {
      "heading": "Inter",
      "body": "Inter"
    }
  },
  "slides": [
    {
      "backgroundColor": "bg_dark",
      "elements": [
        {"type": "textbox", "role": "title", "text": "Q4 Product Review", "x": 60, "y": 120, "width": 600, "height": 60},
        {"type": "shape", "shapeType": "RECTANGLE", "fillColor": "accent", "x": 60, "y": 195, "width": 50, "height": 3},
        {"type": "textbox", "role": "subtitle", "text": "December 2025", "fontColor": "text_muted_dk", "x": 60, "y": 215, "width": 300, "height": 30}
      ],
      "notes": "Welcome everyone to the Q4 review."
    },
    {
      "backgroundColor": "bg_light",
      "layout": {"type": "grid", "columns": 3, "gap": 15, "y": 110},
      "elements": [
        {"type": "textbox", "role": "h1", "text": "Key Metrics", "x": 60, "y": 40, "width": 600, "height": 50},
        {"type": "shape", "shapeType": "ROUND_RECTANGLE", "fillColor": "bg_surface", "text": "$2.4M\nRevenue", "role": "stat", "verticalAlignment": "MIDDLE"},
        {"type": "shape", "shapeType": "ROUND_RECTANGLE", "fillColor": "bg_surface", "text": "1,200+\nCustomers", "role": "stat", "verticalAlignment": "MIDDLE"},
        {"type": "shape", "shapeType": "ROUND_RECTANGLE", "fillColor": "bg_surface", "text": "99.9%\nUptime", "role": "stat", "verticalAlignment": "MIDDLE"}
      ]
    }
  ]
}
```

Returns:
```json
{
  "presentationId": "abc123...",
  "url": "https://docs.google.com/presentation/d/abc123.../edit",
  "slides": [
    {"slideId": "slide_0", "elements": ["textbox_q4_product_review_0", "shape_1", "textbox_december_2025_2"]},
    {"slideId": "slide_1", "elements": ["textbox_key_metrics_0", "shape_revenue_1", "shape_customers_2", "shape_uptime_3"]}
  ]
}
```

## Using Text Roles

Roles eliminate repetitive fontSize/fontFamily/fontColor on every element. The theme resolves them.

**Without roles (verbose):**
```json
{"type": "textbox", "text": "Features", "role": "h1", "x": 60, "y": 40, "width": 600, "height": 50}
```

**With roles (clean):**
```json
{"type": "textbox", "role": "h1", "text": "Features", "x": 60, "y": 40, "width": 600, "height": 50}
```

Per-element overrides still work. If you set `fontSize: 32` on an element with `role: "h1"`, the 32pt wins over the role's 28pt. Everything else from the role still applies.

## Auto-layout Patterns

### Grid layout (3-column cards)

Elements with explicit x/y are placed manually. Elements without position flow into the grid.

```json
{
  "layout": {"type": "grid", "columns": 3, "gap": 15, "y": 110},
  "elements": [
    {"type": "textbox", "role": "h1", "text": "Our Services", "x": 60, "y": 40, "width": 600, "height": 50},
    {"type": "shape", "shapeType": "ROUND_RECTANGLE", "fillColor": "bg_surface", "text": "Consulting\nStrategic advice", "verticalAlignment": "MIDDLE"},
    {"type": "shape", "shapeType": "ROUND_RECTANGLE", "fillColor": "bg_surface", "text": "Development\nFull-stack builds", "verticalAlignment": "MIDDLE"},
    {"type": "shape", "shapeType": "ROUND_RECTANGLE", "fillColor": "bg_surface", "text": "Support\n24/7 monitoring", "verticalAlignment": "MIDDLE"}
  ]
}
```

This produces the same result as manually specifying x=60/260/460, y=110, w=185, h=140 on each card. The layout engine handles the math.

### Row layout (horizontal strip)

```json
{
  "layout": {"type": "row", "gap": 20, "y": 200},
  "elements": [
    {"type": "icon", "icon": "shield", "iconColor": "3B82F6"},
    {"type": "icon", "icon": "speed", "iconColor": "3B82F6"},
    {"type": "icon", "icon": "support", "iconColor": "3B82F6"}
  ]
}
```

### Column layout (vertical stack)

```json
{
  "layout": {"type": "column", "gap": 10, "x": 60},
  "elements": [
    {"type": "textbox", "role": "h2", "text": "Step 1: Discovery"},
    {"type": "textbox", "role": "body", "text": "We learn about your business and goals."},
    {"type": "textbox", "role": "h2", "text": "Step 2: Build"},
    {"type": "textbox", "role": "body", "text": "Our team builds the solution."}
  ]
}
```

## boldRange (Mixed Formatting)

For cards with a bold title + regular description in one element:

```json
{
  "type": "shape",
  "shapeType": "ROUND_RECTANGLE",
  "fillColor": "bg_surface",
  "text": "Card Title\nDescription goes here with more detail about this feature.",
  "fontSize": 14,
  "fontColor": "text_secondary",
  "lineSpacing": 150,
  "verticalAlignment": "MIDDLE",
  "boldRange": {"start": 0, "end": 10, "fontSize": 16, "color": "text_primary"},
  "x": 60, "y": 110, "width": 185, "height": 140
}
```

## Buttons

ROUND_RECTANGLE shape with centered text. Use `role: "button"` or specify manually:

```json
{"type": "shape", "shapeType": "ROUND_RECTANGLE", "fillColor": "accent", "borderColor": "accent",
 "borderWidth": 0.5, "role": "button", "text": "Book a Demo",
 "verticalAlignment": "MIDDLE", "x": 270, "y": 290, "width": 180, "height": 40}
```

## Round-trip Editing with slide_read

`slide_read` returns element specs compatible with slide_build. Use it for structured editing:

```
1. specs = slide_read(presentationId, slideId)
   // Returns: [{"type": "textbox", "role": "h1", "text": "Old Title", "x": 60, ...}, ...]

2. Modify the specs (change text, reposition, add/remove elements)

3. Delete existing elements:
   element_delete(presentationId, elementId) for each old element

4. Rebuild with modified specs:
   slide_build(presentationId, slideId, elements: modifiedSpecs)
```

## slide_duplicate_modify

Clone a slide and apply changes in one call. Useful for series slides:

```
slide_duplicate_modify(presentationId, slideId, {
  changes: {
    "team_name": { text: "Engineering" },
    "team_count": { text: "42 engineers" },
    "team_image": { imageUrl: "https://..." }
  }
})
```

This duplicates the slide, then updates the specified elements by ID with new values. No need to manually duplicate + edit each element.

## Validation

Add `validate: true` to slide_build or presentation_build:

```json
{
  "validate": true,
  "elements": [...]
}
```

Returns warnings like:
- "Element 'stat_revenue' overlaps 'stat_label' by 12pt"
- "Element 'footer_text' extends outside safe area (y=392, limit=380)"
- "Element 'caption_note' has 9pt text, minimum recommended is 11pt"

Use during development to catch layout issues before visual QA.
