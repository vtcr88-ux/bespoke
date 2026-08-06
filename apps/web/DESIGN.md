---
name: Bespoke Web Storefront
description: Black/champagne boutique catalog direction for the Bespoke customer-facing web app.
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
  champagne-strong: "#7f5d28"
  champagne-deep: "#6b4f22"
  champagne-soft: "#efe4cf"
  border: "#ddd7ca"
typography:
  display:
    fontFamily: "Bodoni 72, Didot, Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(3.4rem, 8vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.2rem, 6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: "Inter, Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Inter, Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 900
    letterSpacing: "0.16em"
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
  site-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-primary}"
    height: "72px"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  filter-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "24px"
  checkout-summary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "24px"
  store-button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "0 16px"
  site-footer:
    backgroundColor: "#6b4f22"
    textColor: "#fff4dc"
    minHeight: "136px"
---

# Design System: Bespoke Web Storefront

## 1. Overview

**Creative North Star: "White Boutique, Black Signature"**

The web app is a customer-facing catalog, not an admin dashboard and not a generic landing page. It should borrow the admin's visual discipline: structured surfaces, crisp controls, clear states, and a serious black-white-champagne system. It should not borrow the admin's operational density or dashboard feeling. The storefront needs to remain a catalog first: browse, inspect, add to cart, ask through WhatsApp, and checkout.

The current direction should move away from an artisanal mood. The user should feel exclusivity even before the final logo lands in the project. White remains dominant, black creates authority, and champagne gold appears only as a signature: the real logo when it exists, active navigation, focus, selected state, and premium detail. Product imagery and spacing should do most of the emotional work.

**Key Characteristics:**

- Catalog-first, not admin-first: browsing and product inspection stay central.
- Admin-inspired discipline: consistent buttons, panels, filters, empty states, and checkout controls.
- Predominantly white viewport with black and champagne accents from the future logo palette.
- No placeholder logo marks. If no real logo is configured, show the wordmark only.
- Luxury through restraint, space, precise edges, and strong hierarchy rather than craft texture.
- Mobile-friendly catalog behavior: readable product cards, easy cart access, and filters that do not dominate.
- Applied filters should be visible as removable chips with a clear-all action, while the collapsed filter control stays visually quiet.
- Checkout should feel concierge-like: contact, delivery, payment, order review, and reassurance are sequenced before the user leaves for payment.
- Footer as a compact dark-champagne closing signature: aligned wordmark, refined slogan, and useful links.

## 2. Colors

The storefront should read as white, black, and champagne from the first viewport.

### Primary

- **Signature Black**: primary actions, brand wordmark, headline color, cart decisions, checkout decisions, and high-contrast overlays when imagery requires legibility.
- **Champagne Gold**: brand mark, active navigation underline, focus ring, premium detail, selected state, and restrained card hover border.
- **Strong Champagne**: small catalog labels and section metadata that must stay visibly champagne on white.
- **Deep Champagne**: compact footer band and rare brand-signature surfaces where black would feel too heavy.

### Secondary

- **Soft Black**: secondary brand text, dark overlays on hero imagery, and cases where the full black would feel too blunt.
- **Soft Champagne**: skeletons, subtle image surfaces, and quiet background layers behind products.

### Neutral

- **Gallery White**: page background, header, footer, product-card body, form surfaces, and checkout surfaces.
- **Elevated Ivory**: product image wells and elevated zones. It must not become the whole page mood.
- **Pale Champagne Line**: borders, dividers, filter outlines, product cards, cart lines, and checkout summary boundaries.
- **Ink Text**: primary text and prices.
- **Warm Graphite Text**: secondary copy, metadata, and descriptive body text.

### Named Rules

**The Catalog Luxury Rule.** The product is the hero. Use white space, restrained borders, and precise image wells before adding decoration.

**The Logo Palette Rule.** When the final logo is added, tune `--color-brand-primary` and `--color-brand-accent` to match it; do not add new brand colors unless the logo demands them.

## 3. Typography

**Display Font:** Bodoni 72 / Didot first, then Cormorant Garamond and Georgia fallback.
**Body Font:** Inter, Segoe UI, ui-sans-serif, system-ui, and native fallbacks.
**Label/Mono Font:** Inter and native fallbacks.

**Character:** Display typography gives the catalog its premium editorial layer. Inter keeps the buying flow trustworthy and efficient. The split is intentional: the display stack for storefront atmosphere, Inter for decisions.

### Hierarchy

- **Display** (500, `clamp(2.8rem, 6vw, 4.8rem)`, line-height 1): hero title and rare brand-led moments only.
- **Headline** (500, `clamp(2rem, 4.5vw, 3.4rem)`, line-height 1.05): catalog title, product detail title, cart title, checkout title, and section headings.
- **Title** (800, around 1rem-1.25rem): product card names, filter titles, summary titles, and compact panels.
- **Body** (400, 1.65-1.8 line-height): product subtitles, descriptions, support copy, shipping notes, and empty-state guidance.
- **Label** (800-900, compact): navigation, badges, filters, buttons, form labels, prices, and operational hints.

### Named Rules

**The Catalog Is Not A Poster Rule.** Keep hero type premium but controlled. The old `8rem` ceiling is too loud for this luxury catalog. The first product row should feel close, not buried below a campaign poster.

**The Admin Borrowing Rule.** Borrow admin clarity, not admin typography density. Storefront headings can feel editorial; controls must stay product-like.

## 4. Elevation

The storefront uses borders and spacing before shadows. Product cards, filters, and checkout panels should feel precise and trustworthy at rest; shadow is reserved for small utility emphasis, product display lighting, and slight hover confirmation. Hover states can lift slightly, but the baseline should remain calm and expensive.

### Shadow Vocabulary

- **Sticky Header Confirmation** (`0 6px 8px rgba(17, 16, 13, 0.05)`): appears only after scroll to separate navigation from content.
- **Card Hover Confirmation** (`0 6px 12px rgba(17, 16, 13, 0.06)`): product-card hover only, paired with champagne border feedback.
- **Product Detail Media** (`0 28px 70px rgba(17, 16, 13, 0.12)`): larger product media where the image needs staged depth.
- **Product Image Shadow** (`0 8px 12px rgba(17, 16, 13, 0.06)`): restrained product image depth inside the image well.

### Named Rules

**The Product Light Rule.** Elevation should make the product feel staged. If it makes the UI chrome feel busy, reduce it.

## 5. Components

The storefront components should feel like a luxury catalog powered by a disciplined product system.

### Buttons

- **Shape:** use the design-system 8px button radius for primary and secondary actions. Avoid pill buttons as the default storefront style; they feel less aligned with the admin discipline.
- **Primary:** Signature Black on white for "Add to cart", checkout, retry, and main recovery actions.
- **Hover / Focus:** 1px lift on hover; champagne focus outline for accessibility.
- **Secondary / Ghost:** secondary actions keep a white surface and pale border; ghost actions are for low-emphasis navigation such as "View all".

### Chips

- **Style:** category and stock badges remain compact pills, but should not become decorative tags.
- **State:** low-stock warnings use semantic warning color; normal category labels stay neutral.

### Cards / Containers

- **Product Cards:** white bodies, pale champagne borders, 8px corners, quieter hover lift, editorial product names, a small curation marker, and price/action hierarchy. Cards should feel curated and inspectable, not handmade.
- **Responsive Card Actions:** product-card price and add action must never collide with the border. On narrow cards, stack the action below the price and let the button span the available width.
- **Image Wells:** Elevated Ivory is acceptable behind product images, but the product image must stay the visual focus.
- **Filter Panel:** borrow admin panel discipline: white surface, pale border, 24px padding, compact controls, active filter chips, a clear-all action, and no ornamental framing.
- **Collapsed Filters:** the rail or mobile filter button may show an active count, but it should remain secondary to the catalog.
- **Checkout Summary:** structured, sticky on desktop, white, bordered, item-aware, and clear. It should feel like a concierge decision panel.

### Inputs / Fields

- **Style:** use shared design-system fields. Labels are strong, inputs are white, borders are pale, and focus is champagne.
- **Search / Filters:** filters must feel useful, not like a heavy sidebar. Active chips and clear-all actions should make the current search state obvious without forcing the panel open.
- **Error / Disabled:** errors sit next to the failed field or action and preserve the user's work.

### Navigation

The header is a white luxury retail header with admin-level precision: sticky, 72px desktop height, subtle bottom border, wordmark isolated at left, and the main nav grouped at right beside the visible cart. Do not render a fake logo mark. Champagne appears only when a real logo exists, or in the active nav underline. Mobile keeps the cart visible and opens an accessible navigation region with focus management and Escape support.

### Footer

The footer should close the page as a compact dark-champagne brand band, not a loose set of links floating after the catalog and not a tall block that steals space from the home. Align the wordmark, slogan, and navigation lower in the band on desktop; stack them cleanly on mobile. The slogan may carry the brand promise of reserved curation, care, exclusivity, and choices made for a small audience.

### Product Detail

Product detail pages should feel more premium than product cards: larger image well, stronger white space, clear category badge, editorial title, description, price, and one dominant cart action. Avoid turning detail pages into marketing landing pages.

### Reusable Home Sections

Home structure lives in generic, prop-driven sections instead of reading Bespoke content directly. `HeroSection` owns static responsive media, overlay and alignment; `EditorialStatement` renders two semantic lines supplied by the shared storefront contract and applies their scroll choreography; `EditorialNavigation` accepts labels and destinations; `FeaturedCollectionHeading` coordinates collection hierarchy. API mutations notify the page container to invalidate React Query data, so a future white-label theme can replace content without rebuilding these sections.

### Cart / Checkout

Cart and checkout should inherit admin reliability: compact line items, clear totals, obvious primary action, WhatsApp as a secondary path, and strong recovery states. Checkout should sequence contact, delivery, and payment, then reinforce trust with a reserved order review and concise reassurance copy. Keep surfaces white and restrained so the purchase flow feels trustworthy.

## Motion

Motion for React is the only JavaScript animation system. Import it from `motion/react`; do not add `framer-motion` imports or a competing animation library.

- The hero is the signature moment. Standard uploaded covers remain static; campaign art explicitly marked with `motion=product-drop` may use one first-load product landing with restrained spring physics, independent shadows, and no scroll-linked displacement. Its background, product layers, and shadow layers remain mounted as one persistent composition, so reaching rest never swaps or crossfades to a second image.
- Page transitions, list reveals, cards, drawers, and exits use the shared presets exported by the design system.
- Product-grid entrance stagger is reserved for the four Home highlights. Catalog lists use layout animation without replaying a large entrance sequence.
- Header, buttons, links, cart count, filters, and quantity controls use brief feedback between 120ms and 280ms.
- `MotionConfig reducedMotion="user"` is mandatory. Scroll-linked movement is disabled and CSS transitions collapse to an instant state when the user requests reduced motion.
- Do not animate financial values, layout-driving dimensions, or every section on scroll.
- Shared TypeScript and CSS tokens use the same duration tiers: 120ms instant feedback, 180ms fast feedback, 280ms state changes, 420ms deliberate transitions, 520ms reveals, and 620ms signature entrances.
- Vertical reveals use a shared 24px distance. The 32px editorial distance and masked line choreography stay local to `EditorialStatement`, where that behavior has a specific semantic purpose.
- Hero scroll displacement runs only on desktop with no reduced-motion preference; mobile, landscape-constrained layouts, and reduced-motion users receive a static composition.

## 6. Do's and Don'ts

### Do:

- **Do** keep the page clearly a catalog: product grid, product detail, cart, checkout, and support flows remain primary.
- **Do** pull visual discipline from admin: structured panels, consistent controls, crisp borders, and predictable states.
- **Do** use white as the dominant luxury signal.
- **Do** reserve champagne for logo, active navigation, focus, selected state, and premium hover details.
- **Do** darken champagne labels when they sit on white so small metadata remains readable.
- **Do** remove placeholder iconography when the real logo is not available.
- **Do** use responsive card footers so add-to-cart actions stay inside the card border at every viewport.
- **Do** make active filters visible and removable, including a clear-all action.
- **Do** present checkout as a guided review flow before payment.
- **Do** keep the footer aligned and grounded as the final brand signature of the page.
- **Do** tune the final logo colors into the shared design-system tokens rather than scattering one-off values in `storefront.css`.

### Don't:

- **Don't** turn the storefront into an admin dashboard. Borrow discipline, not operational density.
- **Don't** let the catalog feel artisanal, rustic, handmade, or like a craft marketplace.
- **Don't** use champagne as a large filled section, texture, or decorative gradient.
- **Don't** make the hero so large that it hides the catalog's purpose.
- **Don't** render transparent or empty hero badges above the brand name.
- **Don't** use many card styles. Product cards, filter panels, summary panels, and empty states should feel like one family.
- **Don't** hide active filters inside the panel only on mobile.
- **Don't** send users to payment without a clear order review and reassurance.
- **Don't** create new button vocabulary in `apps/web` when the shared design-system buttons already define the action language.
