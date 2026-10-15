# Timora website audit and repair backlog

Audit basis: source review of the `main` branch and the current `fix/timora-repairs` branch on 15 October 2026. This is a code-level audit, not a live browser, Supabase, payment, or mobile-device test. Items marked "verify" require a real environment test.

## Priority 0 — release blockers

- [ ] Apply and test `supabase/migrations/202610150001_timora_repairs.sql` in a non-production Supabase environment first. The app's order flow depends on the RPC functions in this migration. Do not deploy the app branch before the migration is verified.
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
