# MIND MAP — BESPOKE E-COMMERCE

```text
BESPOKE — PREMIUM E-COMMERCE PLATFORM
│
├── 0. PROJECT PURPOSE
│   ├── Build an elegant, secure, accessible, and responsive e-commerce platform
│   ├── Represent exclusivity, luxury, care, personalization, and trust
│   ├── Support mobile, tablet, desktop, and keyboard navigation
│   ├── Offer a premium public storefront and a protected administration portal
│   ├── Allow product, image, price, inventory, order, customer, and content management
│   ├── Process online payments through Mercado Pago Checkout Pro
│   ├── Offer WhatsApp as an optional assisted-purchase channel
│   ├── Provide reliable sales, revenue, product, inventory, and customer reports
│   ├── Keep secrets and sensitive business logic exclusively on the back end
│   └── Use a simple modular architecture that can grow without a future rewrite
│
├── 1. PRIMARY STACK
│   ├── Public Storefront
│   │   ├── React
│   │   ├── TypeScript
│   │   ├── Vite
│   │   ├── React Router
│   │   ├── TanStack Query for server state
│   │   ├── Zustand for cart and limited local state
│   │   ├── Zod for validation
│   │   └── CSS Variables or Tailwind using Figma design tokens
│   │
│   ├── Admin Portal
│   │   ├── React
│   │   ├── TypeScript
│   │   ├── Vite
│   │   ├── TanStack Query
│   │   ├── Accessible tables, filters, forms, dialogs, and charts
│   │   └── Shared design-system package with the storefront
│   │
│   ├── Back End
│   │   ├── Node.js
│   │   ├── Express
│   │   ├── TypeScript
│   │   ├── Zod request and environment schemas
│   │   ├── ORM or query builder using parameterized queries
│   │   ├── Pino structured logging
│   │   ├── Mercado Pago official SDK
│   │   └── Background jobs only where needed
│   │
│   ├── Database
│   │   ├── MySQL 8
│   │   ├── Versioned migrations
│   │   ├── Foreign keys
│   │   ├── Constraints
│   │   ├── Appropriate indexes
│   │   ├── Transactions for orders, inventory, and payments
│   │   └── Automated encrypted backups
│   │
│   └── Infrastructure
│       ├── Docker for local development
│       ├── HTTPS required in production
│       ├── Reverse proxy
│       ├── Private database network
│       ├── Object storage for product media
│       ├── Secret manager or secure hosting environment variables
│       └── Monitoring, error tracking, and health checks
│
├── 2. BESPOKE BRAND IDENTITY
│   ├── Positioning
│   │   ├── Premium
│   │   ├── Exclusive
│   │   ├── Elegant
│   │   ├── Personalized
│   │   ├── Trustworthy
│   │   └── Focused on premium wellness and weight management
│   │
│   ├── Visual Direction
│   │   ├── Use the logo as the foundation of the design system
│   │   ├── Extract colors, shapes, typography, and spacing through Figma MCP
│   │   ├── Use generous negative space
│   │   ├── Use refined typography and subtle visual details
│   │   ├── Use soft shadows and discreet borders
│   │   ├── Use short and elegant animations
│   │   ├── Maintain strong contrast and readability
│   │   └── Avoid a generic marketplace appearance
│   │
│   ├── Product Photography
│   │   ├── High-quality images
│   │   ├── Consistent lighting and background
│   │   ├── Standardized aspect ratios
│   │   ├── Responsive image sizes
│   │   ├── WebP or AVIF delivery
│   │   └── Meaningful alternative text managed in the admin portal
│   │
│   └── Communication Restrictions
│       ├── Do not promise guaranteed weight loss
│       ├── Do not create miracle or medical claims
│       ├── Do not invent therapeutic benefits
│       ├── Do not publish unverified testimonials
│       ├── Do not use deceptive before-and-after images
│       └── Require legal or regulatory review for sensitive product claims
│
├── 3. DESIGN SYSTEM
│   ├── Color Tokens
│   │   ├── background
│   │   ├── surface
│   │   ├── surface-elevated
│   │   ├── text-primary
│   │   ├── text-secondary
│   │   ├── brand-primary
│   │   ├── brand-accent
│   │   ├── border
│   │   ├── success
│   │   ├── warning
│   │   └── danger
│   │
│   ├── Spacing Tokens
│   │   ├── 4px
│   │   ├── 8px
│   │   ├── 12px
│   │   ├── 16px
│   │   ├── 24px
│   │   ├── 32px
│   │   ├── 48px
│   │   └── 64px
│   │
│   ├── Shared Components
│   │   ├── Button
│   │   ├── IconButton
│   │   ├── Input
│   │   ├── Textarea
│   │   ├── Select
│   │   ├── Checkbox
│   │   ├── RadioGroup
│   │   ├── DateRangePicker
│   │   ├── Dialog
│   │   ├── Drawer
│   │   ├── DropdownMenu
│   │   ├── DataTable
│   │   ├── Pagination
│   │   ├── Toast
│   │   ├── Skeleton
│   │   ├── Badge
│   │   ├── ProductCard
│   │   ├── MetricCard
│   │   ├── ChartContainer
│   │   └── EmptyState
│   │
│   └── Required States
│       ├── Default
│       ├── Hover
│       ├── Focus visible
│       ├── Active
│       ├── Disabled
│       ├── Loading
│       ├── Error
│       ├── Success
│       └── Empty
│
├── 4. PUBLIC STOREFRONT
│   ├── Main Areas
│   │   ├── Responsive header
│   │   ├── Primary navigation
│   │   ├── Search
│   │   ├── Home page
│   │   ├── Catalog
│   │   ├── Categories
│   │   ├── Product details
│   │   ├── Cart
│   │   ├── Checkout
│   │   ├── WhatsApp assisted purchase
│   │   ├── Customer account
│   │   ├── Order history
│   │   ├── Privacy and support pages
│   │   └── Footer
│   │
│   ├── Mobile
│   │   ├── Mobile-first single-column layout
│   │   ├── Adequate touch targets
│   │   ├── Filters inside an accessible drawer
│   │   ├── Cart drawer or dedicated cart page
│   │   ├── Simplified navigation
│   │   ├── Sticky checkout action only when it does not hide content
│   │   ├── No accidental horizontal scrolling
│   │   └── Fast loading on slower connections
│   │
│   ├── Desktop
│   │   ├── Responsive product grid
│   │   ├── Sidebar filters when space is available
│   │   ├── Search integrated into the header
│   │   ├── Balanced maximum content width
│   │   ├── Persistent order summary during checkout when appropriate
│   │   └── Refined use of whitespace
│   │
│   └── Interface States
│       ├── Skeleton loading
│       ├── Empty list
│       ├── No search results
│       ├── Connection error
│       ├── Product unavailable
│       ├── Low stock
│       ├── Invalid cart
│       ├── Payment pending
│       ├── Payment failed
│       └── Purchase completed
│
├── 5. CATALOG AND INFINITE SCROLL
│   ├── API
│   │   ├── Cursor-based pagination
│   │   ├── Stable sorting
│   │   ├── Maximum page size
│   │   ├── Server-validated filters
│   │   ├── Search term normalization
│   │   └── Response containing nextCursor
│   │
│   ├── Front End
│   │   ├── IntersectionObserver for automatic loading
│   │   ├── Load one page at a time
│   │   ├── Prevent duplicate requests
│   │   ├── Cancel obsolete requests after filters change
│   │   ├── Preserve filters in the URL
│   │   ├── Preserve scroll position after returning from a product
│   │   ├── Display skeleton items while loading
│   │   └── Provide a visible “Load more” fallback
│   │
│   ├── Accessibility
│   │   ├── Announce newly loaded items with aria-live
│   │   ├── Do not move focus automatically
│   │   ├── Keep the footer reachable
│   │   ├── Support full keyboard navigation
│   │   └── Announce when all products have been loaded
│   │
│   └── Performance
│       ├── Native image lazy loading
│       ├── srcset and sizes
│       ├── Fixed image aspect ratio to reduce layout shifts
│       ├── Cached pages
│       ├── Debounced search
│       └── Virtualization only when genuinely necessary
│
├── 6. ACCESSIBILITY
│   ├── Target WCAG 2.2 Level AA
│   ├── Semantic HTML
│   ├── Complete keyboard navigation
│   ├── Always-visible focus state
│   ├── Skip link to main content
│   ├── Labels associated with inputs
│   ├── Error messages associated with fields
│   ├── Adequate color contrast
│   ├── Meaningful alternative text
│   ├── Dialog focus management
│   ├── Accessible tables and charts
│   ├── Reduced-motion support
│   ├── No information communicated only by color
│   └── Testing with keyboard and screen reader
│
├── 7. CUSTOMER PURCHASE JOURNEY
│   ├── Discover product
│   ├── View product details
│   ├── Select quantity or variation
│   ├── Add to cart
│   ├── Review cart
│   ├── Choose purchase channel
│   │   ├── Pay online with Mercado Pago
│   │   └── Continue through WhatsApp
│   ├── Server recalculates all prices
│   ├── Server validates stock
│   ├── Server creates a pending order or assisted-purchase request
│   ├── Customer receives a public order reference
│   └── Customer can follow order status in the account area
│
├── 8. WHATSAPP ASSISTED PURCHASE
│   ├── Placement
│   │   ├── Button on the cart page
│   │   ├── Optional button in the checkout purchase section
│   │   ├── Optional product-level contact button
│   │   └── Clear label such as “Continue on WhatsApp”
│   │
│   ├── User Experience
│   │   ├── Explain that WhatsApp is an assisted purchase channel
│   │   ├── Ask for confirmation before leaving the site
│   │   ├── Open the official WhatsApp link
│   │   ├── Use a URL-encoded prefilled message
│   │   ├── Keep keyboard focus behavior predictable
│   │   └── Never block Mercado Pago as the normal online-payment option
│   │
│   ├── Server Flow
│   │   ├── Receive only product IDs and quantities
│   │   ├── Recalculate prices and availability on the server
│   │   ├── Create an assisted-purchase request
│   │   ├── Generate a public non-sequential reference
│   │   ├── Generate the WhatsApp URL on the server
│   │   ├── Return only the safe public URL to the browser
│   │   └── Record the sales channel as whatsapp
│   │
│   ├── Prefilled Message
│   │   ├── Bespoke greeting
│   │   ├── Public request reference
│   │   ├── Product names
│   │   ├── Quantities
│   │   ├── Estimated total
│   │   ├── Statement that price and stock require final confirmation
│   │   └── No password, token, internal database ID, or sensitive personal data
│   │
│   ├── Statuses
│   │   ├── contact_requested
│   │   ├── conversation_started
│   │   ├── quote_confirmed
│   │   ├── awaiting_payment
│   │   ├── converted_to_order
│   │   ├── completed
│   │   └── cancelled
│   │
│   ├── Reporting Rules
│   │   ├── A WhatsApp click is not a completed sale
│   │   ├── A conversation is not recognized as revenue
│   │   ├── Revenue is counted only after a confirmed payment
│   │   ├── Track click-to-conversation and conversation-to-sale conversion
│   │   └── Keep Mercado Pago and WhatsApp channels separately reportable
│   │
│   └── Configuration
│       ├── Store number kept in server configuration
│       ├── `WHATSAPP_STORE_PHONE` must contain an international-format number
│       ├── Phone number is not a secret but must not be duplicated across files
│       ├── Message template managed through configuration or the admin portal
│       └── Changes to the destination number require an audited admin action
│
├── 9. ADMIN PORTAL
│   ├── Application
│   │   ├── Separate protected application under apps/admin
│   │   ├── Optional separate admin subdomain
│   │   ├── No public administrator registration
│   │   ├── Invitation-based administrator access
│   │   ├── Responsive for desktop, tablet, and mobile
│   │   └── Optimized primarily for desktop workflows
│   │
│   ├── Dashboard
│   │   ├── Gross revenue
│   │   ├── Net revenue
│   │   ├── Number of paid orders
│   │   ├── Average order value
│   │   ├── Units sold
│   │   ├── New customers
│   │   ├── Returning customers
│   │   ├── Mercado Pago sales
│   │   ├── WhatsApp-assisted sales
│   │   ├── Pending payments
│   │   ├── Refunds
│   │   ├── Low-stock alerts
│   │   ├── Top-selling products
│   │   └── Date range and period comparison
│   │
│   ├── Main Navigation
│   │   ├── Overview
│   │   ├── Products
│   │   ├── Categories
│   │   ├── Media Library
│   │   ├── Inventory
│   │   ├── Orders
│   │   ├── Customers
│   │   ├── Payments
│   │   ├── WhatsApp Requests
│   │   ├── Analytics
│   │   ├── Reports
│   │   ├── Store Content
│   │   ├── Administrators
│   │   ├── Audit Log
│   │   └── Settings
│   │
│   ├── Security
│   │   ├── Mandatory MFA
│   │   ├── Secure server-side session
│   │   ├── HttpOnly and Secure cookie
│   │   ├── CSRF protection
│   │   ├── Strong rate limits
│   │   ├── Reauthentication for critical actions
│   │   ├── Session list and remote session revocation
│   │   ├── Audit every administrative change
│   │   └── Deny access by default
│   │
│   └── Admin Roles
│       ├── Owner
│       │   └── Full access, security settings, and role management
│       ├── Administrator
│       │   └── Broad operational access without ownership transfer
│       ├── Catalog Manager
│       │   └── Products, categories, images, prices, and inventory
│       ├── Order Manager
│       │   └── Orders, fulfillment, WhatsApp requests, and refunds
│       ├── Support Agent
│       │   └── Limited customer and order support information
│       └── Analyst
│           └── Read-only analytics and reports
│
├── 10. ADMIN CATALOG AND MEDIA MANAGEMENT
│   ├── Products
│   │   ├── Create
│   │   ├── Edit
│   │   ├── Duplicate
│   │   ├── Archive
│   │   ├── Restore
│   │   ├── Activate or deactivate
│   │   ├── Set featured products
│   │   ├── Organize display order
│   │   ├── Manage slug and SEO metadata
│   │   └── Preview before publishing
│   │
│   ├── Product Information
│   │   ├── Name
│   │   ├── Subtitle
│   │   ├── Description
│   │   ├── SKU
│   │   ├── Category
│   │   ├── Price
│   │   ├── Promotional price
│   │   ├── Promotion start and end
│   │   ├── Stock
│   │   ├── Weight and dimensions
│   │   ├── Status
│   │   └── Search and filter attributes
│   │
│   ├── Images
│   │   ├── Upload multiple images
│   │   ├── Reorder with accessible controls
│   │   ├── Select the primary image
│   │   ├── Crop or reposition when supported
│   │   ├── Edit alternative text
│   │   ├── Delete only after dependency verification
│   │   ├── Preview optimized output
│   │   └── Track uploader and upload time
│   │
│   ├── Categories
│   │   ├── Create and edit
│   │   ├── Parent-child hierarchy
│   │   ├── Reorder
│   │   ├── Activate or deactivate
│   │   ├── Category image
│   │   └── SEO metadata
│   │
│   ├── Bulk Operations
│   │   ├── Require explicit selection
│   │   ├── Show affected item count
│   │   ├── Require confirmation for destructive actions
│   │   ├── Use background processing for large operations
│   │   └── Record an audit event
│   │
│   └── Publishing Rules
│       ├── Draft
│       ├── Scheduled
│       ├── Published
│       ├── Archived
│       ├── Validate all required fields
│       └── Do not publish invalid or incomplete products
│
├── 11. ADMIN ORDERS, CUSTOMERS, AND SUPPORT
│   ├── Orders
│   │   ├── Search by public reference
│   │   ├── Filter by date, status, channel, and payment
│   │   ├── View item and payment snapshots
│   │   ├── Update only permitted order transitions
│   │   ├── Add internal notes
│   │   ├── Register shipment details
│   │   ├── Issue approved refunds
│   │   └── View immutable status history
│   │
│   ├── WhatsApp Requests
│   │   ├── View request and cart snapshot
│   │   ├── Assign an operator
│   │   ├── Record conversation status
│   │   ├── Convert request into an order
│   │   ├── Register confirmed payment
│   │   ├── Prevent duplicate conversion
│   │   └── Preserve attribution to the WhatsApp channel
│   │
│   ├── Customers
│   │   ├── Search customers
│   │   ├── View order history
│   │   ├── View aggregated spend
│   │   ├── View support notes with permission
│   │   ├── Correct permitted profile information
│   │   ├── Export or delete data through an approved privacy flow
│   │   └── Never expose passwords, session tokens, or unnecessary personal data
│   │
│   └── Support
│       ├── Internal notes separate from customer-visible notes
│       ├── Permission-based access to personal data
│       ├── Audit customer-data access when appropriate
│       ├── No payment credentials displayed
│       └── No unrestricted customer-list export
│
├── 12. ANALYTICS AND REPORTING
│   ├── Revenue Metrics
│   │   ├── Gross revenue
│   │   ├── Discounts
│   │   ├── Refunds
│   │   ├── Net revenue
│   │   ├── Revenue by day, week, month, quarter, and year
│   │   ├── Revenue by sales channel
│   │   ├── Revenue by product
│   │   ├── Revenue by category
│   │   └── Revenue by payment method when available
│   │
│   ├── Sales Metrics
│   │   ├── Paid orders
│   │   ├── Cancelled orders
│   │   ├── Refunded orders
│   │   ├── Units sold
│   │   ├── Average order value
│   │   ├── Conversion by channel
│   │   ├── Best-selling products
│   │   ├── Slow-moving products
│   │   └── Orders by status
│   │
│   ├── Customer Metrics
│   │   ├── Total customers
│   │   ├── New customers
│   │   ├── Returning customers
│   │   ├── Repeat-purchase rate
│   │   ├── Average spend per customer
│   │   ├── Orders per customer
│   │   └── Customer data shown only to authorized roles
│   │
│   ├── Inventory Metrics
│   │   ├── Current stock
│   │   ├── Low-stock products
│   │   ├── Out-of-stock products
│   │   ├── Inventory movement
│   │   ├── Reserved stock
│   │   └── Estimated stock coverage
│   │
│   ├── Filters
│   │   ├── Date range
│   │   ├── Comparison period
│   │   ├── Product
│   │   ├── Category
│   │   ├── Order status
│   │   ├── Payment status
│   │   └── Sales channel
│   │
│   ├── Reports
│   │   ├── Sales summary
│   │   ├── Detailed order report
│   │   ├── Product performance
│   │   ├── Category performance
│   │   ├── Customer summary
│   │   ├── Inventory position
│   │   ├── Refunds
│   │   ├── Mercado Pago reconciliation
│   │   └── WhatsApp assisted-sales funnel
│   │
│   ├── Export
│   │   ├── CSV for operational data
│   │   ├── PDF for summarized reports
│   │   ├── Permission check before generation
│   │   ├── Mask unnecessary personal data
│   │   ├── Record who exported the report
│   │   ├── Generate large reports in a background job
│   │   └── Use short-lived signed download URLs
│   │
│   └── Metric Integrity
│       ├── Count revenue only from confirmed payments
│       ├── Display refunds separately
│       ├── Use one configured business timezone
│       ├── Use one configured currency
│       ├── Document each metric definition
│       ├── Avoid double counting repeated webhooks
│       └── Reconcile stored payment data with Mercado Pago when needed
│
├── 13. MODULAR BACK END
│   ├── auth
│   ├── users
│   ├── admin-users
│   ├── roles-and-permissions
│   ├── catalog
│   ├── categories
│   ├── media
│   ├── inventory
│   ├── cart
│   ├── orders
│   ├── payments
│   ├── webhooks
│   ├── whatsapp
│   ├── customers
│   ├── analytics
│   ├── reports
│   ├── audit
│   ├── settings
│   └── health
│
├── 14. AUTHENTICATION AND AUTHORIZATION
│   ├── Customer Authentication
│   │   ├── Server-side opaque session
│   │   ├── HttpOnly cookie
│   │   ├── Secure cookie in production
│   │   ├── Appropriate SameSite setting
│   │   ├── CSRF protection
│   │   ├── Password hashing with an adaptive algorithm
│   │   └── Single-use password-reset tokens
│   │
│   ├── Administrator Authentication
│   │   ├── No public sign-up
│   │   ├── Invitation flow
│   │   ├── Mandatory MFA
│   │   ├── Stronger rate limiting
│   │   ├── Reauthentication for critical changes
│   │   ├── Session revocation
│   │   └── Security-event logging
│   │
│   ├── Authorization
│   │   ├── Role-based permissions
│   │   ├── Resource ownership checks
│   │   ├── Action-level permission checks
│   │   ├── Explicit permission for exports and refunds
│   │   └── Deny by default
│   │
│   └── Critical Rule
│       ├── Hiding a button is not authorization
│       ├── Every admin endpoint validates permissions on the server
│       └── The admin front end never connects directly to MySQL
│
├── 15. MERCADO PAGO
│   ├── Initial Solution
│   │   └── Checkout Pro
│   │
│   ├── Front End
│   │   ├── Request checkout creation from the Bespoke API
│   │   ├── Receive only public checkout information
│   │   ├── Redirect to Mercado Pago
│   │   └── Show a return page without confirming payment locally
│   │
│   ├── Back End
│   │   ├── Load products and prices from MySQL
│   │   ├── Recalculate order totals
│   │   ├── Validate stock
│   │   ├── Create a pending-payment order
│   │   ├── Create a Mercado Pago preference
│   │   ├── Associate a unique external reference
│   │   ├── Persist payment identifiers
│   │   └── Return only safe public information
│   │
│   ├── Webhook
│   │   ├── Receive notification through HTTPS
│   │   ├── Validate the signature
│   │   ├── Validate event identifiers
│   │   ├── Ignore already-processed events
│   │   ├── Query the official payment API
│   │   ├── Compare amount, currency, and reference
│   │   ├── Update payment and order inside a transaction
│   │   └── Record the event without recording secrets
│   │
│   ├── Idempotency
│   │   ├── Generate a unique key per financial operation
│   │   ├── Persist the key
│   │   ├── Reuse the same key when retrying the same operation
│   │   └── Never reuse it for a different operation
│   │
│   └── Critical Rules
│       ├── Access Token exists only on the back end
│       ├── Public Key may be exposed when required
│       ├── Never trust the return URL
│       ├── Never trust a status sent by the browser
│       ├── Never use a price sent by the front end
│       ├── Never mark an order as paid without server confirmation
│       └── Never record credentials in logs
│
├── 16. ORDERS AND INVENTORY
│   ├── Order Statuses
│   │   ├── pending_payment
│   │   ├── paid
│   │   ├── processing
│   │   ├── shipped
│   │   ├── delivered
│   │   ├── cancelled
│   │   ├── expired
│   │   ├── refunded
│   │   └── partially_refunded
│   │
│   ├── Rules
│   │   ├── Explicitly allowed transitions
│   │   ├── Immutable status history
│   │   ├── Product and price snapshot in every order item
│   │   ├── Server-calculated total
│   │   ├── Stock can never be negative
│   │   ├── Critical operations use transactions
│   │   └── Manual admin changes require reason and audit event
│   │
│   └── Concurrency
│       ├── Conditional stock updates
│       ├── Locks only where needed
│       ├── Expiring reservations
│       ├── Idempotent reservation-release job
│       └── Duplicate-order prevention
│
├── 17. DATABASE
│   ├── users
│   ├── sessions
│   ├── user_addresses
│   ├── admin_invitations
│   ├── roles
│   ├── permissions
│   ├── user_roles
│   ├── role_permissions
│   ├── categories
│   ├── products
│   ├── product_images
│   ├── product_variants
│   ├── media_assets
│   ├── inventory_movements
│   ├── carts
│   ├── cart_items
│   ├── orders
│   ├── order_items
│   ├── order_status_history
│   ├── payments
│   ├── payment_refunds
│   ├── webhook_events
│   ├── idempotency_keys
│   ├── whatsapp_purchase_requests
│   ├── whatsapp_request_items
│   ├── report_exports
│   ├── store_settings
│   └── audit_logs
│
├── 18. API SECURITY
│   ├── Parameterized queries
│   ├── Strict Zod schemas on all endpoints
│   ├── Rejection of unknown properties
│   ├── Request body size limits
│   ├── Rate limits by route and identity
│   ├── Helmet
│   ├── CORS allowlist
│   ├── HTTPS
│   ├── CSRF protection for cookie sessions
│   ├── Protection against mass assignment
│   ├── Protection against account enumeration
│   ├── Centralized error handling
│   ├── Request IDs
│   ├── External-service timeouts
│   ├── Output filtering
│   └── No direct database access from any browser application
│
├── 19. SECRETS AND ENVIRONMENT FILES
│   ├── Real `.env`
│   │   ├── Never commit
│   │   ├── Never send to the front end
│   │   ├── Never print in logs
│   │   ├── Never copy into documentation
│   │   └── Never allow the AI to reveal its values
│   │
│   ├── `.env.example`
│   │   ├── Versioned
│   │   ├── Variable names only
│   │   └── Fake placeholder values
│   │
│   ├── Server-Only Variables
│   │   ├── DATABASE_URL
│   │   ├── SESSION_SECRET
│   │   ├── MERCADO_PAGO_ACCESS_TOKEN
│   │   ├── MERCADO_PAGO_WEBHOOK_SECRET
│   │   ├── WHATSAPP_STORE_PHONE
│   │   ├── STORAGE_SECRET
│   │   └── Email-service credentials
│   │
│   ├── Public Front-End Variables
│   │   ├── VITE_API_BASE_URL
│   │   └── VITE_MERCADO_PAGO_PUBLIC_KEY when required
│   │
│   └── Production
│       ├── Secret manager or secure hosting panel
│       ├── Separate development and production credentials
│       ├── Credential rotation
│       └── Least-privilege access
│
├── 20. SECURE IMAGE UPLOAD
│   ├── Admin permission required
│   ├── Allow only approved formats
│   ├── Verify the real file signature
│   ├── Limit file size and dimensions
│   ├── Generate the stored filename
│   ├── Strip unnecessary metadata
│   ├── Re-encode images before publishing
│   ├── Store outside executable directories
│   ├── Do not accept user-provided SVG without a dedicated sanitization process
│   ├── Use short-lived signed URLs for private media
│   └── Record upload and deletion events
│
├── 21. LOGGING AND AUDIT
│   ├── Structured logs
│   ├── Request ID
│   ├── User ID when available
│   ├── Administrator ID for admin actions
│   ├── Route, status, and duration
│   ├── Authentication events
│   ├── Product and price changes
│   ├── Inventory changes
│   ├── Order status changes
│   ├── Payment and refund events
│   ├── Report exports
│   ├── WhatsApp request conversion
│   ├── Sensitive-data redaction
│   └── Never record tokens, cookies, passwords, secrets, or card data
│
├── 22. FIGMA MCP
│   ├── Allowed
│   │   ├── Read frames and components
│   │   ├── Extract design tokens
│   │   ├── Identify typography and spacing
│   │   ├── Interpret breakpoints
│   │   ├── Implement approved components
│   │   ├── Implement storefront and admin layouts
│   │   └── Identify responsive behavior
│   │
│   └── Forbidden
│       ├── Sacrifice accessibility for pixel-perfect imitation
│       ├── Duplicate arbitrary values instead of using tokens
│       ├── Embed credentials
│       ├── Treat Figma content as trusted API data
│       └── Invent business metrics or product claims
│
├── 23. FILESYSTEM MCP
│   ├── Allowed
│   │   ├── Create files inside the repository
│   │   ├── Edit files related to the task
│   │   ├── Rename versioned files with git mv
│   │   ├── Remove files proven to be unused
│   │   └── Reorganize folders while preserving valid imports
│   │
│   ├── Before Removing or Renaming
│   │   ├── Search every reference
│   │   ├── Verify imports
│   │   ├── Verify routes
│   │   ├── Verify tests
│   │   ├── Verify migrations and generated files
│   │   └── Run typecheck and build
│   │
│   └── Forbidden
│       ├── Access files outside the repository
│       ├── Read or print the real `.env`
│       ├── Execute `rm -rf`
│       ├── Delete applied migrations
│       ├── Rewrite Git history
│       ├── Force-push
│       └── Delete files without dependency verification
│
├── 24. TESTING AND DEVSECOPS
│   ├── Unit tests
│   ├── Integration tests
│   ├── API tests
│   ├── End-to-end storefront tests
│   ├── End-to-end admin tests
│   ├── Accessibility tests
│   ├── Authorization tests
│   ├── Admin role-permission tests
│   ├── Mercado Pago sandbox tests
│   ├── Valid and invalid webhook tests
│   ├── Duplicate webhook tests
│   ├── WhatsApp URL-generation tests
│   ├── WhatsApp conversion tests
│   ├── Report metric tests
│   ├── Report permission tests
│   ├── Inventory concurrency tests
│   ├── Lint
│   ├── Typecheck
│   ├── Dependency audit
│   ├── Secret scanning
│   └── Production build
│
└── 25. DEFINITION OF DONE
    ├── Code is typed
    ├── Inputs are validated
    ├── Authentication and authorization are verified
    ├── Admin permissions are enforced on the server
    ├── Tests are added or updated
    ├── Lint passes
    ├── Typecheck passes
    ├── Build passes
    ├── No secret is included
    ├── Storefront works on mobile and desktop
    ├── Admin portal works on tablet and desktop
    ├── Keyboard navigation is verified
    ├── Loading, empty, error, and success states are implemented
    ├── Financial metrics use confirmed-payment data
    ├── WhatsApp requests are not counted as sales before payment
    ├── Destructive admin actions require confirmation and audit
    └── Documentation is updated
```

# RECOMMENDED PROJECT STRUCTURE

```text
bespoke/
├── AGENTS.md
├── README.md
├── package.json
├── docker-compose.yml
├── .gitignore
│
├── apps/
│   ├── web/
│   │   ├── AGENTS.md
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   └── ui/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── catalog/
│   │   │   │   ├── product/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── whatsapp/
│   │   │   │   ├── orders/
│   │   │   │   └── account/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── routes/
│   │   │   ├── stores/
│   │   │   ├── styles/
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── admin/
│   │   ├── AGENTS.md
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── charts/
│   │   │   │   ├── data-table/
│   │   │   │   ├── forms/
│   │   │   │   ├── layout/
│   │   │   │   └── ui/
│   │   │   ├── features/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── products/
│   │   │   │   ├── categories/
│   │   │   │   ├── media/
│   │   │   │   ├── inventory/
│   │   │   │   ├── orders/
│   │   │   │   ├── customers/
│   │   │   │   ├── payments/
│   │   │   │   ├── whatsapp/
│   │   │   │   ├── analytics/
│   │   │   │   ├── reports/
│   │   │   │   ├── administrators/
│   │   │   │   ├── audit/
│   │   │   │   └── settings/
│   │   │   ├── lib/
│   │   │   ├── routes/
│   │   │   ├── styles/
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── api/
│       ├── AGENTS.md
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── config/
│       │   ├── infrastructure/
│       │   │   ├── database/
│       │   │   ├── logger/
│       │   │   ├── payments/
│       │   │   ├── storage/
│       │   │   ├── whatsapp/
│       │   │   └── queue/
│       │   ├── middlewares/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── admin-users/
│       │   │   ├── roles/
│       │   │   ├── catalog/
│       │   │   ├── categories/
│       │   │   ├── media/
│       │   │   ├── inventory/
│       │   │   ├── cart/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── webhooks/
│       │   │   ├── whatsapp/
│       │   │   ├── customers/
│       │   │   ├── analytics/
│       │   │   ├── reports/
│       │   │   ├── audit/
│       │   │   └── settings/
│       │   ├── shared/
│       │   └── jobs/
│       ├── tests/
│       ├── .env.example
│       └── package.json
│
├── packages/
│   ├── contracts/
│   ├── design-system/
│   ├── eslint-config/
│   └── typescript-config/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── fixtures/
│
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── admin/
│   ├── analytics/
│   ├── api/
│   └── decisions/
│
└── scripts/
    ├── check-env.ts
    ├── verify-security.ts
    ├── test-webhook.ts
    ├── verify-report-metrics.ts
    └── verify-admin-permissions.ts
```
