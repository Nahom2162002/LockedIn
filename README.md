# 🔒 LockedIn

**Your digital detox for increased productivity.**

LockedIn is a Chrome extension SaaS that blocks distracting websites during user-defined time windows. Built with a full-stack Next.js backend, Stripe billing, and a web dashboard for tracking focus stats.

🌐 **Live:** [deeplockin.com](https://deeplockin.com)

---

## Features

### Free

- Block up to 3 websites with custom date and time restrictions
- Instant blocking via Chrome Manifest V3 background service worker

### Pro ($7/month)

- Unlimited website blocking
- Recurring schedules (e.g. block YouTube every weekday 9am–5pm)
- Category blocking (Social Media, Gaming, News, etc. in one click)
- Stats dashboard — focus time, streaks, and top distractions
- Strict mode — confirmation phrase required to disable blocks
- Cross-device sync
- Password-protected disable
- 14-day free trial, no credit card required

---

## Tech Stack

### Chrome Extension

- React + TypeScript
- Vite
- Chrome Manifest V3
- Background service worker for navigation interception

### Backend

- Next.js (App Router) on Vercel
- MongoDB Atlas + Mongoose
- JWT authentication with bcrypt
- Stripe billing — subscriptions, webhooks, customer portal
- Resend — transactional email

---

## Architecture

LockedIn/            ← Chrome extension (React + Vite)
src/                 ← Popup UI components
public/
background.js        ← MV3 service worker (blocking logic)
manifest.json
lockedin-web/        ← Next.js backend + web dashboard (Vercel)
app/
api/
auth/                ← register, login, forgot/reset password
websites/            ← CRUD for blocked sites
recurring/           ← recurring block schedules
stripe/              ← checkout, webhook, portal, status
user/                ← plan, settings, me, stats
category-block/      ← bulk category blocking
dashboard/           ← stats dashboard page
models/              ← Mongoose schemas (User, Website, RecurringBlock, BlockEvent)
lib/                 ← mongodb, auth, stripe helpers

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Stripe account
- Resend account
- Chrome browser

### Backend Setup

```bash
cd lockedin-web
npm install
```

Create `.env.local`:

MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
RESEND_API_KEY=your-resend-api-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

```bash
npm run dev
```

### Extension Setup

```bash
cd LockedIn
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/ or build/` folder

---

## Stripe Webhook Events

The following events are handled:

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Set plan to `pro` (trial start) |
| `invoice.paid` | Set plan to `pro` |
| `customer.subscription.updated` | Update `cancelAtPeriodEnd` status |
| `customer.subscription.deleted` | Set plan to `free` |

---

## Deployment

- **Backend:** Vercel (auto-deploys from GitHub)
- **Extension:** Chrome Web Store
- **Database:** MongoDB Atlas
- **Domain:** Namecheap → Vercel

---

## License

MIT