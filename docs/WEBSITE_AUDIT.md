# Timora website audit and repair backlog

Audit basis: source review of `main` on 16 October 2026. This is a code-level audit, not a live browser, Supabase, payment, or mobile-device test. Items marked "verify" require a real environment test. Vercel status checks for the latest `main` commit are currently failing with `build-rate-limit`, so no current production build is verified.

## Confirmed repository repairs on 16 October 2026

- [x] Fixed duplicate Supabase migration version prefixes for product videos and product tags. The final filenames are `202610150009_product_videos.sql` and `202610150010_product_tags.sql`.
- [x] Removed `typescript.ignoreBuildErrors` from `next.config.mjs`; production builds must now report TypeScript errors instead of silently skipping them.
- [x] Order deletion and employee-task approval code has been added to `main`, but its production behavior still requires successful deployment and live database verification.
- [ ] Re-run the production build after the Vercel build-rate limit is resolved. Removing the TypeScript bypass may expose previously hidden errors; repair those before treating the release as healthy.

## Priority 0 — release blockers

- [ ] Apply and test `supabase/migrations/202610150001_timora_repairs.sql` in a non-production Supabase environment first. The app's order flow depends on the RPC functions in this migration. Do not deploy the app branch before the migration is verified.
- [ ] Enable Supabase `pg_cron` and run `supabase/schedule_expired_orders.sql`; otherwise pending orders can hold reserved stock indefinitely. Verify the scheduled job is present.
- [ ] Exercise order creation with real database products and check that the server-calculated subtotal, shipping, coupon discount, and total match the checkout UI.
- [ ] Verify stock is reserved once and restored once for cancellation, expiry, and rejected COD orders.
- [ ] Verify staff-only permissions for payment verification, COD decisions, product edits, and review moderation.
- [ ] Run a production build/type check and test login, logout, email confirmation, password reset, checkout, and order history with test accounts. These have not been run from this audit environment.

## Priority 1 — fix core shopping usability

- [x] Product-detail gallery thumbnails now select the main image and expose accessible button labels.
- [x] Product detail offers a View cart action after adding an item (already present on the repair branch).
- [x] Cart persistence validates saved quantities and only accepts live UUID-backed products (already present on the repair branch).
- [ ] Test cart add/remove/quantity controls on mobile and desktop, including stock limits and reload persistence.
- [x] Wishlist now distinguishes database loading failures from a genuinely empty wishlist and provides a retry action. Still needs browser verification.
- [x] Homepage desktop and mobile search now submit to the full `/products?q=...` catalogue instead of relying only on the eight featured items. Still needs browser verification.
- [ ] Add explicit loading, empty, error, and retry states to catalogue, product, orders, and admin pages; confirm all visible controls have meaningful outcomes.
- [ ] Verify every navigation/footer destination exists and does not lead to a 404.
- [ ] Check image URLs, missing-image fallbacks, product gallery ordering, and mobile tap targets.

## Priority 2 — missing business capabilities

- [ ] Payment gateway: current checkout exposes UPI QR/manual verification, WhatsApp request, and COD flows. A verified Razorpay order/payment integration is not present in the reviewed migration. Add gateway orders, signature verification, webhook handling, idempotency, refunds, and payment-state reconciliation before claiming online card/UPI gateway support.
- [ ] Shipping: order status timeline exists, but a courier integration for tracking IDs, webhook status updates, delivery estimates, and exception handling must be verified/implemented before promising live tracking.
- [ ] Customer reviews: text reviews and staff moderation exist in the code path; customer photo uploads and storage moderation are not implemented in the reviewed component.
- [ ] Newsletter: the homepage currently shows a promotional CTA rather than an email subscription form connected to the newsletter RPC.
- [ ] Seller onboarding: no complete seller application, admin approval workflow, seller inventory controls, commission/margin ledger, or seller payout flow was verified.
- [ ] Language: the current root layout is English-only. Add a tested Hindi/English switch with translated navigation, product/checkout copy, validation, and persistence.
- [ ] Coupons: database support exists in the repair migration; verify the admin UI supports creating, editing, activating, expiring, and limiting coupons before presenting coupons as an operational feature.
- [ ] Customer account: test address management, order cancellation eligibility, account menu links, and session-expiry behavior end to end.
- [ ] Trust/compliance: confirm published shipping, returns/refund, privacy, terms, contact, and customer-care details are accurate and consistent.

## Priority 3 — polish after reliability

- [ ] Add analytics for product views, search terms, add-to-cart, checkout abandonment, and completed orders without collecting unnecessary personal data.
- [ ] Add performance checks for image sizes, layout shift, font loading, and Core Web Vitals.
- [ ] Add automated tests for pricing, coupons, stock concurrency, cart state, and order lifecycle.
- [ ] Add accessibility checks for keyboard navigation, focus visibility, labels, contrast, and reduced-motion preferences.

## Current audit notes

- The repair branch is based on `main`; the latest branch comparison should be used for the current ahead/behind count.
- The migration has not been run against the live Supabase project from this environment.
- No local build, browser automation, live checkout, or payment test was run here. Do not interpret source review as production validation.


## Follow-up audit — 16 October 2026

- [x] Password recovery and metadata now use `NEXT_PUBLIC_SITE_URL` (falling back to the current browser origin for recovery links) instead of hardcoding the old Vercel hostname in the recovery flow.
- [x] Confirmed the singular `/shipping` route is a compatibility alias to `/shippings`; footer and sitemap use the plural route, so this is not a broken link.
- [ ] **Live database/source mismatch needs resolution:** the live `create_order_atomic` definition supplied during the audit returns `TABLE(order_id, subtotal_paise, shipping_paise, discount_paise, total_paise)`, while repository migration `202610150001_timora_repairs.sql` replaces that function with a `jsonb` return. The API currently accepts either shape, but the deployed database and migration history are not aligned. Confirm the migration history and actual live schema before applying any migration; do not blindly re-run the function replacement because PostgreSQL cannot change a function's return type with `CREATE OR REPLACE`.
- [ ] **Database target is not independently verified:** earlier SQL results showed zero orders/order items, while the admin UI was reported to show order counts. Confirm Vercel's `NEXT_PUBLIC_SUPABASE_URL` matches the Supabase project queried in SQL Editor, and verify the deployed environment has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never paste secret/service-role keys into chat or client-side variables.
- [ ] **Deployment verification remains blocked:** Vercel checks for the current `main` commit report `build-rate-limit`; no production build or browser end-to-end test is verified from this environment.
- [ ] The order-expiry cron, checkout totals/stock lifecycle, auth redirects, staff permissions, and live customer review eligibility still require test orders in the intended Supabase project.
- [ ] Newsletter form and `/api/newsletter` RPC integration are present in source. Confirm the matching database migration/RPC is applied in the live project; stored opt-ins do not mean marketing emails are configured.

## Follow-up hardening — 16 October 2026

- [x] Google Drive image proxy now applies an 8-second timeout per upstream request, enforces a 12 MB maximum while streaming, cancels rejected responses, and sends `X-Content-Type-Options: nosniff`. This limits oversized or stalled upstream image requests; the endpoint still needs a successful deployment and live test with public, private, missing, and oversized Drive files.
- [ ] Re-run the production build and exercise the image converter after the Vercel build-rate limit is resolved. No build or production verification was performed as part of this source-only change.

## Employee workspace and image converter follow-up — 16 October 2026

- [x] Added migration `202610160001_fix_employee_member_rpc_result.sql` to drop/recreate the employee-list RPC with explicit casts for UUID, email/name text, role text, and timestamp output. This addresses the likely runtime row-type mismatch reported by the Employee work page; it must still be applied to the intended Supabase project before employee names can load.
- [x] Updated the task page's error message to point to the repair migration rather than the older migration that may already be applied.
- [x] Made the Drive converter link more prominent in the Products page header and added a second shortcut beside the main product image URL field.
- [ ] Apply the employee RPC repair migration in Supabase, then verify that the admin can load authorized employees, assign tasks, and see task progress. No live Supabase connection was available to apply or test this migration here.
- [ ] The converter button is present in `main`; if it is absent on the live site, the running deployment is still serving an older commit. Verify after Vercel can build/deploy successfully. No deployment was initiated.

## Employee task assignment repair — 16 October 2026

- [x] Added migration `202610160002_fix_employee_task_assignment_rls.sql` with a role-checked database function for task assignment. It validates the signed-in admin, title length, priority, and that the assignee has the employee role; the assigning user is taken from the authenticated session.
- [x] Updated the Employee work page to use the new function instead of a direct browser insert.
- [ ] Apply this migration to the Supabase project used by the live website, then test assignment and verify the task appears for both admin and assigned employee. GitHub changes alone do not update the database.
- [ ] Vercel build-rate-limit is still blocking successful build verification. Official Vercel documentation says Hobby accounts allow 32 builds per rolling 3600-second window; the exact remaining wait for this account is not visible from GitHub.


## Source consistency checks — 16 October 2026

- [x] Corrected the product-management back button so it returns to `/admin`, not the public storefront.
- [x] Found two migration files sharing the same Supabase version prefix `202610160001`. Renamed the order/review decision validation migration to `202610160003_validate_order_and_review_decisions.sql` so CLI migration ordering is unique. The SQL is idempotent, but confirm your Supabase migration history before running pending migrations.
- [x] Changed the package metadata name from the generic `my-project` to `timora` for consistent project identity.
- [ ] Verify all admin/employee navigation and the Back button in a deployed browser after Vercel allows a successful build. Source inspection is not live-browser verification.


## Order history completeness — 17 October 2026

- [x] Updated `app/admin/orders/page.tsx` to page through order records in batches of 500 instead of relying on a single PostgREST response, which can be capped by the project's row limit.
- [x] Chunked order-item lookups into groups of 10 order IDs and grouped items by order ID, avoiding oversized item responses and repeated full-array filtering for each order.
- [ ] Verify in a test environment with more orders than the configured API row limit, and test refresh, filters, monthly metrics, CSV export, and order actions.
- [ ] No build, browser test, live Supabase query, or deployment was performed for this source change.


## Follow-up checkout audit — 17 October 2026

- [x] Confirmed `public/payment/timora-upi-qr.png` exists in the repository; this verifies the referenced asset path exists, but does not verify that the QR belongs to Timora's intended merchant account. Check the displayed merchant name with a low-value test payment before launch.
- [ ] **Release blocker — product options conflict with checkout:** the product/cart data model supports colour variants, but `app/api/orders/route.ts` rejects every selected variant other than `Default`, and the atomic-order SQL also rejects non-default variants. A customer can select a colour that the order service refuses. Resolve by implementing inventory-backed variants end to end, or clearly disable variant selection for products that have no configured variants; do not merely remove the server-side validation.
- [ ] **Address default selection is not atomic:** `app/addresses/page.tsx` and checkout clear all existing default flags before inserting/updating the new default. If the subsequent write fails, the customer may be left with no default address. Replace with a transaction/RPC or safely recover the previous default; test failed writes and concurrent updates.
- [ ] **Payment is manual, not gateway-verified:** the UPI QR section explicitly tells customers to confirm payment manually; staff RPC marks payment paid after manual verification. The QR asset's presence is not proof of merchant ownership, and no automatic UPI/Razorpay verification was confirmed.
- [ ] Review the actual deployed database function definitions and migration history before applying repair migrations. The historical atomic-order migration returns a table while the later repair migration changes the function to JSONB by dropping/recreating it; do not rerun the repair migration blindly against a database with dependencies or unconfirmed state.
- [ ] No successful build or browser/end-to-end check has been confirmed for the latest `main` commit. GitHub reports no completed check runs for the current documentation commit.


## Order delivery RPC follow-up — 17 October 2026

- [x] Added `supabase/migrations/202610170002_define_order_delivery_rpc.sql` because the admin order page calls `update_order_delivery`, but no checked-in migration defined that RPC. The function locks the order row, permits only confirmed → processing → shipped → delivered transitions, requires verified payment or approved COD, requires courier and tracking details before shipping, and limits execution to admin/employee staff roles.
- [ ] **Do not assume this migration is applied.** Review the live function definition and Supabase migration history first; apply only after confirming the target schema and function signature. Then test unauthorized access, unpaid non-COD orders, unapproved COD orders, invalid transitions, missing tracking details, and the full valid transition sequence in a test project.
- [ ] Build/deployment remains unverified because Vercel reports build-rate-limit failures. No live database or browser tests were run for this migration.
