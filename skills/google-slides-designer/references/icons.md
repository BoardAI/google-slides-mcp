# Icons System

The Google Slides API has no built-in icon library. SVG sources (Iconify, Google Fonts Material
Symbols) are rejected by the API. Icons8 PNGs work reliably and are the recommended approach.

## Using Icons

### In slide_build (preferred)

Use `type: "icon"` elements directly in slide_build. The MCP server builds the Icons8 URL for you:

```json
{
  "type": "icon",
  "icon": "shield",
  "iconColor": "6C5CE7",
  "iconStyle": "ios-filled",
  "x": 50, "y": 113,
  "width": 22, "height": 22
}
```

Parameters:
- `icon` (required): Icons8 slug from the mapping table below
- `iconColor` (optional): hex without #, defaults to "000000"
- `iconStyle` (optional): Icons8 style, defaults to "ios-filled"
- `fontColor` also works as a fallback for iconColor

### Icon element IDs

Icons get semantic IDs like `icon_shield_5` or `icon_search_v1_3`. When using `add_icon`
(outside slide_build), the returned element ID is `icon_<timestamp>`. If you need a predictable
ID for later editing, use slide_build with a custom `id` field instead.

### Via add_icon tool

Standalone tool for adding icons outside of slide_build:

```
add_icon(presentationId, slideId, icon: "shield", x: 50, y: 113, size: 22, color: "6C5CE7")
```

### Via add_image (manual URL)

If you need direct control, construct the URL yourself:

```
https://img.icons8.com/{style}/100/{color}/{slug}.png
```

## Size Guidelines

| Context | Size | Notes |
|---------|------|-------|
| Inline with text (feature lists) | 20-24pt | Place 5pt left of text label |
| Card accent | 28-32pt | Top-left corner of card |
| Large feature | 40-48pt | Standalone feature highlight |

## Color Variants

```
# On light backgrounds: use accent color
iconColor: "6C5CE7"

# On dark backgrounds: use white
iconColor: "FFFFFF"

# Muted/secondary
iconColor: "94A3B8"

# Default black
iconColor: "000000"
```

## Style Variants

| Style | Description | Best for |
|-------|-------------|----------|
| `ios-filled` | Solid filled (default) | Professional presentations |
| `ios` | Outline/thin | Lighter, minimal designs |
| `fluency` | Modern with gradients | Colorful, playful decks |
| `material-rounded` | Google Material style | Tech-oriented decks |
| `color` | Full color icons | When brand colors aren't needed |

## Icon Mapping

All slugs below are tested and confirmed working with the Google Slides API.

| Concept | Icons8 slug | Use for |
|---------|-------------|---------|
| Search/Review | `search--v1` | Reviews, Q&A, discovery |
| Shield/Security | `shield` | Risk analysis, compliance, protection |
| Edit/Redline | `edit--v1` | Editing, redlines, modifications |
| Book/Playbook | `book` | Playbooks, documentation, guides |
| Chart/Analytics | `bar-chart` | Reporting, analytics, dashboards |
| Handshake/Deal | `handshake` | Negotiation, partnerships, deals |
| People/Team | `conference-call` | Teams, stakeholders, collaboration |
| Database/Data | `data-configuration` | Data sources, integration, storage |
| Robot/AI | `robot-2` | AI agents, automation, bots |
| Clock/Time | `clock--v1` | Scheduling, timelines, deadlines |
| Checkmark/Done | `checkmark` | Completed, verified, approved |
| Document/File | `document` | Contracts, files, paperwork |
| Money/Pricing | `money` | Pricing, cost, revenue |
| Lightning/Fast | `flash-on` | Speed, performance, quick |
| Lock/Secure | `lock` | Security, encryption, access |
| Link/Connect | `link` | Integrations, connections, APIs |
| Eye/Visibility | `visible` | Visibility, monitoring, oversight |
| Target/Goal | `goal` | Targets, objectives, KPIs |
| Star/Premium | `star` | Featured, premium, highlights |
| Chat/Q&A | `chat` | Conversations, support, Q&A |
| Gear/Settings | `settings` | Configuration, settings, tools |
| Globe/Global | `globe` | International, web, worldwide |
| Download/Export | `download` | Downloads, exports, outputs |
| Upload/Import | `upload` | Uploads, imports, inputs |
| Warning/Alert | `error` | Warnings, alerts, issues |
| Arrow/Growth | `line-chart` | Growth, trends, progress |

### Finding new icons

Browse https://icons8.com/icons and search for what you need. The slug is the last part of the
icon URL. For example, `https://icons8.com/icons/set/rocket` means the slug is `rocket`.

Some icons have version suffixes like `--v1`, `--v2`. If a slug doesn't work, try adding `--v1`.
