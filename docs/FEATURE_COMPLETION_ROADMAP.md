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
