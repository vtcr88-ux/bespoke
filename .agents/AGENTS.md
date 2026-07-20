Biblioteca
/
AGENTS_BESPOKE_EN.md


# AGENTS.md — BESPOKE PROJECT GLOBAL AI RULES

> **Purpose:** This file defines the mandatory global operating rules for any local AI agent working on the Bespoke project.
>
> **Scope:** These instructions apply to the entire repository unless a more specific `AGENTS.md` file adds stricter rules for a subdirectory.
>
> **Priority:** Security, payment integrity, order integrity, data protection, accessibility, and maintainability take precedence over implementation speed.
>
> **Enforcement:** Treat every rule written with **MUST**, **MUST NOT**, **NEVER**, **ALWAYS**, or **REQUIRED** as non-negotiable.

---

## 0. Operating Principles

The AI agent must:

1. Read and understand the relevant project files before making changes.
2. Make the smallest safe change that fully solves the requested task.
3. Preserve existing behavior unless a change is explicitly required.
4. Never expose secrets, credentials, private data, or internal infrastructure details.
5. Never claim that a command, test, build, migration, or validation was executed unless it was actually executed.
6. Report real limitations, failed checks, risks, and unresolved issues clearly.
7. Prefer secure, explicit, typed, testable, accessible, and maintainable implementations.
8. Refuse to silently weaken security controls, validation, authorization, payment verification, or data integrity.

---

## 1. Mission

You are working on the **Bespoke e-commerce platform**, a premium brand associated with wellness, care, exclusivity, and refined customer experiences.

Your responsibility is to produce code that is:

- secure;
- simple;
- typed;
- testable;
- accessible;
- responsive;
- modular;
- easy to maintain;
- consistent with the approved Figma design;
- prepared for both mobile and desktop environments.

Security, order integrity, payment integrity, and data protection take priority over implementation speed.

---

## 2. Approved Technology Stack

Use the following technologies by default:

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- Zustand for local client state only;
- Zod;
- Node.js;
- Express;
- MySQL 8;
- an ORM or query builder that supports parameterized queries;
- Pino;
- Mercado Pago Checkout Pro;
- Vitest;
- Playwright;
- ESLint;
- Prettier.

Do not introduce a new library when the current stack already solves the problem.

Do not use two libraries for the same responsibility without a documented technical justification.

---

## 3. Mandatory Procedure Before and After Code Changes

### 3.1 Before Editing

Before modifying code:

1. Read the files directly involved in the task.
2. Identify related dependencies, imports, routes, schemas, services, and tests.
3. Review the conventions already used in the project.
4. Determine the smallest change capable of solving the task.
5. Preserve compatibility with existing features.
6. Do not modify files outside the task scope without a proven technical need.
7. Identify whether the change affects authentication, authorization, payments, orders, stock, personal data, uploads, or administrative functions.
8. Identify any required migrations, environment variables, tests, or documentation updates.

### 3.2 After Editing

After modifying code:

1. Run linting.
2. Run the TypeScript type check.
3. Run the relevant tests.
4. Run the build when the change is structural or affects compilation.
5. Review the final diff.
6. Confirm that no secret or credential was added.
7. Update relevant documentation.
8. Report all commands executed and their actual results.
9. Report any checks that could not be executed.

Do not declare a task complete while required tests are failing.

Do not invent successful test, lint, type-check, build, migration, or deployment results.

---

## 4. Mandatory Security Rules

### 4.1 Never

Never:

- build SQL statements by concatenating external data;
- use data from `req.body`, `req.query`, or `req.params` directly in a database query;
- trust prices, discounts, totals, taxes, shipping values, stock values, permissions, or status values sent by the front end;
- expose unnecessary internal data;
- return stack traces in production;
- log passwords, cookies, tokens, credentials, authorization headers, or secrets;
- store passwords in plain text;
- use `eval`;
- execute commands built from user-controlled input;
- accept arbitrary properties in update operations;
- allow access by resource ID without checking ownership or permission;
- allow unrestricted CORS origins in production;
- treat generic sanitization as protection against SQL injection;
- disable security controls merely to make a test pass;
- weaken authentication, authorization, CSRF protection, rate limiting, webhook verification, validation, or logging controls without an approved security reason;
- trust client-controlled identifiers such as `userId`, `ownerId`, `role`, `isAdmin`, order status, payment status, or stock values.

### 4.2 Always

Always:

- validate inputs with strict schemas;
- reject unknown properties;
- use parameterized queries;
- explicitly map the fields sent to the database;
- apply resource-level authorization;
- use transactions for orders, stock, and payment operations;
- apply request and file-size limits;
- use timeouts;
- handle errors centrally;
- use request IDs;
- deny access by default;
- write tests for both authorized and unauthorized access;
- apply least privilege;
- mask or remove sensitive data from logs;
- verify ownership and permissions on every protected resource operation.

Use **OWASP ASVS 5.0 Level 2** as the minimum reference for features involving authentication, payments, personal data, administration, or uploads.

---

## 5. Environment Variables and Secrets

The real `.env` file is confidential.

### 5.1 Prohibited Actions

You are not permitted to:

- display the contents of `.env`;
- copy the contents of `.env`;
- include real secret values in source code;
- include real secret values in documentation;
- move secrets to the front end;
- add secrets to variables prefixed with `VITE_`;
- log secrets;
- include secrets in error messages;
- commit `.env` files;
- expose secrets in screenshots, generated examples, test fixtures, prompts, comments, or terminal output;
- replace missing secrets with insecure defaults.

Use `.env.example` only to identify the expected variable names and safe placeholder formats.

### 5.2 Back-End Validation

The back end must validate environment variables during application startup.

The application must fail fast when a required environment variable is missing, malformed, or invalid.

Treat every front-end variable prefixed with `VITE_` as public.

### 5.3 Back-End-Only Secrets

The following values are permitted only on the back end:

- `DATABASE_URL`;
- `SESSION_SECRET`;
- `MERCADO_PAGO_ACCESS_TOKEN`;
- `MERCADO_PAGO_WEBHOOK_SECRET`;
- email service credentials;
- storage credentials;
- external service tokens.

### 5.4 Approved Public Front-End Variables

The following public values may be used on the front end:

- `VITE_API_BASE_URL`;
- `VITE_MERCADO_PAGO_PUBLIC_KEY`;
- previously approved public analytics identifiers.

Never create insecure default values for secrets.

The real `.env` file must remain ignored by version control.

---

## 6. Mercado Pago Integration

Use **Mercado Pago Checkout Pro** initially.

### 6.1 Required Checkout Flow

The required payment flow is:

1. The front end sends only product IDs, variant IDs when applicable, and quantities.
2. The back end validates the submitted data.
3. The back end retrieves products, prices, discounts, and availability from MySQL.
4. The back end recalculates the subtotal, discounts, shipping, taxes when applicable, and total.
5. The back end verifies stock availability.
6. The back end creates the order with the `pending_payment` status.
7. The back end creates the Mercado Pago payment preference.
8. The back end links the payment operation to the order through a unique internal reference.
9. The front end receives only the public data required to start Checkout Pro.
10. Payment confirmation occurs exclusively on the back end.

### 6.2 Access Token Rules

The `MERCADO_PAGO_ACCESS_TOKEN`:

- exists only on the back end;
- is never returned by an endpoint;
- is never included in the front-end bundle;
- is never logged;
- is never included in committed test files;
- is never embedded in client-side code, documentation, fixtures, screenshots, or generated examples.

The Mercado Pago Public Key may be used on the front end when required by the SDK.

### 6.3 Payment Status Rules

The payment return URL is informational only.

Never change an order to `paid` based on:

- URL parameters;
- browser-submitted data;
- a success page;
- a status stored on the front end;
- a redirect result alone;
- an unverified webhook payload.

### 6.4 Webhooks

Every webhook handler must:

1. validate the webhook signature;
2. validate all required headers;
3. register the external event ID;
4. reject or safely ignore duplicate events;
5. retrieve the official payment data from Mercado Pago;
6. compare the order reference;
7. compare the currency;
8. compare the expected amount;
9. validate the payment status and operation type;
10. update the order inside a database transaction;
11. store the result without sensitive data;
12. respond without performing unnecessary slow tasks synchronously.

Never process a webhook without validating its authenticity.

Never trust only the received request body.

Never mark an order as paid when the amount, currency, payer context, or order reference does not match the expected server-side data.

### 6.5 Idempotency

Use a unique, persistent idempotency key for financial operations that support or require idempotency.

The same retried operation must reuse the same key.

A genuinely new operation must receive a new key.

Never automatically generate a new key when retrying the same operation, because doing so may allow duplicate charges or duplicate financial actions.

Store enough information to distinguish a retry from a new operation.

---

## 7. Orders

The front end is not authoritative for:

- price;
- discount;
- shipping;
- tax;
- total;
- stock;
- order status;
- payment status;
- permissions.

The server must recalculate and validate all authoritative values.

### 7.1 Order Item Snapshot

Each order item must store an immutable snapshot containing:

- product ID;
- product name;
- SKU;
- unit price;
- quantity;
- applied discount;
- subtotal;
- main image reference when required for historical display.

Future product changes must not alter historical orders.

### 7.2 Order State Machine

Use an explicit order state machine.

Do not allow arbitrary state transitions.

Validate every transition on the server.

Record every order status change in an audit history containing, when applicable:

- previous status;
- new status;
- timestamp;
- actor;
- reason;
- request ID;
- related payment or administrative reference.

---

## 8. Inventory

Inventory must never become negative.

Inventory operations must be atomic.

### 8.1 Order Creation and Confirmation

When creating or confirming an order:

- use a transaction;
- use a conditional update;
- verify the number of affected rows;
- roll back the entire operation if any step fails;
- prevent race conditions;
- preserve a movement history.

Do not:

1. read the stock;
2. close the operation;
3. update the stock later without concurrency protection.

### 8.2 Reservations

When stock reservations exist:

- store an expiration timestamp;
- release expired reservations;
- make the release job idempotent;
- record every inventory movement;
- prevent the same reservation from being released more than once;
- use a safe reconciliation mechanism for failed or interrupted operations.

---

## 9. Authentication

For this project, prefer an opaque server-side session sent through a secure cookie.

Introduce JWT access and refresh tokens only when there is a concrete, documented architectural need.

### 9.1 Authentication Cookies

Authentication cookies must use:

- `HttpOnly`;
- `Secure` in production;
- an appropriate `SameSite` policy;
- restricted domain and path values;
- controlled expiration;
- safe rotation and invalidation behavior.

Implement CSRF protection when authentication depends on cookies.

### 9.2 Passwords

Passwords must use an adaptive password hashing algorithm.

Never encrypt or store passwords in plain text.

Never log passwords or password-derived material.

### 9.3 Account Recovery Tokens

Password recovery tokens:

- must be cryptographically random;
- must expire;
- must be single-use;
- must be stored as a hash;
- must be invalidated after use;
- must not reveal sensitive account information.

Do not reveal whether an email address is registered during password recovery.

Use consistent public responses to reduce account enumeration risk.

---

## 10. Authorization

Authentication does not replace authorization.

Every private route must define:

- who may access it;
- which resource may be accessed;
- which action may be performed;
- which ownership, role, or state conditions must be satisfied.

A customer may access only:

- their own profile;
- their own addresses;
- their own cart;
- their own orders;
- their own account-related resources.

Administrative routes must use dedicated authorization middleware.

Never trust `role`, `isAdmin`, `userId`, `ownerId`, permissions, or status values submitted by the client.

These values must be obtained from the validated session and trusted database records.

Authorization must be checked at the resource level, not only at the route-group level.

---

## 11. Validation

Every endpoint must define schemas for:

- route parameters;
- query parameters;
- request body;
- response payload when applicable.

Use strict schemas.

Reject unknown fields unless there is a documented reason to allow them.

Do not pass `req.body` directly to the ORM or query layer.

### 11.1 Prohibited Example

```ts
await database.product.create({
  data: req.body,
});
```

### 11.2 Expected Example

```ts
const productData = {
  name: input.name,
  description: input.description,
  priceInCents: input.priceInCents,
  categoryId: input.categoryId,
};

await productRepository.create(productData);
```

Money must be represented as integer minor units, such as cents, or by an appropriate exact decimal type.

Do not use floating-point numbers for financial calculations.

Validate identifiers, string lengths, numeric ranges, pagination limits, enums, dates, URLs, and uploaded file metadata.

---

## 12. Database

Use versioned migrations.

Do not manually modify the production schema.

Do not edit migrations that have already been applied.

To correct an applied migration, create a new migration.

Use:

- foreign keys;
- indexes;
- constraints;
- required fields;
- uniqueness constraints;
- transactions;
- a database user with minimum required privileges.

The application must not connect to the database as `root`.

Do not grant administrative permissions to the runtime database user.

Stored procedures do not replace parameterized queries.

Destructive migrations require a safe rollout plan, backup considerations, compatibility analysis, and a rollback or recovery plan.

---

## 13. API Design and Error Handling

API responses must use a consistent format.

Do not expose:

- stack traces;
- SQL queries;
- internal paths;
- unnecessary software versions;
- secrets;
- database details;
- internal infrastructure identifiers.

Use appropriate HTTP status codes.

Expected errors must have stable internal error codes.

### 13.1 Example Error Response

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found.",
    "requestId": "..."
  }
}
```

Do not return different public messages that facilitate account enumeration.

Centralize unexpected error handling.

Return a request ID when appropriate so incidents can be traced without exposing internal details.

---

## 14. Rate Limiting

Do not rely on only one global rate limit.

Create separate policies for:

- login;
- account registration;
- password recovery;
- verification-code submission;
- checkout creation;
- coupon application;
- webhooks;
- administrative routes;
- catalog access.

Combine limits by IP address, account, session, user, endpoint, or operation according to the risk.

Do not permanently block an account merely because it received malicious attempts from external sources.

Rate-limit responses must not leak sensitive account state.

Use stricter controls for authentication, recovery, checkout, coupon, and administrative operations.

---

## 15. Front-End Requirements

The layout must be mobile-first.

All components must work at:

- `320px`;
- `375px`;
- `768px`;
- `1024px`;
- `1280px` and above.

Avoid fixed values that break on smaller screens.

Do not create accidental horizontal scrolling.

### 15.1 Required Interface States

Implement:

- loading state;
- skeleton state when appropriate;
- error state;
- empty-list state;
- no-results state;
- disabled state;
- success feedback;
- in-progress action feedback.

Buttons must prevent duplicate submissions while requests are in progress.

Do not use color alone to communicate states.

Do not remove visible focus outlines without providing an accessible replacement.

Do not expose secret values, internal errors, raw stack traces, or server implementation details in the UI.

---

## 16. Bespoke Brand Identity

The interface must communicate:

- exclusivity;
- sophistication;
- care;
- trust;
- lightness;
- personalization.

### 16.1 Preferred Direction

Prefer:

- clean composition;
- generous spacing;
- elegant typography;
- refined imagery;
- subtle details;
- restrained animations;
- clear hierarchy.

### 16.2 Avoid

Avoid:

- generic marketplace aesthetics;
- excessive colors;
- excessive use of gold;
- neon visuals associated with miracle formulas;
- flashing banners;
- fake countdown timers;
- artificial urgency;
- fabricated testimonials;
- nonexistent security seals;
- unsupported result claims;
- misleading before-and-after imagery.

Do not invent commercial information, medical claims, product benefits, certifications, testimonials, prices, discounts, stock scarcity, or guarantees.

---

## 17. Figma MCP

Use Figma as the approved visual source.

Before implementing a screen:

1. identify the correct frame;
2. inspect its components;
3. extract reusable design tokens;
4. identify all interface states;
5. identify mobile behavior;
6. identify desktop behavior;
7. verify accessibility;
8. reuse existing components whenever appropriate.

Do not repeatedly copy isolated values.

Convert colors, spacing, border radii, shadows, and typography into reusable tokens.

When the design conflicts with accessibility, preserve the visual identity while correcting the accessibility issue.

Do not invent an entirely new layout when an approved design exists.

Do not treat screenshots as a substitute for reusable components and design tokens.

---

## 18. Infinite Scrolling

Use cursor-based pagination.

Do not fetch all products at once.

The endpoint must enforce a maximum page size.

The front end must:

- use `IntersectionObserver`;
- prevent duplicate requests;
- cancel obsolete requests;
- preserve loaded pages in cache;
- keep filters in the URL;
- display loading progress;
- preserve scroll position;
- handle retry and error states;
- avoid requesting the same cursor repeatedly.

Also provide an accessible **Load more** button.

Do not automatically move keyboard focus after loading additional items.

Do not make the footer unreachable.

When all items have been loaded, clearly inform the user.

Infinite scrolling must remain usable with keyboard navigation and assistive technology.

---

## 19. Accessibility

Minimum target: **WCAG 2.2 Level AA**.

Every feature must work with:

- mouse;
- keyboard;
- touch;
- browser zoom;
- screen readers when applicable.

Use native HTML elements before ARIA.

Every form field must have an accessible label.

Every informative image must have appropriate alternative text.

Decorative images must use empty alternative text.

### 19.1 Dialog Requirements

Dialogs must:

- move focus into the dialog when opened;
- trap focus while open;
- close with `Escape` when appropriate;
- return focus to the triggering element when closed;
- expose an accessible name;
- prevent interaction with inaccessible background content when required.

Respect `prefers-reduced-motion`.

Do not autoplay audio.

Do not rely exclusively on hover interactions.

Maintain sufficient color contrast and visible keyboard focus.

---

## 20. Uploads

Accept only formats defined in an allowlist.

Do not trust the MIME type provided by the browser.

Verify the real file signature.

Define:

- maximum file size;
- maximum dimensions;
- maximum file count;
- a server-generated filename;
- a safe storage destination;
- an allowed extension and content-type policy.

Re-encode images before publishing them.

Do not execute uploaded files.

Do not store uploads inside executable code directories.

Do not accept user-provided SVG files without a dedicated sanitization process.

Prevent path traversal, filename collisions, executable uploads, oversized payloads, and decompression-bomb scenarios.

---

## 21. Logging

Use structured logs.

Include, when applicable:

- timestamp;
- log level;
- `requestId`;
- route;
- HTTP method;
- status code;
- duration;
- `userId`;
- `orderId`;
- partially masked external `paymentId`.

Redact or remove:

- authorization headers;
- cookies;
- passwords;
- tokens;
- access tokens;
- webhook secrets;
- card data;
- full identity documents;
- unnecessary personal data;
- full payment credentials;
- session identifiers.

Administrative logs must record who performed the action.

Logs must not become an alternative storage location for sensitive data.

Use stable event names and appropriate log levels.

---

## 22. Filesystem MCP

The Filesystem MCP may operate only inside the project root.

Before deleting or renaming a file:

1. search for references by filename;
2. search for imports;
3. search for routes;
4. search for tests;
5. inspect scripts;
6. inspect documentation;
7. confirm that version control is available;
8. make the lowest-impact change;
9. run linting, type checking, and relevant tests.

Use `git mv` when renaming versioned files.

### 22.1 Prohibited Filesystem and Git Operations

Do not use:

- `rm -rf`;
- broad destructive commands;
- absolute paths outside the project;
- forced history rewrites;
- `git reset --hard`;
- `git clean -fd`;
- `git push --force`.

Do not delete unknown files merely because they appear unused.

Do not remove applied migrations.

Do not modify the real `.env` file.

Do not access SSH keys, personal directories, operating-system secrets, browser profiles, or configuration outside the project.

Do not perform broad search-and-replace operations without reviewing their scope.

---

## 23. Dependencies

Before installing a dependency:

1. verify whether the required functionality already exists;
2. justify the dependency;
3. choose an actively maintained package;
4. use a compatible version;
5. review permissions, install scripts, and transitive risks;
6. update the lockfile;
7. run the relevant security audit;
8. run tests.

Do not execute unknown scripts copied from the internet.

Do not update every dependency during an unrelated task.

Do not remove lockfiles.

Do not bypass integrity checks merely to install a package.

Prefer packages with clear maintenance history, compatible licensing, documented security practices, and minimal unnecessary dependencies.

---

## 24. Required Tests

Sensitive features must test:

- valid flow;
- invalid input;
- unauthenticated user;
- unauthorized user;
- access to another user's resource;
- duplicate requests;
- external service failure;
- timeout;
- concurrency;
- rollback;
- unexpected data.

### 24.1 Payment Tests

Payment functionality must test:

- valid order;
- price modified on the front end;
- insufficient stock;
- valid webhook;
- invalid webhook;
- duplicate webhook;
- payment with a different amount;
- payment with a different currency;
- payment with a different reference;
- repeated refund;
- repeated payment operation;
- failure while updating the order;
- transaction rollback;
- retry using the same idempotency key.

Tests must not use real production credentials.

Test fixtures must not contain real personal or financial data.

---

## 25. Destructive Changes

Treat the following as destructive:

- dropping tables;
- dropping columns;
- changing data types with possible data loss;
- deleting migrations;
- removing authentication;
- changing the payment system;
- changing inventory rules;
- deleting large groups of files;
- replacing a core library;
- modifying production infrastructure.

Do not execute destructive changes silently.

For destructive changes, provide:

- a safe migration;
- impact analysis;
- a rollback or recovery plan;
- compatibility considerations;
- required documentation;
- explicit disclosure of the risk.

Do not assume that a backup exists.

Do not remove data merely to make a migration or test pass.

---

## 26. Definition of Done

A task is complete only when it:

- satisfies the requirement;
- preserves the intended architecture;
- does not expose secrets;
- includes appropriate validation;
- includes appropriate authorization;
- handles errors;
- includes tests proportional to the risk;
- passes linting;
- passes type checking;
- passes the relevant tests;
- passes the build;
- works on mobile;
- works on desktop;
- works with keyboard navigation;
- includes loading, empty, and error states when applicable;
- updates documentation when necessary;
- does not introduce unresolved high-risk security issues.

### 26.1 Required Final Report

When finishing a task, report:

1. a concise summary of the change;
2. the files modified;
3. security decisions;
4. tests and checks actually executed;
5. actual results;
6. real risks, limitations, or pending issues.

Never invent results for tests or commands that were not executed.

Never hide a failed check.

Never state that the task is fully complete when mandatory checks remain unresolved.

## Bespoke Figma identity workflow

- Never generate final Bespoke screens before an art-direction route is approved.
- Always inspect the exact Figma brand-input frame before creating variables.
- Explicitly call `get_variable_defs` when retrieving tokens.
- Use `get_metadata` before `get_design_context` for large pages or frames.
- Use `get_screenshot` to validate visual fidelity.
- Use `search_design_system` before creating a component that may already exist.
- Do not redesign or overwrite the Bespoke logo.
- Do not create fake testimonials, certifications, results, or health claims.
- Do not present placeholder or generated photography as final brand photography.
- Avoid generic AI-generated layout patterns.
- Use native Figma Variables and Auto Layout.
- Do not hardcode values after equivalent variables exist.
- Do not claim that a third-party Figma plugin was run unless it was actually run.
- Stop for approval after creating the three art-direction boards.
- Do not edit production code during the visual-identity phase.