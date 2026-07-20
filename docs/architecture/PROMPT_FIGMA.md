# ROLE

Act as a senior brand designer, art director, product designer, design-system
architect, accessibility specialist, and design-to-code lead.

You are creating the complete visual identity and digital product design system
for Bespoke, a Brazilian premium wellness and weight-management e-commerce brand.

This is not a generic website-generation task.

The final result must feel intentionally art-directed, emotionally warm,
premium, trustworthy, accessible, and distinctly connected to Bespoke.

The visual work must not look like:
- an AI-generated template;
- a generic supplement marketplace;
- a beauty salon;
- a cosmetics store;
- a medical clinic;
- a fitness challenge landing page;
- a luxury brand that relies only on black and gold.

Do not edit production code during this task.
Work inside Figma through the connected Figma MCP server.

---

# FIGMA MCP EXECUTION MODE

The Figma MCP server is already connected and authenticated.

Use the connected Figma MCP server as the primary execution environment for
this task.

Do not ask the user to provide:
- a Figma brand-input link;
- a destination-file link;
- a repository path;
- node IDs;
- frame IDs;
- local project paths.

Discover and use the current Figma context directly through the tools exposed
by the connected MCP server.

Before creating anything:

1. Confirm that the Figma MCP server is active.
2. Call `whoami` to verify the authenticated account.
3. Inspect all Figma tools, resources, plugin-backed capabilities, and native
   design capabilities currently exposed through the MCP connection.
4. Use only tools that are actually available in the current session.
5. Do not claim that a plugin or tool was used unless it was successfully
   invoked.
6. Do not stop merely because a previously expected tool has a different name.
   Inspect the available tool list and select the closest appropriate
   capability.
7. Prefer native Figma operations, variables, styles, components, Auto Layout,
   libraries, and design-system tools exposed by the MCP.

Use the currently active Figma file, page, frame, or selection as the initial
working context when one is available.

If there is an active selection:
- inspect it;
- preserve any usable Bespoke brand assets;
- treat the current logo as a temporary brand reference;
- create the new visual system around it;
- do not permanently alter the logo artwork.

If there is an active Figma file but no useful selection:
- inspect the file structure;
- identify an appropriate page or create new pages;
- build the Bespoke identity system inside that file.

If there is no usable active file:
- use the available Figma MCP creation tools to create a new design file named:

  “Bespoke — Brand Identity and Digital Experience”

If creating a new file is not supported:
- use the current editable Figma document;
- create a clearly isolated section or page for the Bespoke project;
- do not overwrite unrelated work.

Do not request a repository path.

Do not edit application source code during this phase.

The purpose of this task is to create the complete visual direction in Figma
so the user can visually inspect, refine, replace, or manually adjust any
element afterward.

---

# EXECUTION REQUIREMENT

This is an execution task, not merely an advisory task.

Do not respond only with:
- a design proposal;
- a written style guide;
- CSS variables;
- a list of recommendations;
- instructions for the user to reproduce manually;
- a description of what could be created.

When the connected Figma MCP exposes write or creation tools, invoke them and
create the editable design directly in Figma.

A textual explanation is supplemental and must not replace actual Figma work.

---

# MCP TOOL AND PLUGIN USAGE

Use all relevant design capabilities exposed through the connected Figma MCP.

This may include tools for:
- file and page creation;
- frame and section creation;
- visual editing;
- design-context inspection;
- screenshots;
- metadata;
- variables;
- styles;
- components;
- component properties;
- variants;
- Auto Layout;
- responsive frames;
- grids;
- libraries;
- icons;
- accessibility;
- design-system search;
- token creation;
- typography;
- effects;
- prototyping;
- annotations;
- developer handoff.

When equivalent MCP capabilities are available, use them directly instead of
only describing manual steps.

Use plugin-backed capabilities exposed by the Figma MCP when available,
including capabilities equivalent to:
- design-token management;
- accessibility and contrast checking;
- design linting;
- icon-library access;
- motion or prototype support.

However:
- do not assume that a third-party plugin is available solely because it exists
  in the Figma Community;
- inspect the MCP tool list first;
- invoke the exposed capability when available;
- if it is not available, create the required structure using native Figma
  tools;
- document any remaining manual verification at the end;
- never falsely state that a plugin was executed.

The lack of a specific third-party plugin must not prevent progress when native
Figma capabilities can achieve the required result.

---

# AUTONOMOUS FIGMA WORKFLOW

Work autonomously inside Figma.

The user wants to evaluate the result visually after creation and will make
manual refinements later.

Therefore:
- do not pause for minor visual decisions;
- do not ask for links or paths;
- do not ask the user to manually create frames before starting;
- make reasonable art-direction decisions based on the Bespoke brief;
- document important assumptions inside the Figma file;
- preserve editability;
- use clearly named variables, styles, components, frames, and layers;
- avoid flattening editable elements unnecessarily;
- avoid destructive changes to existing work;
- keep experimental concepts separate from the selected direction.

You may create:
- moodboards;
- art-direction boards;
- design tokens;
- styles;
- responsive layouts;
- storefront screens;
- admin screens;
- component libraries;
- prototypes;
- accessibility annotations;
- handoff documentation.

The user will review all visual work afterward.

Do not wait for approval between every phase.

You may develop all three initial visual directions and then select one
recommended direction for the complete system.

Keep the two non-selected directions in a separate archive or exploration page
so the user can compare and restore them manually.

---

# BRAND ASSET HANDLING

Treat any Bespoke logo, image, typography sample, or brand element found in the
active Figma context as a temporary reference asset.

The current logo may be used to understand:
- the Bespoke name;
- its premium positioning;
- the gold and dark visual heritage;
- its curved visual language;
- the transformation theme.

Do not treat the current logo as the final visual solution.

Do not permanently redesign, vectorize, overwrite, or replace the logo unless
a separate editable exploration is created.

The owner will update the logo manually.

You may:
- analyze its visual language;
- define clear-space and minimum-size recommendations;
- define appropriate use on light and dark backgrounds;
- create placeholder logo components;
- prepare the design system for a future logo replacement.

You may not:
- trace the current logo as the final mark;
- publish a generated logo revision as approved;
- silently alter the original logo artwork;
- make the interface dependent on the current logo proportions.

Create a replaceable placeholder logo component so the owner can change the
logo without rebuilding layouts.

Create at least these logo-placement components:
- `Brand/Logo/Primary`
- `Brand/Logo/Horizontal`
- `Brand/Logo/Monogram`
- `Brand/Logo/OnLight`
- `Brand/Logo/OnDark`

These may initially use placeholders or the current supplied artwork, but all
screens must reference the components rather than embedding independent copies.

Do not use invented claims, certifications, testimonials, health outcomes,
medical promises, or guaranteed weight-loss statements.

Use Brazilian Portuguese for all customer-facing interface copy.

Do not use Lorem Ipsum.

---

# CREATION AUTHORITY

You are authorized to make the visual and structural decisions required to
complete the Figma design.

You may choose:
- the recommended art-direction route;
- typography pairing;
- token structure;
- spacing scale;
- responsive grid;
- component architecture;
- visual hierarchy;
- image proportions;
- decorative motifs;
- screen composition;
- card layouts;
- dashboard layouts;
- interaction states;
- prototype connections.

All decisions must remain aligned with:
- exclusivity;
- warmth;
- personal support;
- refined wellness;
- accessibility;
- trust;
- realistic implementation;
- responsive behavior;
- restrained luxury.

When two valid options exist, prefer the option that is:
1. more accessible;
2. more maintainable;
3. less visually generic;
4. more emotionally welcoming;
5. easier for the user to edit manually.

---

# NO GENERIC AI-LIKE OUTPUT

The completed design must not feel like a generic automated website template.

Avoid:
- identical three-card sections repeated throughout the page;
- excessive centered content;
- random decorative gradients;
- glassmorphism without purpose;
- excessive pill-shaped elements;
- meaningless floating shapes;
- generic sparkle icons;
- repeated black-and-gold luxury clichés;
- artificial urgency;
- fake scarcity;
- fake social proof;
- placeholder statistics presented as real;
- overly symmetrical compositions;
- generic wellness stock-photo layouts;
- repeated section structures;
- excessive rounded cards;
- decorative elements without brand meaning.

Create a human-directed visual rhythm through:
- intentional asymmetry;
- varied but coherent section compositions;
- editorial spacing;
- optical alignment;
- thoughtful typography;
- realistic content density;
- calm transitions;
- meaningful imagery;
- consistent Bespoke motifs;
- carefully controlled gold accents;
- warm ivory and sage surfaces;
- real component states;
- visual pauses and quieter sections.

The final design should feel like it was created by an experienced boutique
branding and digital-product team.

---

# EXECUTION CONTINUITY

Continue through the entire Figma identity and interface workflow without
requesting links, paths, or approval after every phase.

Complete:

1. MCP capability inspection
2. Active-file inspection
3. Brand analysis
4. Three art-direction explorations
5. Recommended direction selection
6. Design-token creation
7. Foundation creation
8. Component-library creation
9. Desktop storefront
10. Mobile storefront
11. Cart and checkout
12. WhatsApp assisted-purchase experience
13. Customer account
14. Admin portal
15. Reporting dashboard
16. Responsive prototypes
17. Accessibility review
18. Design lint review
19. Handoff documentation
20. Final visual inspection

Do not edit source code.

Do not generate React components during this task.

Do not create production implementation files.

The result of this task must be an editable and visually reviewable Figma
design system and interface proposal.

---

# BRAND STRATEGY

Bespoke does not merely sell products.

The brand must communicate that customers receive:
- careful product selection;
- individual attention;
- respectful support;
- continuity throughout their wellness journey;
- a premium and reassuring experience;
- help choosing products without pressure or judgment.

Core brand attributes:
- exclusive;
- welcoming;
- refined;
- personal;
- calm;
- trustworthy;
- supportive;
- elegant;
- inclusive;
- discreet;
- wellness-oriented.

Emotional promise:

“Your journey is personal. Bespoke provides attentive, refined, and
trustworthy support throughout each step.”

The experience must make the customer feel:
- welcomed rather than judged;
- guided rather than pressured;
- valued rather than processed;
- confident rather than anxious;
- exclusive without feeling excluded.

---

# VISUAL POSITIONING

Use the creative territory:

“Luxury Wellness Journey”

Combine:
- editorial sophistication;
- warm hospitality;
- organic wellness cues;
- discreet premium details;
- clear digital usability.

Use the current logo’s curves only as subtle inspiration for:
- flowing separators;
- journey-line motifs;
- framing devices;
- soft directional movement;
- curved image masks;
- small supportive graphic elements.

Do not repeatedly reproduce the logo silhouette as decoration.

The site must not depend on metallic gold effects to appear premium.

Luxury should come mainly from:
- proportion;
- whitespace;
- typography;
- photography;
- restraint;
- alignment;
- material quality;
- thoughtful copy;
- carefully designed transitions.

---

# BASE COLOR DIRECTION

Use this palette as the initial direction, but verify accessibility before
finalizing interactive or textual combinations.

Primitive colors:

- Warm Obsidian: `#171612`
- Warm Ivory: `#F7F2E8`
- Warm White: `#FFFDF8`
- Champagne Gold: `#C3A35F`
- Deep Sage: `#536357`
- Soft Sage: `#A7B09B`
- Natural Sand: `#D8CDBD`
- Warm Clay: `#B77D69`
- Charcoal: `#504D46`

Color-use intent:

- Warm Ivory and Warm White:
  primary page and surface colors;
- Warm Obsidian:
  primary text and selected premium sections;
- Deep Sage:
  primary interactive and wellness color;
- Champagne Gold:
  restrained brand accent only;
- Soft Sage and Sand:
  support surfaces and subtle backgrounds;
- Warm Clay:
  limited human and emotional emphasis;
- Charcoal:
  secondary text.

Approximate visual distribution:

- 55–65% Warm Ivory and Warm White;
- 15–20% Warm Obsidian;
- 10–15% Sage family;
- 5–10% Sand;
- no more than approximately 5% Champagne Gold.

Do not use gold:
- for long text;
- for small low-contrast text;
- as the primary color of every button;
- on every border;
- as a substitute for hierarchy.

Create accessible alternatives when a proposed combination fails contrast.

---

# TYPOGRAPHY DIRECTION

Start by evaluating:

Editorial headings:
- Source Serif 4;
- Newsreader;
- Lora.

Interface and body:
- Manrope;
- Inter;
- DM Sans.

Preferred initial pairing:
- Source Serif 4 for editorial headings;
- Manrope for body text, controls, data, and navigation.

Do not use extremely thin text weights for functional interface content.

Create a complete type scale for:
- display;
- heading 1;
- heading 2;
- heading 3;
- heading 4;
- body large;
- body;
- body small;
- label;
- caption;
- overline;
- price;
- dashboard metric.

Use fluid or breakpoint-aware typography where appropriate.

---

# PHOTOGRAPHY DIRECTION

Define a photography art direction before designing screens.

Photography must feel:
- natural;
- premium;
- calm;
- warm;
- believable;
- inclusive;
- editorial rather than commercial-stock-heavy.

Show:
- real daily rituals;
- calm wellness environments;
- hands, materials, products, packaging, and personal moments;
- diverse adults;
- natural body types;
- warm natural light;
- tactile materials such as linen, stone, paper, wood, and glass;
- product details with carefully controlled compositions.

Avoid:
- before-and-after comparisons;
- measuring tape around a waist;
- scales as the main visual metaphor;
- exaggerated fitness poses;
- cropped bodies used as anonymous decoration;
- sad “before” imagery;
- stereotypical clinical coats;
- generic smiling call-center photos;
- artificial 3D renders without purpose;
- obviously synthetic human imagery.

Create photography placeholders with written art-direction notes.
Do not present generated placeholder imagery as final photography.

---

# HUMAN-CRAFTED DESIGN REQUIREMENTS

The design must avoid common automated-layout patterns.

Do not:
- center every section;
- use the same card grid for every content block;
- use identical spacing throughout the entire page;
- place every heading above three equal cards;
- overuse pill-shaped elements;
- overuse glassmorphism;
- use random gradients;
- use decorative sparkles everywhere;
- use generic floating spheres;
- use excessive blur;
- use oversized text without supporting hierarchy;
- use five different icon styles;
- use generic marketing copy;
- make every section visually symmetrical;
- create ornamental elements without meaning;
- make all corners equally rounded;
- fill empty space merely because it exists.

Instead:
- create an intentional editorial rhythm;
- vary compositions with a clear reason;
- use controlled asymmetry;
- use optical alignment;
- combine dense and quiet moments;
- create meaningful transitions between sections;
- use a consistent baseline and spacing system;
- create one recognizable Bespoke graphic motif;
- preserve imperfections that make photography and composition feel human;
- use real interface states and realistic content lengths;
- create purposeful visual hierarchy;
- manually review optical spacing after applying token-based spacing.

The result should feel designed by a small, experienced premium brand team,
not assembled from a template.

---

# FIGMA FILE ORGANIZATION

Create these pages:

00 — Cover
01 — Brand Foundations
02 — Art Direction
03 — Design Tokens
04 — Foundations and Styles
05 — Components
06 — Storefront — Desktop
07 — Storefront — Mobile
08 — Cart, Checkout and WhatsApp
09 — Customer Account
10 — Admin Portal
11 — Prototype and User Flows
12 — Accessibility Review
13 — Handoff and Documentation
99 — Archive

Use clear layer names in English.

Use sections and frames to keep each page understandable.

Use Auto Layout wherever it accurately represents responsive behavior.

Avoid unnecessary absolute positioning.

---

# REQUIRED EXECUTION WORKFLOW

## PHASE 1 — INSPECTION

1. Inspect the currently active Figma file, page, frame, or selection.
2. If the active context is empty or unrelated, create an isolated Bespoke page,
   section, or file using the available MCP creation capability.
3. Call `get_metadata` or the closest available equivalent when the active
   context is large.
4. Call `get_screenshot` or the closest available visual-inspection tool.
5. Call `get_variable_defs` or the closest available variable-inspection tool.
6. Call `get_design_context` only for the relevant nodes when that tool is
   available.
7. Use library and design-system search capabilities to identify reusable
   variables, styles, components, icon resources, and plugin-backed resources
   already exposed through the MCP.
8. Identify:
   - existing bound variables;
   - existing local styles;
   - unbound colors;
   - unbound typography;
   - reusable components;
   - visual inconsistencies;
   - missing brand assets;
   - available native and plugin-backed creation capabilities.

Do not invent existing tokens.
Label raw values as unbound values.
Do not stop merely because one named tool is unavailable when an equivalent
MCP capability exists.

Create the inspection summary inside the Figma file and continue to the next
phase.

## PHASE 2 — THREE ART-DIRECTION ROUTES

Create three distinct direction boards:

### Route A — Quiet Prestige
Focus:
- ivory surfaces;
- warm obsidian typography;
- restrained gold;
- editorial composition;
- refined product photography.

### Route B — Botanical Atelier
Focus:
- deeper sage;
- warm natural materials;
- supportive organic shapes;
- intimate and reassuring photography.

### Route C — Modern Bespoke
Focus:
- more structured grids;
- architectural whitespace;
- stronger dark sections;
- minimal, precise premium details.

Each route must contain:
- concise strategic rationale;
- color application examples;
- typography pairing;
- image direction;
- materials and textures;
- icon direction;
- graphic motif;
- example button;
- example product card;
- example hero fragment;
- examples of what must be avoided.

Do not merge the routes yet.

After creating the three boards:
- summarize the differences inside the Figma file;
- select one recommended route;
- explain the selection in a short decision note;
- preserve the other two routes in the exploration or archive page;
- continue building the complete identity using the recommended route;
- do not wait for approval before proceeding.

The user will visually review and manually adjust the result afterward.

## PHASE 3 — DESIGN TOKENS

After selecting the recommended route, create native Figma Variables first.

Create collections:

1. `Primitives`
2. `Semantic`
3. `Component`
4. `Responsive`

Primitive token groups:

- `color`
- `spacing`
- `size`
- `radius`
- `border`
- `shadow`
- `opacity`
- `duration`
- `easing`
- `font-family`
- `font-size`
- `font-weight`
- `line-height`
- `letter-spacing`

Semantic token groups:

- `background/page`
- `background/surface`
- `background/subtle`
- `background/inverse`
- `text/primary`
- `text/secondary`
- `text/inverse`
- `text/muted`
- `border/default`
- `border/strong`
- `brand/primary`
- `brand/accent`
- `action/primary/background`
- `action/primary/text`
- `action/primary/hover`
- `action/secondary/background`
- `action/secondary/text`
- `focus/ring`
- `feedback/success`
- `feedback/warning`
- `feedback/error`
- `feedback/info`

Create descriptions for semantic tokens explaining:
- intended use;
- prohibited use;
- accessibility limitations;
- whether the token can be used for text.

Avoid hardcoded values after equivalent tokens exist.

Prepare the token structure so it can be mirrored in Tokens Studio.

Do not claim to have run Tokens Studio unless that plugin was actually run by
the user or exposed as an available tool.

## PHASE 4 — FOUNDATIONS

Create and document:

- color system;
- typography scale;
- spacing scale;
- responsive grid;
- border-radius system;
- elevation and shadow system;
- icon rules;
- photography rules;
- illustration and decorative motif rules;
- interaction and motion principles;
- content-tone rules;
- accessibility principles.

Recommended responsive frames:

- Mobile small: 360px
- Mobile standard: 390px
- Tablet: 768px
- Desktop: 1280px
- Desktop wide: 1440px

Use a responsive grid rather than scaling desktop layouts down.

## PHASE 5 — COMPONENT LIBRARY

Create components and variants for:

- Primary Button
- Secondary Button
- Tertiary Button
- Icon Button
- WhatsApp Assisted-Purchase Button
- Input
- Search Input
- Textarea
- Select
- Checkbox
- Radio Group
- Quantity Selector
- Price Display
- Badge
- Product Card
- Product Gallery
- Category Card
- Testimonial Card
- Journey Step
- Support Callout
- Header
- Mobile Navigation
- Breadcrumb
- Filter Drawer
- Cart Item
- Order Summary
- Checkout Step
- Payment Status
- Toast
- Dialog
- Drawer
- Skeleton
- Empty State
- Error State
- Footer

Admin components:

- Admin Sidebar
- Admin Header
- Metric Card
- Date-Range Filter
- Data Table
- Table Toolbar
- Status Badge
- Product Editor
- Media Uploader
- Chart Container
- Report Export Dialog
- Confirmation Dialog
- Audit-Log Entry

Required variants:

- default;
- hover;
- pressed;
- focus-visible;
- disabled;
- loading;
- error;
- success;
- selected, where applicable.

Use component properties and variants consistently.

## PHASE 6 — KEY STOREFRONT SCREENS

Design complete responsive screens for:

1. Home page
2. Catalog
3. Search results
4. Product details
5. Cart
6. Checkout
7. WhatsApp assisted-purchase confirmation
8. Mercado Pago return states
9. Customer login
10. Customer account
11. Order history
12. Order details
13. Empty and error states

Home-page narrative:

1. Premium and welcoming hero
2. Selected products for the customer’s journey
3. How Bespoke supports the customer
4. Care, personalization, and continuity pillars
5. Product categories
6. Featured products
7. Educational wellness content
8. Real and approved testimonials placeholder
9. WhatsApp personal-support section
10. Trust and transparency section
11. Footer

Suggested initial hero copy:

Headline:
“Uma jornada única merece um cuidado à altura.”

Supporting text:
“Produtos cuidadosamente selecionados e atendimento próximo para acompanhar
cada etapa do seu bem-estar.”

Primary action:
“Conhecer a Bespoke”

Secondary action:
“Falar com nossa equipe”

Review the copy for warmth, clarity, and credibility.
Do not use forced urgency.

## PHASE 7 — WHATSAPP EXPERIENCE

Create an assisted-purchase module that feels like concierge support.

Use language such as:

“Precisa de ajuda para escolher?”

“Converse com nossa equipe e receba um atendimento cuidadoso para sua jornada.”

The WhatsApp option must:
- appear as supportive assistance;
- not replace the normal online checkout;
- explain what happens after clicking;
- not imply that a sale is completed before confirmation;
- show an accessible external-navigation indication;
- work on mobile and desktop;
- have a clear focus state;
- avoid aggressive floating-button behavior.

Design:
- cart placement;
- checkout placement;
- product-page placement;
- confirmation dialog;
- request-success state.

## PHASE 8 — ADMIN PORTAL

The admin portal must share the Bespoke identity while being more functional,
calm, and information-dense.

Design:

- dashboard overview;
- revenue;
- confirmed sales;
- average order value;
- customers;
- returning customers;
- top-selling products;
- low stock;
- Mercado Pago sales;
- WhatsApp-assisted sales;
- refunds;
- date-range comparison;
- product management;
- image management;
- inventory management;
- order management;
- customer management;
- reports;
- administrator permissions;
- audit log.

Do not count WhatsApp clicks or conversations as revenue.

Clearly distinguish:
- contact requests;
- converted orders;
- paid orders;
- refunded orders.

Charts must remain understandable without relying only on color.

## PHASE 9 — PROTOTYPE

Create a realistic clickable prototype for:

### Customer flow
Home
→ Catalog
→ Product
→ Cart
→ Mercado Pago or WhatsApp
→ Confirmation
→ Order status

### Admin flow
Login
→ Dashboard
→ Products
→ Edit product
→ Upload image
→ Update price
→ Review change
→ Publish
→ Audit-log confirmation

Include:
- keyboard-relevant states;
- loading states;
- failure states;
- empty states;
- success states.

## PHASE 10 — ACCESSIBILITY AND QUALITY REVIEW

Target WCAG 2.2 Level AA.

Review:

- text contrast;
- non-text contrast;
- focus visibility;
- touch-target sizes;
- heading hierarchy;
- form labels;
- input errors;
- alternative-text requirements;
- dialog focus order;
- reduced motion;
- table accessibility;
- chart alternatives;
- mobile zoom;
- readable text sizes.

If a Stark-equivalent accessibility capability is exposed through the Figma
MCP, invoke it and record the actual findings.

If it is unavailable, prepare a manual Stark checklist.

Do not claim Stark or an equivalent tool was run unless it was actually
invoked.

If a Design-Lint-equivalent capability is exposed through the Figma MCP,
invoke it and correct verified issues without erasing intentional art-direction
decisions.

Otherwise, prepare a manual Design Lint checklist covering:

- unbound colors;
- unbound typography;
- detached components;
- inconsistent spacing;
- inconsistent radius;
- unnamed layers;
- hardcoded values that should be tokens.

Do not claim Design Lint or an equivalent capability was run unless it was
actually invoked.

## PHASE 11 — PLUGIN AND MCP CAPABILITY WORKFLOW

Create a frame named:

“Plugin and MCP Workflow”

Inspect the plugin-backed and native capabilities exposed through the connected
Figma MCP.

Use available equivalent capabilities directly and document which operations
were actually executed.

Document this workflow:

1. Design-token management
   - use native Figma Variables and Styles as the source of truth;
   - use a Tokens-Studio-equivalent capability when exposed;
   - validate hierarchy and naming;
   - optionally prepare token JSON synchronization notes;
   - do not create duplicate sources of truth.

2. Accessibility
   - use a Stark-equivalent capability when exposed;
   - review contrast;
   - review focus order;
   - review touch targets;
   - review typography;
   - review visual accessibility;
   - otherwise create a manual verification checklist.

3. Design linting
   - use a Design-Lint-equivalent capability when exposed;
   - scan foundations;
   - scan components;
   - scan final screens;
   - correct verified inconsistencies;
   - preserve documented intentional exceptions.

4. Icons
   - use an icon-library capability exposed through the MCP when available;
   - use one approved icon family only;
   - recommended direction: Phosphor Regular or Lucide;
   - convert repeatedly used icons into local components;
   - document icon size and stroke rules.

5. Motion and prototyping
   - use native Figma prototype and motion capabilities;
   - use a Lottie-equivalent capability only when exposed and appropriate;
   - create no more than one branded loading motion and one subtle order-success
     motion;
   - respect reduced-motion preferences;
   - do not use generic stock animations.

For every tool or plugin-backed capability, record:
- whether it was available;
- whether it was invoked;
- what it changed or verified;
- what still requires manual review.

Never claim a tool was executed when it was not.

## PHASE 12 — HANDOFF

Create a final handoff page containing:

- recommended brand direction;
- final palette;
- token inventory;
- typography;
- responsive grid;
- component inventory;
- component state matrix;
- icon rules;
- photography brief;
- content-tone guide;
- accessibility checklist;
- plugin checklist;
- known limitations;
- missing final assets;
- future logo-replacement instructions;
- developer implementation notes.

Call `get_variable_defs` on the completed design-system frames and verify that
the intended variables are actually bound.

Call `get_screenshot` on the final key screens for visual review.

List:
- exact variables created;
- components created;
- screens created;
- unresolved items;
- manual plugin actions still required.

---

# QUALITY GATES

Before marking any phase as complete, verify:

- No generic AI-looking visual patterns were introduced.
- No existing brand asset was silently altered.
- No fake claim or testimonial was created.
- No token was invented and described as pre-existing.
- No secret or environment value was accessed.
- No inaccessible gold-on-light text was used.
- No interface depends only on black and gold.
- No beauty-salon visual cliché dominates the design.
- No literal weight-loss body imagery was introduced.
- Mobile and desktop were designed independently but consistently.
- Components use variables rather than duplicated raw values.
- Copy feels human, specific, and calm.
- The design remains implementable in React.
- Every important component includes its interaction states.
- The admin portal enforces clarity over decoration.
- The WhatsApp experience feels supportive rather than promotional.

---

# FIRST ACTIONS

Begin immediately.

1. Verify the active Figma MCP connection.
2. Call `whoami`.
3. Inspect the available MCP tools, resources, plugin-backed capabilities, and
   native Figma capabilities.
4. Inspect the currently active Figma file, page, frame, or selection.
5. Create a new Bespoke file, page, or isolated section when necessary.
6. Build the initial brand-analysis and art-direction pages.
7. Continue through the complete visual-identity workflow.
8. Do not ask for Figma links, frame IDs, repository paths, or project paths.
9. Do not edit application code.
10. Do not stop after returning a written plan when the MCP provides tools
    capable of creating the design.
11. Use the connected Figma MCP to produce editable visual work.
12. Report only genuine tool limitations that prevent an operation.
13. If a named third-party plugin is unavailable, use an exposed equivalent or
    native Figma capability and continue.
14. Keep all created work visually reviewable and manually editable.
