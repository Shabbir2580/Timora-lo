# Timora Feature Completion Roadmap

This roadmap tracks source changes separately from live verification. No item is considered production-ready merely because code has been committed. Deployment is explicitly opt-in and must not be triggered without the owner's direct instruction.

## Release gate — fix before expanding
- [ ] Resolve every TypeScript/build error reported by Vercel, one at a time.
- [ ] Verify the sitemap builds and includes active database products.
- [ ] Confirm all required Supabase migrations are applied to the intended project; compare migration history before running renamed or pending migrations.
- [ ] Verify checkout totals, stock reservation/restoration, order expiry, and order state transitions using test products.
- [ ] Verify admin and employee permissions with separate accounts and database RLS/RPC checks.
- [ ] Test sign-in, sign-out, email confirmation, password reset, cart persistence, and order history.
- [ ] Run a successful production build and browser smoke test before requesting deployment.

## Admin and operations
- [ ] Dashboard metric definitions are consistent and counts are sourced from database records.
- [ ] Add searchable, filterable order management and CSV export.
- [ ] Add order detail view with line items, payment evidence/history, status timeline, and tracking details.
- [ ] Add explicit payment verification history and safe COD approval/collection transitions.
- [ ] Add cancellation/refund workflow with audit trail; preserve financial records instead of deleting paid orders.
- [ ] Add inventory filters, low-stock thresholds, stock adjustment history, and bulk import/export.
- [ ] Add coupon lifecycle management and usage reporting.
- [ ] Add review moderation history and verified-purchase rules.
- [ ] Add business reports: gross sales, collected payments, refunds, discounts, estimated margin, and average order value.
- [ ] Add admin audit log for sensitive actions.

## Employee workspace
- [ ] Verify task assignment RPC and RLS in the target Supabase project.
- [ ] Add task search/filter by assignee, status, priority, and due date.
- [ ] Add due-soon/overdue indicators and task history.
- [ ] Add employee workload and completion reports.
- [ ] Ensure employees can only see assigned tasks and only perform allowed state transitions.
- [ ] Add in-app notifications for assignment, review, and requested changes.

## Customer storefront
- [ ] Test product search, sorting, category filters, stock availability, gallery, and mobile layout.
- [ ] Add review photo upload with storage policies and moderation.
- [ ] Complete customer order tracking and clear order-status explanations.
- [ ] Complete address book and account settings.
- [ ] Add connected newsletter subscription form and confirm consent handling.
- [ ] Add tested English/Hindi localization.
- [ ] Add support ticket flow linked to orders.
- [ ] Add seller application and approval workflow before any seller self-service portal.

## Payments and fulfilment
- [ ] Do not mark UPI/manual payments paid from a screenshot or client-side action alone.
- [ ] If Razorpay is enabled, implement server-created payment orders, signature verification, verified webhooks, idempotency, reconciliation, and refund handling.
- [ ] If courier integration is enabled, implement tracking IDs, status updates, delivery exceptions, and customer notifications.
- [ ] Verify every transition handles duplicate requests and network retries safely.

## Quality and accessibility
- [ ] Add automated tests for money calculations, coupons, stock concurrency, and order state transitions.
- [ ] Add route smoke tests and role-based access tests.
- [ ] Test keyboard navigation, focus visibility, contrast, form labels, and reduced motion.
- [ ] Check mobile layouts, touch targets, image fallbacks, and Core Web Vitals.
- [ ] Confirm privacy, terms, shipping, returns, and refund policy content matches actual operations.

## Working rules
- Work in small, reviewable changes and inspect existing code before editing.
- Preserve existing functionality and use exact file paths in change summaries.
- Do not claim tests passed unless they were actually run.
- Do not deploy unless the owner explicitly says to deploy.
- After each change, record the commit and the remaining verification needed.

## Additional source fixes — 16 October 2026
- [x] Fixed media URL validation to validate the original URL before transforming Google Drive image links into the site's internal image proxy path.
- [x] Preserved safe same-site image paths when editing existing products, so previously normalized image URLs do not fail validation.
- [x] Changed SALE badges, percentage-off labels, crossed-out MRP, and the Deals page to require an explicit `sale` product tag as well as a valid compare-at price above the selling price.
- [x] Added customer-order-page review links for delivered, paid order items and an explanation that reviews unlock after delivery and payment confirmation.
- [x] Added a wider Timora wordmark for desktop and mobile navigation so the brand is more legible at small sizes.
- [ ] Verify media URL handling with regular HTTPS image URLs, Google Drive links, YouTube links, and existing products with normalized paths.
- [ ] Verify sale labels against live product records; existing incorrect `sale` tags or compare-at prices may still need data cleanup.
- [ ] Verify review eligibility and submission against the live Supabase schema and an actual delivered, paid test order.
- [ ] Build and run browser smoke tests. No successful build is confirmed yet.

## Work completed in this iteration — 16 October 2026
- [x] Added an admin-only CSV export for the currently filtered/searched orders, including order/customer/payment/shipping fields and item summaries. Customer-controlled cell values are escaped to reduce spreadsheet formula-injection risk.
- [x] Fixed dashboard low-stock alerts to query active products with stock at or below five directly; the dashboard now uses the database's exact count rather than counting only the first 100 arbitrary catalogue rows.
- [x] Added an employee directory search by registered email.
- [ ] Build/type-check these changes. Vercel currently reports the build-rate limit, and no local build has been run in this environment.
- [ ] Test CSV output with special characters, an empty filter result, and real admin account permissions.
- [x] Fixed the homepage product cards to show SALE and crossed-out pricing only when the product has an explicit `sale` tag and a valid higher compare-at price.
- [x] Increased the primary homepage wordmark size; the homepage uses its own header separate from the shared navigation component.
- [x] Removed the hard-coded Flash Sale countdown because it was not connected to a real sale end time.
- [x] Kept cancelled orders visible in customer order history; the page already had a cancelled-order status view, but its query filtered those records out.
- [ ] Confirm these source changes with a successful build and browser checks; no build/test success is claimed.
- [x] Removed fabricated category product counts from category cards; they now use a neutral “Explore collection” label until counts are sourced dynamically.
- [x] Fixed the wishlist product mapper, which still generated SALE badges from compare-at price alone even after the catalogue fixes.
- [ ] Audit all remaining product mappers for duplicate sale logic and run a successful type-check/build before release.

- [x] Renamed the generic product grid previously titled “Flash Sale” to “Featured collection,” because no sale schedule or actual sale-only filter was connected to that section.
- [ ] Continue auditing duplicate product mappers, review purchase eligibility, checkout edge cases, and role permissions; live database migration state and production behavior remain unverified.

- [x] Hardened the catalogue and product-detail SALE badge mappers against malformed/non-finite prices and non-string tag values.
- [ ] Keep source-only fixes separate from release verification: no successful build, live Supabase migration check, or production browser test has been confirmed in this session.


## Business Growth Platform — source implementation started (17 October 2026)

- [x] Added a versioned source migration for granular Important Employee permissions, advertiser records, campaigns, event storage, Instagram content planning, business expenses and staff audit history.
- [x] Added an admin-only permission-management RPC that records promotion, permission changes and revocations in the audit log.
- [x] Added database guards for direct campaign/marketing publishing, protected approval history and restricted campaign budget/cost edits to admins.
- [x] Added a public campaign view exposing only safe creative fields; internal advertiser contacts, staff IDs, budgets and costs are not exposed to anonymous visitors.
- [x] Added a public campaign renderer and connected homepage secondary/featured placements. The storefront fails gracefully if the migration is not yet applied.
- [x] Added a campaign management workspace with creative uploads, advertiser records, campaign draft/approval/publish/pause workflow and date-filtered analytics reporting.
- [x] Added an Instagram content planner for drafts, media, hashtags, approval and planned schedules. It explicitly does not claim to publish to Instagram without a Meta integration.
- [x] Added best-effort impression and click events plus purchase attribution for eligible verified orders linked to a recent same-session ad click.
- [x] Added Important Employee promotion and individual permission controls to the admin employee directory; added authorized Growth Studio navigation and sales-collection metrics.
- [x] Added a permission-gated finance workspace for verified collections, recorded business expenses, expense CSV export and a clearly labelled collections-minus-recorded-expenses figure (not claimed as net profit).
- [ ] Review the migration against the target project's actual migration history and run it in a non-production Supabase project. No database migration has been applied by this source change.
- [ ] Run a successful TypeScript check and production build. This environment could not clone the repository for local execution; no build success is claimed.
- [ ] Test upload permissions, campaign status transitions, public creative visibility, advertiser isolation, event deduplication, attribution and dashboard access using separate admin/employee/customer accounts.
- [ ] Add consent-aware persistent attribution, rate limiting/abuse controls for public analytics events, and conversion reconciliation tests.
- [ ] Connect remaining campaign placements (homepage hero, category and deals), add campaign editing/archiving UX, and implement actual Meta/Instagram publishing only after credentials and API permissions are configured.
- [ ] Implement the remaining roadmap modules incrementally: expense/profit reporting UI, customer loyalty/referrals, back-in-stock and consent-based abandoned-cart messaging, support queue, inventory history, notifications, report exports, A/B tests and external advertiser billing.
- [ ] Do not deploy or apply live database changes without explicit owner approval.
