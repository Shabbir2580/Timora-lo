# Timora repair branch deployment notes

## Important order of operations

The application changes on `fix/timora-repairs` depend on the Supabase migration in:

`supabase/migrations/202610150001_timora_repairs.sql`

Do **not** deploy the application changes to production before the migration is successfully applied. The migration has not been executed against your live Supabase project from this repository, so review/test it in Supabase before production use.

## Apply the database migration

1. Open the Supabase project used by Timora.
2. Open **SQL Editor** and create a new query.
3. Open `supabase/migrations/202610150001_timora_repairs.sql` in GitHub and copy the complete file.
4. Paste the complete SQL into the editor and run it.
5. If Supabase reports an error, stop. Do not deploy the app until the SQL error is corrected.
6. Verify the expected functions exist: `create_order_atomic`, `cancel_my_pending_order`, `expire_stale_pending_orders`, `verify_order_payment`, `mark_cod_collected`, `submit_product_review`, `moderate_product_review`, and `subscribe_newsletter`.

The migration reserves stock when an order is created. It restores stock only when an unpaid pending order is cancelled, expires, or a COD order is rejected. Verify these flows using test products/orders before live sales.

## Authentication settings

In Supabase **Authentication → URL Configuration**, add the deployed Timora URL to the allowed Site URL/redirect URLs. Include:

- `https://YOUR-DEPLOYED-DOMAIN/`
- `https://YOUR-DEPLOYED-DOMAIN/auth/callback`
- `http://localhost:3000/**` for local development, if used

Replace `YOUR-DEPLOYED-DOMAIN` with the actual domain. If Google sign-in is enabled in the UI, configure the Google provider in Supabase and its OAuth redirect URI as well. Email/password login does not require Google OAuth.

Confirm Vercel has these public environment variables configured for the correct Supabase project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never commit Supabase service-role keys or other secrets to the repository.

## Smoke-test before production

- Register a test account, confirm email if enabled, sign in, sign out, and reset password.
- Create a test order and confirm the returned total matches subtotal + shipping - discount.
- Confirm stock decreases exactly once, and cancelling an eligible pending order restores it exactly once.
- Verify manual payment only after checking the actual payment receipt.
- Test COD approval, delivery progression, and COD collection.
- Submit a review only from a delivered, paid test order, then approve it as staff.
- Test newsletter subscription and admin coupon CRUD.
- Confirm the admin can manage products and employees cannot modify product records.
