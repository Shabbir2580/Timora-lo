import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const migrationDirectory = join(process.cwd(), "supabase/migrations");
const migrationFiles = readdirSync(migrationDirectory).filter((name) => /^\d+_.+\.sql$/.test(name));
const migrationVersions = migrationFiles.map((name) => name.split("_", 1)[0]);
assert.equal(new Set(migrationVersions).size, migrationVersions.length, "Supabase migration version prefixes must be unique.");
const adminDeleteAccess = read("supabase/migrations/202610170009_revoke_anon_admin_delete_order.sql");
const checkout = read("supabase/migrations/202610170010_fix_checkout_coupon_validation.sql");
const razorpayCheckout = read("supabase/migrations/20261018100000_allow_razorpay_atomic_checkout.sql");
const cancellation = read("supabase/migrations/202610170011_restore_coupon_usage_on_cancel.sql");
const reviewAccess = read("supabase/migrations/202610170012_restrict_anonymous_review_rpcs.sql");
const triggerAccess = read("supabase/migrations/202610170013_restrict_trigger_function_execution.sql");
const foreignKeyIndexes = read("supabase/migrations/202610170014_add_missing_foreign_key_indexes.sql");
const rlsPerformance = read("supabase/migrations/202610170015_optimize_staff_rls_auth_checks.sql");
const anonymousTableAccess = read("supabase/migrations/202610170016_revoke_anonymous_sensitive_table_access.sql");
const notifications = read("supabase/migrations/202610170007_order_status_notifications.sql");
const returnGuards = read("supabase/migrations/202610170006_return_lifecycle_guards.sql");
assert.match(returnGuards, /security definer\s+set search_path\s*=\s*''/i, "Return lifecycle SECURITY DEFINER trigger must use an empty search_path.");
const checkoutPage = read("app/checkout/page.tsx");
const orderApi = read("app/api/orders/route.ts");
const razorpayVerify = read("app/api/razorpay/verify/route.ts");
const razorpayWebhook = read("app/api/razorpay/webhook/route.ts");
const proxy = read("proxy.ts");
const adminReturns = read("app/admin/returns/page.tsx");

assert.match(adminDeleteAccess, /revoke execute on function public\.admin_delete_order\(uuid\) from public, anon/i, "Admin-only order deletion must revoke PUBLIC and anonymous execution.");
assert.match(checkout, /set search_path\s*=\s*''/i, "Checkout SECURITY DEFINER RPC must use an empty search_path.");
assert.match(checkout, /if not coalesce\(v_product_active, false\)/i, "Checkout must reject inactive products.");
assert.match(razorpayCheckout, /p_payment_provider not in \(\x27upi_qr\x27, \x27whatsapp\x27, \x27cod\x27, \x27razorpay\x27\)/i, "Atomic checkout must accept every payment provider supported by the order API, including Razorpay.");
assert.match(checkout, /v_coupon\.is_active/i, "Checkout must reject inactive coupons.");
assert.match(checkout, /v_coupon\.starts_at[\s\S]*?v_coupon\.expires_at/i, "Checkout must enforce coupon start and expiry dates.");
assert.match(checkout, /v_coupon\.usage_count >= v_coupon\.usage_limit/i, "Checkout must enforce coupon usage limits.");
assert.match(checkout, /v_coupon\.minimum_order_paise/i, "Checkout must enforce coupon minimum order values.");
assert.match(checkout, /v_coupon\.max_discount_paise/i, "Checkout must enforce coupon maximum discounts.");
assert.match(checkout, /v_subtotal\s*>=\s*99900/i, "Free-shipping threshold must remain ₹999.");
assert.match(checkout, /v_shipping\s*:=\s*case\s+when\s+v_subtotal\s*>=\s*99900\s+then\s+0\s+else\s+8000/i, "Checkout must charge ₹80 below ₹999.");
assert.match(checkout, /from public\.coupons c where c\.code = v_coupon_code for update/i, "Coupon usage-limit checks must lock the coupon row.");
assert.match(checkout, /set usage_count = usage_count \+ 1/i, "Coupon usage must increment atomically with order creation.");
assert.match(checkout, /revoke all on function public\.create_order_atomic[\s\S]*?from public, anon/i, "Checkout RPC must not be executable by anonymous callers.");
assert.match(cancellation, /set search_path\s*=\s*''/i, "Cancellation SECURITY DEFINER RPCs must use an empty search_path.");
assert.match(cancellation, /usage_count = greatest\(0, usage_count - 1\)/i, "Cancellation and expiry must release coupon usage.");
assert.match(cancellation, /for update skip locked/i, "Expiry must avoid concurrent workers processing the same order.");
assert.match(reviewAccess, /revoke execute on function public\.moderate_product_review\(uuid, text\) from public, anon/i, "Anonymous callers must not execute review moderation.");
assert.match(reviewAccess, /revoke execute on function public\.submit_product_review\(uuid, integer, text, text\) from public, anon/i, "Anonymous callers must not execute authenticated review submission.");
assert.match(triggerAccess, /revoke execute on function public\.timora_guard_campaign_publishing\(\) from public, anon, authenticated/i, "Campaign trigger handler must not be directly callable through the API.");
assert.match(triggerAccess, /revoke execute on function public\.timora_guard_marketing_publishing\(\) from public, anon, authenticated/i, "Marketing trigger handler must not be directly callable through the API.");
assert.doesNotMatch(notifications, /['\"]order_update['\"]/i, "Notification migration must not use an unsupported notification type.");
assert.doesNotMatch(notifications, /create trigger/i, "Notification migration must not add duplicate order notification triggers.");
assert.match(rlsPerformance, /replace\([\s\S]*?auth\.uid\(\)[\s\S]*?\(select auth\.uid\(\)\)/i, "Staff RLS policy optimization must cache auth.uid() per statement.");
assert.match(rlsPerformance, /return_request_staff_notes[\s\S]*?employee_tasks[\s\S]*?staff_permissions[\s\S]*?ad_campaigns[\s\S]*?business_expenses[\s\S]*?staff_audit_log/i, "RLS optimization must cover all tables identified by the advisor.");
assert.match(anonymousTableAccess, /revoke all privileges on table[\s\S]*?public\.addresses[\s\S]*?public\.ad_events[\s\S]*?public\.advertisers[\s\S]*?public\.business_expenses[\s\S]*?public\.coupons[\s\S]*?public\.employee_tasks[\s\S]*?public\.marketing_content[\s\S]*?public\.order_items[\s\S]*?public\.orders[\s\S]*?public\.return_request_staff_notes[\s\S]*?public\.return_requests[\s\S]*?public\.staff_audit_log[\s\S]*?public\.staff_permissions[\s\S]*?public\.staff_roles[\s\S]*?from anon/i, "Sensitive customer, order, staff, and marketing tables must not grant direct privileges to anonymous users.");
assert.match(anonymousTableAccess, /revoke insert, update, delete, truncate, references, trigger, maintain[\s\S]*?public\.products, public\.product_reviews[\s\S]*?from anon/i, "Anonymous clients may read public products and approved reviews but must not mutate either table.");
const expectedForeignKeyIndexes = [
  "idx_ad_campaigns_approved_by",
  "idx_ad_campaigns_created_by",
  "idx_ad_campaigns_published_by",
  "idx_ad_events_order_id",
  "idx_ad_events_product_id",
  "idx_advertisers_created_by",
  "idx_business_expenses_recorded_by",
  "idx_employee_tasks_assigned_by",
  "idx_employee_tasks_reviewed_by",
  "idx_loyalty_points_ledger_order_id",
  "idx_marketing_content_approved_by",
  "idx_marketing_content_created_by",
  "idx_orders_cod_approved_by",
  "idx_product_reviews_customer_id",
  "idx_staff_audit_log_actor_id",
  "idx_staff_permissions_granted_by",
];
for (const indexName of expectedForeignKeyIndexes) {
  assert.match(
    foreignKeyIndexes,
    new RegExp(`create index if not exists ${indexName} on public\\.\\w+ \\(`, "i"),
    `Missing foreign-key performance index: ${indexName}`,
  );
}

assert.match(checkoutPage, /if \(!userId\)[\s\S]*?paymentMethod === "whatsapp"/i, "Guest checkout must preserve the WhatsApp request flow.");
assert.match(orderApi, /supabase\.auth\.getUser\(\)/i, "Order creation must require a verified signed-in user.");
assert.doesNotMatch(proxy, /NextResponse\.redirect\(loginUrl\)/i, "The checkout proxy must not block guest WhatsApp requests.");
assert.match(returnGuards, /when 'requested' then new\.status in \('under_review', 'rejected'\)/i, "Return request initial transitions must be guarded.");
assert.match(adminReturns, /requested: \["under_review", "rejected"\]/i, "Admin return controls must match the database transition guard.");


const advertisingViews = read("supabase/migrations/20261017085000_harden_advertising_views.sql");
assert.match(advertisingViews, /security_invoker = true/i, "Advertising views must use invoker security.");
assert.match(advertisingViews, /grant select \(id, advertiser_id, campaign_type, placement, headline, description,/i, "Anonymous advertising access must use a column-limited grant.");
assert.match(advertisingViews, /Public may read live campaign rows[\s\S]*?timora_campaign_is_public\(id\)/i, "Public campaign rows must be filtered by the publication guard.");


const campaignDelete = read("supabase/migrations/20261018080000_secure_delete_ad_campaign_rpc.sql");
const advertisingAdmin = read("app/admin/advertising/page.tsx");
assert.match(campaignDelete, /create or replace function public\.delete_ad_campaign\(p_campaign_id uuid\)/i, "Campaign deletion must use the guarded database RPC.");
assert.match(campaignDelete, /security definer\s+set search_path\s*=\s*''/i, "Campaign deletion SECURITY DEFINER function must use an empty search_path.");
assert.match(campaignDelete, /timora_has_staff_permission\('manage_advertisements'\)/i, "Campaign deletion must require admin or explicit advertising permission.");
assert.match(campaignDelete, /v_status in \('live', 'scheduled', 'approved'\)/i, "Campaign deletion must protect active and approved campaigns.");
assert.match(campaignDelete, /delete from public\.ad_events[\s\S]*?delete from public\.ad_campaigns/i, "Campaign deletion must handle linked analytics before deleting the campaign.");
assert.match(campaignDelete, /revoke all on function public\.delete_ad_campaign\(uuid\) from public, anon/i, "Campaign deletion RPC must not be executable by anonymous callers.");
assert.match(advertisingAdmin, /rpc\("delete_ad_campaign"/i, "Advertising UI must call the secure campaign deletion RPC.");


const productsAdmin = read("app/admin/products/page.tsx");
assert.match(productsAdmin, /if \(role !== "admin"\)[\s\S]*?Only an administrator can permanently delete products/i, "Only admins may permanently delete products.");
assert.match(productsAdmin, /from\("order_items"\)[\s\S]*?eq\("product_id", product\.id\)/i, "Product deletion must check order history before removing a product.");
assert.match(productsAdmin, /if \(linkedItems\?\.length\)[\s\S]*?is_active: false[\s\S]*?from\("products"\)[\s\S]*?\.delete\(\)/i, "Products with order history must be archived instead of deleted.");
assert.match(productsAdmin, /Each product can have up to 2 videos/i, "Product video upload must enforce the two-video limit.");
assert.match(productsAdmin, /The video must be 100 MB or smaller/i, "Product video upload must enforce the file-size limit.");


const adminOrders = read("app/admin/orders/page.tsx");
const dashboard = read("app/admin/page.tsx");
assert.match(adminOrders, /review_cod_order/i, "COD order review must use the guarded database RPC.");
assert.match(adminOrders, /verify_order_payment/i, "Manual payment verification must use the guarded database RPC.");
assert.match(adminOrders, /update_order_delivery/i, "Delivery updates must use the guarded database RPC.");
assert.match(adminOrders, /order\.order_status !== "cancelled" \|\| order\.payment_status === "paid" \|\| order\.payment_provider === "razorpay"/i, "Order deletion must protect active, paid, and Razorpay orders.");
assert.match(adminOrders, /Only an administrator can permanently delete orders/i, "Permanent order deletion must remain admin-only.");
assert.match(dashboard, /\.eq\("payment_status", "paid"\)/i, "Revenue metrics must be based on paid orders only.");
assert.match(dashboard, /row\.payment_provider === "cod" \? row\.cod_collected_at : row\.payment_verified_at/i, "Revenue must use actual COD collection or payment verification timestamps.");
assert.match(dashboard, /\.neq\("order_status", "cancelled"\)/i, "Active-order dashboard counts must exclude cancelled orders.");

assert.match(razorpayVerify, /timingSafeEqual\(expectedBuffer, receivedBuffer\)/i, "Browser payment verification must compare the Razorpay signature in constant time.");
assert.match(razorpayVerify, /payment\.status !== "captured"/i, "Browser verification must not confirm an uncaptured payment.");
assert.match(razorpayVerify, /payment\.amount !== Number\(order\.total_paise\)/i, "Browser verification must compare the gateway amount with the stored order total.");
assert.match(razorpayVerify, /rpc\("verify_razorpay_order_payment"/i, "Browser verification must finalize payments through the guarded database RPC.");
assert.match(razorpayWebhook, /x-razorpay-signature/i, "Webhook must require Razorpay's signature header.");
assert.match(razorpayWebhook, /createHmac\("sha256", secret\)\.update\(rawBody\)/i, "Webhook must verify the signature against the raw request body.");
assert.match(razorpayWebhook, /Number\(order\.total_paise\) !== payment\.amount/i, "Webhook must reject payment amount mismatches.");
assert.match(razorpayWebhook, /rpc\("verify_razorpay_order_payment"/i, "Webhook must use the same guarded payment finalization RPC.");
assert.match(razorpayWebhook, /finalizeError[\s\S]*?status: 500/i, "Webhook must request a retry if payment finalization fails.");

console.log("Timora database migration contract checks passed.");
