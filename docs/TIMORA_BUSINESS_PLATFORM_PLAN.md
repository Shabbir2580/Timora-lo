# Timora Business Growth Platform — Implementation Blueprint

**Status:** source design in progress. This document is not proof of a working feature. No live Supabase database has been modified and no production deployment has been requested or performed.

## Product direction

Build three connected areas while preserving the current storefront:
1. Storefront: premium product browsing, clearly labelled sponsored placements, accurate promotions and customer support.
2. Business Console: order and fulfilment operations, staff, inventory, financial reporting and audit history.
3. Growth Studio: advertising campaigns, featured product cards, Instagram content planning, external advertisers and campaign analytics.

## Staff model

Keep the existing staff_roles values (admin and employee). Important Employee is a regular employee with extra permission grants, not a new privileged base role. Promotion is an admin-controlled convenience that grants an approved permission set; every capability remains independently revocable.

Proposed permission flags:
- manage_advertisements
- publish_advertisements
- manage_advertisers
- view_advertisement_analytics
- manage_marketing_content
- publish_marketing_content
- view_sales_analytics
- view_profit_analytics

The default Important Employee preset should enable advertising management, campaign analytics, marketing-content management and sales analytics. Direct publishing and profit/expense reporting should be separate opt-ins. Admins retain all permissions.

## Planned delivery phases

### Phase 0 — Inspect and establish safe foundations
- Confirm existing role/RLS/RPC implementation and migration history.
- Keep a written distinction between source migrations and migrations applied to the target database.
- Preserve the existing admin and employee workflows.
- Add migration and UI tests before exposing new controls.

### Phase 1 — Staff permissions and business overview
- Admin can promote/revoke Important Employee access and tune permissions.
- Employee workspace shows assigned tasks and existing duties plus permitted modules.
- Sales, collections, advertising revenue and expenses are separate metrics.
- Profit is only shown when cost/expense data supports a defined calculation.
- Audit sensitive permission and finance actions.

### Phase 2 — Campaigns and placements
- Timora promotions, featured products and external ads.
- Homepage hero and featured product cards first; category/deals placements later.
- Draft, pending approval, approved/scheduled, live, paused, rejected, expired and archived states.
- Admin approval by default; direct publishing only with an explicit permission.
- Clear Advertisement / Sponsored labels and truthful sale claims.

### Phase 3 — Marketing Studio
- Instagram post/Story/Reel planner, media, captions, hashtags, destination links and review calendar.
- Direct Meta publishing only after the required professional account, permissions, API setup and tests are complete.
- Until then, display drafts/scheduled plans honestly rather than claiming they were published.

### Phase 4 — Analytics and attribution
- Deduplicated impression, click, add-to-cart and purchase events.
- Default 30-day last eligible click attribution; document the model and limitations.
- Verified paid orders or confirmed COD collection are the source of truth for conversions.
- Never store personal customer data in tracking URLs or unrestricted event metadata.
- Track campaign cost separately from product revenue; calculate ROAS only when cost is known.
- Add privacy-conscious first-party tracking and exclude internal test traffic where practical.

### Phase 5 — Customer growth and operations
- Customer loyalty/referral, back-in-stock alerts and consent-based abandoned-cart follow-ups.
- Inventory thresholds and stock history, order timelines, returns/refunds and support queue.
- Employee notifications, task workload reports, exports with permission checks.
- Smart campaign recommendations and A/B testing only after reliable data exists.

### Phase 6 — External advertiser monetization
- Advertiser profiles, campaign terms, campaign duration, agreed fees, invoice/payment records.
- Self-service advertiser accounts remain out of initial scope.
- External advertisers only see their own approved reports if that portal is added later.

## Financial metric definitions

- Gross sales: defined order value before discounts/refunds, using an explicit date basis.
- Collected revenue: confirmed payments and confirmed COD collections, not merely placed orders.
- Advertising revenue: fees actually earned/collected for campaigns, separately reported.
- Expenses: verified business expense entries and applicable supplier/fulfilment/payment costs.
- Profit: only an estimate until product cost, shipping/packaging, payment fees, refunds and other expenses are captured. Label any incomplete margin calculation as an estimate.

## Security and release rules

- Server-side authorization and RLS must agree; hiding a button is not security.
- No direct client writes to raw analytics events or audit records.
- Campaign publication and purchase attribution must be validated by trusted server/RPC logic.
- Restrict employee financial visibility independently from advertising permissions.
- Test with separate admin, regular employee, important employee and unauthenticated accounts.
- Do not execute this repository's SQL migrations against the live project without explicit owner approval.
- Do not deploy or accept real advertising payments until migration state, production build, browser flows, permissions, conversion idempotency and storefront regression tests pass.
- Never claim successful tests or deployment without actual evidence.

## Foundation schema draft

The proposed 202610170001_business_growth_foundation.sql adds permission grants, advertiser/campaign records, analytics event storage, Instagram content planning, business expenses and staff audit records. It is only a source migration draft. Before applying it, review the live migration history and run it against a non-production Supabase project. Publishing-transition enforcement, validated event ingestion, conversion attribution, audit-write functions and dashboard integration are explicit follow-up work; the schema alone is not a complete or production-ready feature.

## Source implementation progress — 17 October 2026

The first implementation slice now exists in the repository:
- Admin employee management includes Important Employee promotion, permission tuning, direct-publishing permission and financial-report permission.
- The advertising workspace supports advertiser records, image uploads to a proposed public creative bucket, campaign drafts, approval/submission, trusted publishing, pause controls and date-filtered reporting.
- The homepage reads eligible campaigns from a public-safe view and records best-effort impression/click events.
- The customer order-history flow attempts to attribute verified paid/collected orders to a recent ad click in the same browser session.
- The Instagram marketing workspace stores drafts, creatives, captions, hashtags and planned times. It does not claim a post was published externally.
- The source migration includes permission checks, publication guards, purchase eligibility checks, deduplication keys, and audit records for campaign/marketing state changes.

These are source changes only. The migration has not been applied to any database, the repository could not be cloned for a local build in this environment, and no successful type-check, SQL execution, browser test or deployment is confirmed. The next step is static review and non-production migration/build validation before extending the remaining roadmap modules.
