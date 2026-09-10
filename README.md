# 🍄 Mushroom Mandi — India's Mushroom Marketplace

A clean, mobile-first marketplace connecting **mushroom buyers** with **mushroom sellers** across India.

**Live site:** https://job-paglu.github.io/mushroom/

## How it works

```
Seller submits form → Admin reviews → Admin approves → Listing goes LIVE → Buyer contacts seller directly
```

- **Buyers** browse 3 categories (🍄 Mushrooms · 🌱 Spawn · 🧱 Feed / Pellets / Substrate), search & filter by state/city, compare wholesale/retail rates (₹/KG), check delivery locations, and contact sellers directly (Call / WhatsApp / Email).
- **Sellers** submit via a simple 4-step form (max 3 products, 1–2 photos each, delivery locations). No payment, no commission.
- **Admin** reviews every submission in the Admin Panel before it becomes public.

## Roles & URLs

| Role | Where | Notes |
|------|-------|-------|
| Buyer | `/` (homepage) | Browse, search, filter, contact |
| Seller | `/#/sell` | Submission form (share this link with sellers) |
| Admin | `/#/admin` | Default password: `admin123` — **change it in Admin → Settings after first login** |

## Admin Panel features

- Dashboard stats (total sellers, pending, approved, rejected, products)
- Pending submissions → **Approve / Reject / Edit / Delete**
- Full edit of seller details, products, prices, delivery locations before/after approval
- Rename public categories (names + emoji icons)
- Configurable max-products-per-seller limit
- One-click JSON backup download

## Tech

- **100% static** — vanilla HTML/CSS/JS, zero build step, works on GitHub Pages
- **v1 data layer:** browser `localStorage` (great for demo/testing — data lives per browser)
- **v2 upgrade:** free Firebase (Firestore + Storage) makes data real & multi-device — see `js/firebase-config.js` for 5-minute setup instructions; the data layer switches automatically
- Product photos are auto-compressed (max 900px, JPEG) before saving

## Deployment (GitHub Pages)

This repo includes `.github/workflows/deploy-pages.yml` — every push to `main` auto-deploys to GitHub Pages. If Pages was never enabled, the workflow enables it automatically on first run.

Manual fallback: **Settings → Pages → Source: GitHub Actions** → re-run the workflow.

## Notes & honest limits (v1)

- No payments / cart / checkout / orders — this is a **discovery + direct-contact** marketplace by design.
- v1 stores data in the visitor's browser — seller submissions reach the admin only when submitted in the same browser (or after the Firebase upgrade). Admin can always back up data from Settings.
- Demo listings are pre-seeded so the site doesn't look empty; remove them from Admin → Dashboard → 🗑 (or "Reset demo data" in Settings).
