# Demo Deck Workflow

Repeatable workflow for managing sales demo presentations. Uses a master deck as the
single source of truth, duplicates per prospect, and evolves the deck through the
sales cycle using in-presentation operations only (no cross-presentation injection).

## Strategy: superset master deck

The master deck contains every slide you might need for any deal. Before each meeting,
duplicate the master and delete what you don't need. This is more reliable than trying
to inject slides from other presentations because:

- `slide_delete` is one API call and never fails
- Cross-presentation slide copy is limited by Google's API (no native support)
- All duplication and modification tools work perfectly within a single presentation
- The master evolves over time as you add/improve slides

## Master deck setup

### Structure

Build the master with `presentation_build`. Include all possible slides:

| Slide | Purpose | Token placeholders |
|-------|---------|-------------------|
| Title | Company-branded cover | `{{company}}`, `{{contact_name}}`, `{{date}}` |
| Agenda | Meeting agenda | `{{agenda_items}}` |
| Problem | Pain point framing | `{{pain_point}}` |
| Product demo | Core walkthrough slides | (static, no tokens) |
| Case study | Social proof | `{{case_company}}`, `{{case_result}}` |
| Pricing | Tiers and pricing | `{{tier}}`, `{{price}}` |
| Recap | Post-meeting summary | `{{recap_bullets}}`, `{{next_steps}}` |
| Next steps | Action items + CTA | `{{next_meeting_date}}` |

### Element IDs matter

Set custom `id` on every element that will be swapped per deal:
- `company_logo` (image element for logo replacement)
- `company_name` (text with `{{company}}`)
- `contact_name` (text with `{{contact_name}}`)
- `recap_content` (text on recap slide)
- `pricing_table` (table element)
- `next_steps_content` (text element)

This makes `slide_duplicate_modify` and `element_replace_image` calls predictable.

### Registry as archive

Save your best slides to the registry for reference when updating the master:
```
registry_save_slide({ name: "pricing-enterprise-v2", presentationId: "master_id", slideId: "pricing_slide_id", tags: ["pricing", "enterprise"] })
```

The registry is for bookmarking and versioning good slides, not for runtime injection.

## Workflow: pre-demo prep

### Step 1: Duplicate master

```
presentation_create_from_template({
  templateId: "<master_deck_id>",
  title: "Demo: Acme Corp - 2026-04-10",
  replacements: {
    "{{company}}": "Acme Corp",
    "{{contact_name}}": "Jane Smith",
    "{{date}}": "April 10, 2026",
    "{{pain_point}}": "Manual contract review taking 3+ hours per deal"
  }
})
```

Returns: `presentationId`, URL.

### Step 2: Replace logo

```
element_replace_image({
  presentationId: "<new_deck_id>",
  elementId: "company_logo",
  url: "https://acme.com/logo.png"
})
```

Scrape the prospect's website for their logo URL. Most Framer/Webflow/CDN URLs work.

### Step 3: Delete slides not needed for this meeting

If this is a first demo, delete the pricing and recap slides:

```
slide_delete({ presentationId: "<new_deck_id>", slideId: "<pricing_slide_id>" })
slide_delete({ presentationId: "<new_deck_id>", slideId: "<recap_slide_id>" })
```

Use `presentation_get` or `slide_get` to find slide IDs if needed.

### Step 4: Reorder if needed

```
slide_reorder({ presentationId: "<new_deck_id>", slideId: "<case_study_id>", insertionIndex: 3 })
```

## Workflow: post-demo update

### Fill in the recap slide

If the recap slide was kept in the deck, update it:

```
slide_duplicate_modify({
  presentationId: "<deck_id>",
  sourceSlideId: "<recap_template_slide>",
  changes: [
    {
      "elementId": "recap_content",
      "text": "Key takeaways:\n- Team spends 15hrs/week on manual review\n- Current tool lacks AI extraction\n- Decision by Q2"
    },
    {
      "elementId": "next_steps_content",
      "text": "1. Send pricing proposal by Friday\n2. Schedule technical deep-dive\n3. Loop in legal team"
    }
  ]
})
```

If the recap slide was deleted earlier, duplicate one from within the same deck (the master
always has one, so next time keep it and just fill it in).

## Workflow: follow-up meeting prep

### Duplicate the existing deal deck (not the master)

For the second meeting, start from the last version of this prospect's deck:

```
presentation_create_from_template({
  templateId: "<acme_demo_deck_id>",
  title: "Acme Corp - Follow-up - 2026-04-17"
})
```

No token replacement needed since the prospect details are already filled in.

### Add pricing if not present

If pricing was deleted from the first meeting's deck, it won't be in this copy.
Two options:

**Option A (recommended):** Go back to the master, duplicate it fresh, delete different slides.
This is cleaner because the master always has everything.

**Option B:** Duplicate the follow-up deck from the previous meeting's deck, then manually
add pricing content using `slide_create` + `slide_build`. More work but keeps the
conversation history from the previous deck.

### Update the recap with new meeting notes

Same pattern as post-demo: `slide_duplicate_modify` on the recap slide.

## Multi-deal management

For multiple active deals:

1. One master deck (the template)
2. One presentation per deal, named consistently: `"Demo: {Company} - {Date}"`
3. Use `presentation_list` to find existing deal decks:
   ```
   presentation_list({ query: "Demo: Acme" })
   ```
4. Each deal deck evolves independently through the sales cycle

## Quick reference: tools by stage

| Stage | Tools |
|-------|-------|
| **Create deal deck** | `presentation_create_from_template`, `element_replace_image` |
| **Customize for meeting** | `slide_delete`, `slide_reorder`, `slide_duplicate_modify` |
| **Post-meeting recap** | `slide_duplicate_modify` (fill recap), `element_update_text` |
| **Follow-up prep** | `presentation_create_from_template` (from previous deck or master) |
| **Update master** | `slide_build`, `slide_duplicate_modify`, `registry_save_slide` |
| **Find deal decks** | `presentation_list` |
| **Export for sharing** | `presentation_export` (PDF/PPTX) |
