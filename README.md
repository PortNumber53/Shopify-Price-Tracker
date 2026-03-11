# Shopify-Price-Tracker

## Dev servers & ports

- **Frontend (Vite + React):** `npm run dev` in `frontend/` listens on **0.0.0.0:20910** (preview uses the same host/port).
- **Cloudflare Worker preview (Wrangler):** `npm run deploy` or `wrangler dev` uses **0.0.0.0:20912** for local preview.
- **Backend (Go + Gin + air):** to be added in `backend/`, must listen on **0.0.0.0:20911** for reverse-proxy compatibility.

## Deployment notes

- **Frontend:** Deploy via Cloudflare Workers using Wrangler. Requires `CLOUDFLARE_API_TOKEN` secret (see `_env.example`).
- **Backend:** Jenkins deploys over SSH to `grimlock@web1`. Go binary target: `/var/www/vhosts/api-shopfiy-price-tracker.truvis.co/bin`. Logs directory: `/var/www/vhosts/api-shopfiy-price-tracker.truvis.co/logs`. Configuration file path: `/etc/api-shopfiy-price-tracker.truvis.co/config.ini`.

## Environment

See `_env.example` for required variables (frontend, backend, Cloudflare, deploy paths, Stripe keys, database).
