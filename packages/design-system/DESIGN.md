---
name: Bespoke Design System
description: Premium visual system for the Bespoke catalog, checkout, and admin surfaces.
colors:
  background: "#ffffff"
  surface: "#ffffff"
  surface-elevated: "#f7f4ee"
  surface-muted: "#f3f0ea"
  text-primary: "#11100d"
  text-secondary: "#5d5a52"
  brand-primary: "#090907"
  brand-secondary: "#2a2925"
  champagne-accent: "#c9a76d"
  champagne-soft: "#efe4cf"
  border: "#ddd7ca"
  success: "#2f6b4f"
  warning: "#9a6a28"
  danger: "#9d3737"
  info: "#435f74"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: "Inter, Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Inter, Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0"
  label:
    fontFamily: "Inter, Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 800
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "8px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "44px"
    width: "44px"
  badge-neutral:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "24px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
---

# Design System: Bespoke

## 1. Overview

**Creative North Star: "Private Gallery"**

Bespoke should feel like a private buying gallery: predominantly white, highly controlled, with black as the authority signature and champagne gold as a rare mark of exclusivity. The admin interface provides the product discipline: clear components, crisp hierarchy, compact controls, readable panels, and predictable states. The storefront should inherit that confidence without becoming an admin screen.

The brand promise is luxury and exclusivity even when the surface is "only" a catalog. The customer should feel they are browsing a selective curation, not a handmade market or generic storefront. Give products room, remove rustic cues, avoid decorative texture, and let the future logo become the final source of truth for the black and champagne values.

**Key Characteristics:**
- Predominantly white surfaces with warm tonal layers only where they separate content or state.
- Near-black brand color for decisions, identity, admin authority, and primary actions.
- Champagne gold as a rare signature for logo marks, active states, focus, and prestige details.
- Compact, accessible, consistent components that bring admin discipline into the storefront.
- Restrained luxury: less craft texture, less ornament, more space, rhythm, and confidence.

## 2. Colors

The palette is a gallery composition: white as air, black as authority, champagne as exclusivity.

### Primary
- **Signature Black**: used for brand identity, primary actions, strong active states, and authority surfaces such as the admin sidebar. It must carry decisions, not decorate.
- **Champagne Gold**: used for logo marks, active indicators, focus treatments, curation details, and small prestige moments. It must stay rare.

### Secondary
- **Soft Black**: used when absolute black would feel too heavy, especially secondary brand text, dark gradients, and supporting visual depth.
- **Soft Champagne**: used for subtle tonal backgrounds, skeleton states, and cases where gold needs presence without competing with the product.

### Tertiary
- **Functional States**: success green, warning amber, danger red, and information blue communicate system state, not brand personality. Use them for badges, errors, warnings, and feedback.

### Neutral
- **Gallery White**: the primary background and dominant surface. The storefront must remain mostly white.
- **Elevated Ivory**: an elevated layer for product imagery, panels, and quiet contrast. Use carefully so the interface does not drift back into an artisanal mood.
- **Pale Champagne Line**: borders, dividers, and outlines. It provides silent structure, not ornament.
- **Ink Text**: near-black body and title text with firm contrast.
- **Warm Graphite Text**: secondary copy, labels, and descriptions. Never make it too pale.

### Named Rules

**The Champagne Restraint Rule.** Champagne gold is never a generic fill. If more than 10% of a screen is gold, the interface stops feeling exclusive and starts feeling themed.

**The White Gallery Rule.** White is the luxury here. Cream, sand, and craft-tinted backgrounds may appear as functional layers, never as the dominant atmosphere.

## 3. Typography

**Display Font:** Cormorant Garamond, with Georgia fallback.
**Body Font:** Inter, Segoe UI, ui-sans-serif, system-ui, and native fallbacks.
**Label/Mono Font:** Inter and native fallbacks.

**Character:** The pairing combines premium editorial presence with product efficiency. Cormorant belongs to identity, hero, catalog headings, and storefront moments. Inter owns admin, forms, buttons, tables, filters, checkout, and every transactional flow.

### Hierarchy
- **Display** (700, large, line-height 1): for brand, hero, and high-impact titles. Use only a few times per screen.
- **Headline** (700, medium to large, line-height 1): for storefront sections, product detail, cart, and checkout.
- **Title** (800, compact, line-height 1.2): for cards, panels, metrics, filters, and admin blocks.
- **Body** (400, 1.65 line-height): for product descriptions, explanatory copy, and support content. Prose should stay around 65-75 characters per line when possible.
- **Label** (800, compact): for navigation, badges, fields, tables, and actions. Uppercase and wide tracking must be rare.

### Named Rules

**The Display Discipline Rule.** Never use Cormorant for labels, inputs, buttons, tables, or controls. Product luxury comes from correct hierarchy, not applying the display font everywhere.

**The No Shouting Rule.** Hero titles may be large, but they must not overpower the product or break on mobile. Type feels premium when it breathes, not when it fills the screen.

## 4. Elevation

The system uses soft elevation to separate layers, with warm, broad shadows. Shadows should signal an interactive surface, product card, or important panel. They must not be paired with heavy borders as free decoration. At rest, the interface should feel flat and precise. On hover, elevation may increase slightly to acknowledge interaction.

### Shadow Vocabulary
- **Soft Surface** (`0 18px 48px rgba(17, 16, 13, 0.08)`): product cards, filters, panels, and checkout summaries.
- **Lifted Surface** (`0 28px 70px rgba(17, 16, 13, 0.12)`): product-card hover, product media, and panels that need stronger presence.

### Named Rules

**The Gallery Shadow Rule.** Shadows should feel like gallery lighting, not floating boxes. If the shadow is more noticeable than the product, it is wrong.

**The Border Or Shadow Rule.** Borders and shadows may coexist only when the border is subtle and the shadow communicates layer. Avoid ghost cards with strong borders plus decorative blur.

## 5. Components

Components are the bridge between admin and storefront: trustworthy product controls with enough premium finish for a luxury catalog.

### Buttons
- **Shape:** restrained constant corners (8px). Pills belong only to specific promotional or filter patterns.
- **Primary:** Signature Black on white, minimum height 44px, weight 700. Use for buy, save, continue, and recovery actions.
- **Hover / Focus:** hover lifts by 1px; focus uses a translucent champagne outline with clear offset. Focus must always be visible.
- **Secondary / Ghost / Danger:** secondary buttons use white fill and pale border; ghost buttons are black text without fill; danger buttons use red only for destructive actions.

### Chips
- **Style:** badges are compact pills with thin borders and strong text.
- **State:** success, warning, and danger change text and border color. Do not use saturated fills for neutral states.

### Cards / Containers
- **Corner Style:** restrained corners (8px), consistent with panels and fields.
- **Background:** white for primary surfaces; Elevated Ivory only for imagery, elevated zones, and product contrast.
- **Shadow Strategy:** Soft Surface at rest, Lifted Surface for hover or featured media.
- **Border:** Pale Champagne Line for structure; no colored side stripes.
- **Internal Padding:** 16px-24px for compact cards; 32px+ only for storefront sections.

### Inputs / Fields
- **Style:** white fields, pale border, 44px minimum height, and strong labels.
- **Focus:** 3px translucent champagne outline with 3px offset.
- **Error / Disabled:** errors appear in red close to the field; disabled state reduces opacity without making text unreadable.

### Navigation

Admin navigation should keep the black sidebar, clear links, and discreet active states. Storefront navigation should use a white header, subtle bottom border, Cormorant wordmark, and champagne only for the mark or active item. Mobile menus must preserve 44px touch targets and keep the cart action visible.

### Empty States

Empty states must teach the next action, not merely announce absence. Use pale dashed borders, generous space, and a primary action when recovery is clear.

### Loading

Skeletons use soft champagne shimmer. Spinners appear only inside buttons to confirm a specific action is in progress.

## 6. Do's and Don'ts

### Do:
- **Do** keep the storefront predominantly white, with black and champagne as brand and decision accents.
- **Do** bring admin visual discipline into the storefront: consistent components, controlled spacing, clear buttons, and predictable states.
- **Do** use Cormorant for editorial storefront moments and Inter for all task flows.
- **Do** let products breathe. Catalog cards should feel curated, not handmade.
- **Do** recalibrate `brand-primary` and `champagne-accent` when the final logo is added.

### Don't:
- **Don't** let the page feel artisanal, handmade, rustic, or market-stall-like. The brand must feel exclusive.
- **Don't** use champagne gold as a broad background, decorative gradient, or texture. It is a rare signature.
- **Don't** turn white into a dominant cream. Ivory is a functional layer, not the brand atmosphere.
- **Don't** use thick side borders as accents on cards, alerts, or panels.
- **Don't** split button vocabulary between admin and storefront. The same action must feel like the same family.
- **Don't** apply large shadows to every card by default. Elevation needs a job.
