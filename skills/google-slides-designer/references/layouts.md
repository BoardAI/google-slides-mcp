# Slide Layout Patterns

> **Auto-layout alternative:** Many of these manual coordinate patterns can be replaced with
> auto-layout. For example, a 3-column card layout can use `layout: {"type": "grid", "columns": 3, "gap": 15, "y": 110}`
> instead of manually calculating x/y/width for each card. Elements with explicit x/y are placed
> manually; elements without position flow into the layout. See `references/examples.md` for
> auto-layout patterns. The manual coordinates below remain useful as a reference for exact
> positioning or when you need pixel-perfect control.

## Element ID Convention

slide_build generates semantic IDs automatically. You can also pass custom IDs via the `id` field
for elements you know you'll need to reference later (e.g. `id: "cta_button"` or `id: "hero_title"`).

All patterns use `slide_build` element arrays. Positions are verified and tested.
Coordinates are in points. Slide canvas: 720 x 405pt. Safe area: x=60-660, y=40-380.

## Table of Contents

1. [Title Slide (split)](#title-slide-split-layout)
2. [Content Cards (3-column)](#content-cards-3-column)
3. [Feature Grid (2x2)](#feature-grid-2x2)
4. [Stats with Dividers (dark)](#stats-with-dividers-dark)
5. [Process Steps](#process-steps)
6. [Quote / Testimonial (dark)](#quote--testimonial-dark)
7. [Section Divider (split)](#section-divider-split-layout)
8. [CTA / Thank You (dark)](#cta--thank-you-dark)
9. [Comparison Table](#comparison-table)
10. [Icon Feature List (2-column)](#icon-feature-list-2-column)

---

## Title Slide (split layout)

Left dark panel with optional image, right side with title + body + CTA.

```
bg_color: bg_light

Left panel:   shape  RECTANGLE      x=0,   y=0,   w=260, h=405  fill=bg_dark
Logo/brand:   textbox               x=35,  y=35,  w=120, h=28   16pt bold text_inv
Image:        image                 x=15,  y=85,  w=230, h=250  (optional)
Panel footer: textbox               x=35,  y=360, w=120, h=20   11pt text_muted

Title:        textbox               x=300, y=80,  w=380, h=90   32pt bold text_primary, lineSpacing 130
Accent line:  shape  RECTANGLE      x=300, y=180, w=50,  h=3    fill=accent
Body:         textbox               x=300, y=200, w=370, h=80   14pt text_secondary, lineSpacing 150
CTA button:   shape  ROUND_RECT     x=300, y=300, w=140, h=36   fill=accent, "Get Started" 13pt bold text_inv center
Contact:      textbox               x=460, y=307, w=200, h=20   11pt text_muted
```

## Content Cards (3-column)

Three rounded cards with title + description. Use for pain points, features, benefits.

```
bg_color: bg_light

Section title: textbox              x=60,  y=40,  w=600, h=50   32pt bold text_primary
Card 1:  shape ROUND_RECT           x=60,  y=110, w=185, h=140  fill=bg_surface
Card 2:  shape ROUND_RECT           x=260, y=110, w=185, h=140  fill=bg_surface
Card 3:  shape ROUND_RECT           x=460, y=110, w=185, h=140  fill=bg_surface
  Each card: text="Title\nDescription", fontSize=14, fontColor=text_secondary,
             lineSpacing=150, verticalAlignment=MIDDLE,
             boldRange={start:0, end:<title_len>, fontSize:16, color:text_primary}
Summary: textbox                    x=60,  y=275, w=600, h=60   14pt text_secondary
```

Card math: (600 - 2*15) / 3 = 190pt per card. Use 185pt with 15pt gaps.

## Feature Grid (2x2)

Four feature cards in a grid.

```
bg_color: bg_light

Title:    textbox                   x=60,  y=40,  w=600, h=50   32pt bold text_primary
Subtitle: textbox                   x=60,  y=95,  w=600, h=30   16pt text_secondary
Card TL:  shape ROUND_RECT          x=60,  y=150, w=290, h=100  fill=bg_surface
Card TR:  shape ROUND_RECT          x=370, y=150, w=290, h=100  fill=bg_surface
Card BL:  shape ROUND_RECT          x=60,  y=265, w=290, h=100  fill=bg_surface
Card BR:  shape ROUND_RECT          x=370, y=265, w=290, h=100  fill=bg_surface
  Each card: same text + boldRange pattern as 3-column
```

Grid math: (600 - 20) / 2 = 290pt per card. 20pt horizontal gap, 15pt vertical.

## Stats with Dividers (dark)

Big metric numbers separated by vertical divider lines.

```
bg_color: bg_dark

Label:       textbox                x=60,  y=80,  w=200, h=22   12pt bold accent (UPPERCASE)
Accent line: shape RECTANGLE        x=60,  y=110, w=40,  h=3    fill=accent

Stat 1 num:  textbox                x=60,  y=160, w=190, h=60   48pt bold text_inv
Stat 1 lbl:  textbox                x=60,  y=230, w=190, h=25   14pt text_muted_dk
Divider:     shape RECTANGLE        x=255, y=155, w=2,   h=100  fill=divider_dk
Stat 2 num:  textbox                x=280, y=160, w=190, h=60   48pt bold text_inv
Stat 2 lbl:  textbox                x=280, y=230, w=190, h=25   14pt text_muted_dk
Divider:     shape RECTANGLE        x=475, y=155, w=2,   h=100  fill=divider_dk
Stat 3 num:  textbox                x=500, y=160, w=180, h=60   48pt bold text_inv
Stat 3 lbl:  textbox                x=500, y=230, w=180, h=25   14pt text_muted_dk
```

For 4 stats in a row, use smaller cards and 36pt numbers (not 48pt) to prevent overflow:

```
Stat cards (4 across):
  Card 1: shape ROUND_RECT  x=60,  y=100, w=140, h=75  fill=bg_surface
  Card 2: shape ROUND_RECT  x=210, y=100, w=140, h=75  fill=bg_surface
  Card 3: shape ROUND_RECT  x=360, y=100, w=140, h=75  fill=bg_surface
  Card 4: shape ROUND_RECT  x=510, y=100, w=150, h=75  fill=bg_surface
  Each card: text="VALUE\nLabel", fontSize=10, fontColor=text_secondary,
             alignment=CENTER, boldRange={start:0, end:<value_len>, fontSize:36, color:accent}
```

Stat card sizing rules:
- 2 stats: 48pt numbers, 280pt wide cards
- 3 stats: 48pt numbers, 190pt wide cards (with dividers)
- 4 stats: 36pt numbers, 140pt wide cards (values like "$2.4M" or "1,000+" fit at 36pt but overflow at 48pt)

## Process Steps

Numbered circles with labels underneath.

```
bg_color: bg_light

Title:     textbox                  x=60,  y=40,  w=600, h=50   32pt bold text_primary

Step 1 (centered at x=130):
  Circle:  shape ELLIPSE            x=100, y=130, w=50,  h=50   fill=accent
           text="1", fontSize=20, bold=true, fontColor=text_inv, alignment=CENTER, verticalAlignment=MIDDLE
  Label:   textbox                  x=50,  y=200, w=160, h=28   16pt bold text_primary, CENTER
  Desc:    textbox                  x=50,  y=230, w=160, h=50   12pt text_secondary, CENTER

Step 2 (centered at x=360): circle x=335, text x=280
Step 3 (centered at x=592): circle x=567, text x=512
```

Center groups at 1/6, 3/6, 5/6 of the 600pt content width (offset by left margin 60pt).

## Quote / Testimonial (dark)

Large italic quote with attribution below a divider line.

```
bg_color: bg_dark

Label:      textbox                 x=60,  y=60,  w=200, h=22   12pt bold accent (UPPERCASE, e.g. "WHAT CUSTOMERS SAY")
Accent:     shape RECTANGLE         x=60,  y=90,  w=40,  h=3    fill=accent
Quote:      textbox                 x=60,  y=120, w=600, h=120  24pt italic text_inv, lineSpacing 150
Divider:    shape RECTANGLE         x=60,  y=270, w=600, h=1    fill=divider_dk
Name:       textbox                 x=60,  y=290, w=300, h=25   16pt bold text_inv
Title/Co:   textbox                 x=60,  y=318, w=300, h=22   14pt text_muted_dk
```

## Section Divider (split layout)

Section number on dark left panel, title on right. Use between major sections.

```
bg_color: bg_light

Left panel:  shape RECTANGLE        x=0,   y=0,   w=260, h=405  fill=bg_dark
Number:      textbox                x=35,  y=160, w=190, h=50   48pt bold accent
Section:     textbox                x=35,  y=215, w=190, h=30   18pt text_muted_dk
Title:       textbox                x=300, y=140, w=370, h=80   36pt bold text_primary
Accent:      shape RECTANGLE        x=300, y=230, w=50,  h=3    fill=accent
Description: textbox                x=300, y=250, w=370, h=60   14pt text_secondary, lineSpacing 150
```

## CTA / Thank You (dark)

Centered title with accent line. Calculate positions based on title line count.

**1-line title** (e.g. "Thank You"):
```
Title:      textbox                 x=60,  y=140, w=600, h=60   44pt bold text_inv, CENTER
Accent:     shape RECTANGLE         x=310, y=210, w=100, h=3    fill=accent
Subtitle:   textbox                 x=60,  y=225, w=600, h=35   18pt text_muted_dk, CENTER
CTA button: shape ROUND_RECT        x=270, y=280, w=180, h=40   fill=accent CENTER
Contact:    textbox                 x=60,  y=340, w=600, h=25   12pt text_muted, CENTER
```

**2-line title** (e.g. "Ready to Transform Your\nContract Workflow?"):
```
Title:      textbox                 x=60,  y=80,  w=600, h=115  44pt bold text_inv, CENTER, lineSpacing 120
Accent:     shape RECTANGLE         x=310, y=205, w=100, h=3    fill=accent  (80+115+10)
Subtitle:   textbox                 x=60,  y=220, w=600, h=35   18pt text_muted_dk, CENTER
CTA button: shape ROUND_RECT        x=270, y=275, w=180, h=40   fill=accent CENTER
Contact:    textbox                 x=60,  y=335, w=600, h=25   12pt text_muted, CENTER
```

Always calculate: `accent_y = title_y + title_height + 10`. Never hardcode the accent position
without considering how many lines the title has.

## Comparison Table

Title + subtitle above a styled table. Tables use separate MCP tools (not slide_build).

```
bg_color: bg_light

Title:    textbox (via slide_build)  x=60, y=30, w=600, h=40   28pt bold text_primary
Subtitle: textbox (via slide_build)  x=60, y=72, w=600, h=25   14pt text_secondary

Table:    add_table                  x=60, y=110, w=600, h=260  rows=N, columns=M
```

Table styling sequence (after add_table):
1. `table_set_cell` for each cell's text content (parallelize all)
2. `table_style_cell` for header row: backgroundColor=bg_dark, columnSpan=all
3. `table_style_cell` for alternating rows: backgroundColor=bg_surface (every other)
4. `table_format_cell_text` for header: bold, 12pt, text_inv, fontFamily
5. `table_format_cell_text` for data: 11pt, fontFamily, color-coded values

Table bugs:
- `table_style_cell` padding params (paddingTop, etc.) are rejected by the API.
- `table_style_cell` backgroundColor works correctly with columnSpan/rowSpan
- Use green (#16A34A) for positive values, red (#EF4444) for negative, muted for neutral

## Icon Feature List (2-column)

Two columns of icon + label rows. Great for capabilities/features slides.

```
bg_color: bg_light

Title:    textbox                   x=50,  y=25,  w=620, h=20   9pt bold accent (UPPERCASE)
Subtitle: textbox                   x=50,  y=49,  w=620, h=35   20pt bold text_primary

Left col label:  textbox            x=50,  y=92,  w=140, h=18   10pt bold accent
Right col label: textbox            x=370, y=92,  w=140, h=18   10pt bold accent

Left items (y starts at 115, 25pt spacing):
  icon   type=icon                  x=50,  y=113, w=22, h=22    icon="search--v1" iconColor=accent
  label  textbox                    x=80,  y=115, w=200, h=18   11pt bold text_primary
  (repeat with y += 25 for each row)

Right items (same y values):
  icon   type=icon                  x=370, y=113, w=22, h=22    icon="chat" iconColor=accent
  label  textbox                    x=400, y=115, w=200, h=18   11pt bold text_primary
```

Use the `type: "icon"` element in slide_build for inline icons. Pass `icon` (Icons8 slug) and
`iconColor` (hex without #). See references/icons.md for the full icon mapping.
