import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const checkout = read("supabase/migrations/202610170010_fix_checkout_coupon_validation.sql");
const cancellation = read("supabase/migrations/202610170011_restore_coupon_usage_on_cancel.sql");
const reviewAccess = read("supabase/migrations/202610170012_restrict_anonymous_review_rpcs.sql");
const notifications = read("supabase/migrations/202610170007_order_status_notifications.sql");

assert.match(checkout, /set search_path\s*=\s*''/i, "Checkout SECURITY DEFINER RPC must use an empty search_path.");
assert.match(checkout, /v_subtotal\s*>=\s*99900/i, "Free-shipping threshold must remain ₹999.");
assert.match(checkout, /v_shipping\s*:=\s*case\s+when\s+v_subtotal\s*>=\s*99900\s+then\s+0\s+else\s+8000/i, "Checkout must charge ₹80 below ₹999.");
assert.match(checkout, /from public\.coupons c where c\.code = v_coupon_code for update/i, "Coupon usage-limit checks must lock the coupon row.");
assert.match(checkout, /set usage_count = usage_count \+ 1/i, "Coupon usage must increment atomically with order creation.");
assert.match(checkout, /revoke all on function public\.create_order_atomic[\s\S]*?from public, anon/i, "Checkout RPC must not be executable by anonymous callers.");
assert.match(cancellation, /set search_path\s*=\s*''/i, "Cancellation SECURITY DEFINER RPCs must use an empty search_path.");
assert.match(cancellation, /usage_count = greatest\(0, usage_count - 1\)/i, "Cancellation and expiry must release coupon usage.");
assert.match(cancellation, /for update skip locked/i, "Expiry must avoid concurrent workers processing the same order.");
assert.match(reviewAccess, /revoke execute on function public\.moderate_product_review\(uuid, text\) from anon/i, "Anonymous callers must not execute review moderation.");
assert.match(reviewAccess, /revoke execute on function public\.submit_product_review\(uuid, integer, text, text\) from anon/i, "Anonymous callers must not execute authenticated review submission.");
assert.doesNotMatch(notifications, /['\"]order_update['\"]/i, "Notification migration must not use an unsupported notification type.");
assert.doesNotMatch(notifications, /create trigger/i, "Notification migration must not add duplicate order notification triggers.");

console.log("Timora database migration contract checks passed.");
