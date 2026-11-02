---
name: product-dashboard-design
description: Design and implement clear, premium operational dashboards and public home pages from product specifications without turning every API field into UI. Use for React, Tailwind, and similar frontend product work.
metadata:
  short-description: Build focused operational UI from specs
---

# Product Dashboard Design

Build products that feel intentional, calm, and useful under real operational load. This skill is for management dashboards, internal portals, workflow-heavy forms, and public event or program pages. It does not turn a specification, database model, or list of endpoints into a matching list of UI sections.

## Product-First Reading Of Specifications

Treat the specification as a source of business capability, not a page inventory.

Before coding, identify:

1. The actors and the decisions each actor must make.
2. The dominant workflow for each screen.
3. The information needed immediately, later, and only on demand.
4. State, permission, and lifecycle rules that change what actions are available.

For every proposed screen, write one sentence internally: **"This screen helps [actor] decide or complete [outcome]."** If the sentence contains multiple outcomes, split the screen or move secondary content into a detail view.

An API endpoint is a data capability. It is not automatically a tab, card, action, or page. A detail endpoint may support a side panel; an export endpoint may belong in an overflow menu; multiple endpoints may support one coherent workflow.

## Information Hierarchy

Classify data before designing:

| Level | Placement | Examples |
|---|---|---|
| Primary | Visible without interaction | Current status, key count, required next action, title |
| Secondary | Nearby but visually quieter | Supporting counts, filters, compact status context |
| Detail | Drawer, detail page, expanded row, or modal | Long descriptions, histories, all metadata |
| Action | Appears only when permitted and relevant | Approve, publish, calculate, archive, export |

Do not place all four levels in every card. A page should surface the smallest set of information that lets the user act with confidence.

For an operational dashboard, use this rhythm:

1. Current operational state and urgent attention.
2. A small number of meaningful summaries or trends.
3. Focused workflow areas or data tables.
4. Details only after selection, expansion, or navigation.

## Screen Planning

When receiving a new feature request, propose or implement in this order:

1. **Sitemap and routes:** group capabilities by user task, not by database entity.
2. **Screen objective:** one main job per page.
3. **Primary action:** no more than one visually dominant CTA per area.
4. **States:** loading, empty, unavailable, validation error, server error, success, and locked/readonly when applicable.
5. **Progressive disclosure:** filters, expanded rows, drawers, modal confirmations, or detail pages for secondary content.
6. **Responsive behavior:** tables may scroll horizontally only within their own region; forms and controls reflow predictably.

Use a centered modal for short confirmations or short forms. Use a right-side detail panel or page for inspecting records. Use a full-screen modal or normal page for long, multi-section configuration workflows. Long modal bodies must scroll independently while header and footer actions remain reachable.

## Visual Language

Use a warm, light operational design language:

```text
Brand/action green:  #008060
Primary ink:         #202223
Body ink:            #303030
Muted ink:           #6D7175
Canvas:              #F6F6F7
Panel:               #FFFFFF
Subtle surface:      #F1F2F3
Border:              #E1E3E5
```

- Use orange for primary actions, active navigation accents, and deliberate emphasis. Do not use it for every icon, border, chart, or badge.
- Keep readable text dark on light backgrounds. Never use low-contrast gray for input values, essential metadata, or KPI numbers.
- Keep the product sidebar in its established warm brand color when the brand calls for it. Do not replace it with a generic dark template merely because the page is a dashboard.
- Use color semantically in charts and statuses: blue for informational/progress, green for healthy/completed, amber for attention, red for risk/destructive. Orange remains the brand/action color.
- Avoid decorative gradients, bokeh/orb effects, atmospheric imagery, and generic AI-dashboard ornamentation.

## Layout Grammar

Use a consistent application shell:

- Persistent sidebar for role-specific navigation, brand, current workspace, account, and logout.
- Top header only for page context and global utilities such as notifications.
- Main canvas with stable page padding, normally `px-8 py-6` on desktop.
- Page header followed by overview, insight, and detailed operations in that order.
- Open the currently relevant event, workflow, or record by default; leave unrelated historical entities collapsed unless the user explicitly requests otherwise.

For public pages, use a simpler navigation and let real event identity, banner imagery, and content lead. Avoid turning a public page into an admin dashboard or inventing marketing sections without a product reason.

## Component Grammar

### Panels and cards

- Primary panels: white background, `1px` neutral border, restrained shadow only when elevation matters.
- Secondary/nested areas: subtle gray surface, usually no shadow.
- Highlighted workflow area: use a controlled left accent or a status treatment, not a different visual system.
- Prefer a deliberate radius system: panels `12px`, buttons and inputs `8px`, badges `6px` or full pill only for compact statuses.
- Do not make every region a floating card. Use whitespace, sections, and dividers to organize a page.

### Typography

- Page title: strong dark heading; large enough for clear orientation, not a marketing hero by default.
- Section label: small uppercase text with restrained tracking and muted slate color.
- Section title: concise, semibold rather than bold everywhere.
- Body copy: normal weight, dark slate, readable line height.
- Numbers: tabular or mono-friendly styling where comparison matters.
- Use user-facing language. Never expose internal terms such as endpoint, backend, payload, database, or implementation notes in normal product UI.

### Buttons and actions

- Primary: filled orange, semibold, clear action verb.
- Secondary: white background, neutral border, dark text.
- Destructive: red text; add a red border or filled treatment only when the risk deserves it.
- Icon-only controls are appropriate for familiar row actions and require a tooltip or accessible label.
- Keep destructive and irreversible actions behind confirmation with the actual consequence stated plainly.

### Forms

- Use labels, helpful placeholders, and field-level validation messages.
- Do not rely only on an error banner at the top of a long form.
- On submit failure, focus or scroll the form body to the first invalid field, give it a visible error state, and preserve entered values.
- Disable duplicate submissions while a request is pending and use clear in-context progress text such as `Đang lưu...`.
- Do not hard-code choices or limits that should come from current domain data.

### Tables and dense data

- Prefer row dividers over heavy outer borders.
- Header cells: compact uppercase labels, subtle color, no decorative background.
- Rows: readable vertical spacing and a quiet hover state.
- Keep columns that answer the main decision visible; place optional metadata in a detail panel or expanded row.
- Do not truncate essential identifiers, statuses, or selected values without a route to view the full value.

## Dashboards And Charts

Only create a chart when it answers a question that a table or KPI cannot answer as quickly.

Good questions include:

- Which event has the most teams?
- How has submission volume changed between events?
- Which track is near capacity?
- Where is scoring work concentrated?
- What is the distribution of operational states?

Chart selection:

- Line or area: change over time or a sequence with meaning.
- Horizontal bar: ranking or comparison across long category labels.
- Grouped bar: compare two related measures for one selected context.
- Donut: a small status distribution with few categories; do not use several donuts just because counts exist.
- KPI: a single current value or urgent summary.

Use a filter to focus dense charts on one active/current entity where comparison across all entities would be noisy. Keep a historical comparison chart separate from per-entity operational detail.

Avoid dashboards full of charts that repeat the same count in different forms. Make every visualization earn its space.

## Content And Public Descriptions

Long rich descriptions may be stored as HTML and displayed on public pages. Present a concise, visually balanced preview in a card or event list, with an explicit route to a readable full-detail view. Do not add technical explanatory copy about truncation, API sourcing, or rendering mechanics.

Use relevant real or generated bitmap imagery for event banners and inspectable subjects. Images should clarify the subject, not serve as abstract decoration.

## Implementation Discipline

- Preserve existing API contracts, service functions, authorization, and business rules unless the task explicitly changes them.
- Build shared primitives before duplicating visual patterns across pages: app shell, page header, panel, status badge, buttons, form field, table, empty state, confirmation dialog.
- Inspect the current code and design system before adding new patterns.
- Prefer local conventions over fresh abstractions.
- Do not add libraries for a problem that existing components or browser capabilities solve.
- Keep component logic and API mapping separate from presentational refactors.

## Pre-Delivery UI Check

Before declaring UI work complete, verify:

- The first viewport makes the page's purpose and primary next action clear.
- Essential text and input values have sufficient contrast.
- The layout works at desktop and a narrow mobile/tablet width without clipping or overlap.
- Long forms and detail views have bounded, usable scrolling.
- Empty, loading, error, success, and disabled states are understandable.
- Filters/default selection align with the user’s most likely active context.
- The page does not duplicate the same data in two competing primary sections.
- Every chart communicates a decision-relevant insight.
- User-facing copy describes business meaning, not implementation mechanics.

## Avoid These Failure Modes

- Rendering one component, tab, or button for every endpoint or entity.
- Over-rounded cards, pills, and buttons that make the product look templated.
- Low-contrast gray text on white surfaces.
- Repeating the same colored icon-in-a-square for every heading.
- Multiple equally prominent actions in one region.
- A top-only error message in a long form with no field-level guidance.
- Full-page horizontal overflow caused by a table, modal, or oversized grid.
- Technical copy such as “request sent to backend” in user-facing interfaces.
- Charts that merely decorate a dashboard or repeat a KPI.
