---
name: figma-design-to-code
description: Convert Figma designs into production-ready frontend code for the WhatsApp SaaS admin. Use when implementing admin pages from Figma frames, design tokens, components, responsive layouts, dashboards, contact/campaign/template screens, modals, forms, tables, navigation, or visual QA against Figma references.
---

# Figma Design To Code

Use this skill when a Figma design is the source of truth for the admin frontend. Translate the design into maintainable UI that fits the existing codebase instead of copying pixels blindly.

## Workflow

- Inspect the current frontend stack, routing, styles, components, icons, and data-fetching patterns before implementing.
- Identify the Figma frame, target viewport, component states, and any responsive variants before writing code.
- Extract design intent: layout hierarchy, spacing rhythm, typography scale, color tokens, interaction states, and repeated components.
- Reuse existing local components and styles when they match the design. Add new components only when they will be reused or the design clearly requires them.
- Keep the admin experience operational: dense but readable tables, clear filters, obvious primary actions, safe destructive actions, and visible loading/empty/error states.
- Treat the Figma design as a product spec, but adapt details that would break accessibility, responsiveness, performance, or project conventions.

## Admin Frontend Rules

- Prioritize pages for login, dashboard, contacts, imports, campaigns, templates, flow builder, webhook/events, reports, and settings.
- Mask phone numbers and PII in default list views. Require explicit reveal patterns for sensitive fields.
- Use stable dimensions for sidebars, toolbars, table rows, cards, chips, icon buttons, and counters so state changes do not shift the layout.
- Prefer real UI controls: icon buttons with tooltips, segmented controls, toggles, selects, tabs, sliders, drawers, dialogs, and tables.
- Use lucide or the existing icon library when available instead of custom inline SVG icons.
- Do not create marketing-style hero pages for the admin. The first screen should be the usable product surface.

## Responsive Implementation

- Implement desktop, tablet, and mobile behavior from the design or infer sensible behavior when only one frame exists.
- On mobile, collapse navigation, simplify dense tables into cards or focused lists, and keep primary actions reachable.
- Ensure text never overflows buttons, chips, cards, or table cells. Use wrapping, truncation, tooltips, or responsive layout changes as appropriate.
- Check that modals, drawers, menus, and date/filter controls fit on small screens.

## Design QA

- Compare implementation against Figma for spacing, hierarchy, color usage, typography, and component states.
- Verify keyboard navigation, focus states, labels, contrast, and accessible names.
- Run the relevant frontend or E2E checks when available. Use Playwright screenshots for visual regression when the app has browser tests.
- If the Figma file is unavailable locally, ask for the frame link, exported screenshots, or design specs before making exact visual claims.
