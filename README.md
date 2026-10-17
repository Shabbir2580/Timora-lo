# Timora-lo

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_rbakgPSFrGARunN2Dp2eTbJpO5m6)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.


## Environment setup

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable key. Never commit `.env.local` or real credentials.

## Razorpay checkout setup

1. Create or sign in to your Razorpay account and open **Test Mode**.
2. Generate a Test Mode Key ID and Key Secret in the Razorpay Dashboard.
3. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` (or a supported server-only `SUPABASE_SECRET_KEY`) to local `.env.local` and Vercel Environment Variables. These secrets must never use a `NEXT_PUBLIC_` prefix.
4. In Razorpay Test Mode, configure a webhook to `https://timora-by-sk.vercel.app/api/razorpay/webhook` for `payment.captured` and `order.paid`. Copy the generated webhook secret into `RAZORPAY_WEBHOOK_SECRET` in local/Vercel server environment variables.
5. Deploy after the Vercel build limit resets, then place a test order using Razorpay's test checkout. Confirm that payment is marked paid only after signature verification and Razorpay reports the payment as captured.
6. Only after end-to-end test payments and webhook delivery succeed, switch to Live Mode credentials, configure the Live Mode webhook, and complete Razorpay's account/go-live requirements.

If the Razorpay environment variables are missing, the API deliberately refuses to start a Razorpay order. Existing UPI QR, WhatsApp, and COD options remain available. Coupon verification uses live product prices and coupon rules; the final order revalidates the coupon again.
