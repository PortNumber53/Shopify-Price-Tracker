# **Product Requirements Document (PRD)**

## **1\. Project Overview**

**Product Name:** Competitor Price Tracker (CPT)

**Problem:** Small e-commerce (Shopify) sellers manually check competitor prices daily because enterprise tools are too expensive ($200+/mo).

**Solution:** A lean SaaS that allows users to paste up to 10 URLs and receive automated alerts (email/browser) when prices change.

---

## **2\. Target Audience**

* **User Persona:** Small to medium-sized Shopify store owners.  
* **Core Need:** Simple, automated monitoring of specific competitor product pages without the bloat or cost of enterprise market intelligence suites.

---

## **3\. Product Features**

### **3.1. User Authentication**

* **Sign-up/Login:** Standard Email and Password authentication.  
* **Account Management:** Ability to reset passwords and manage subscription status.

### **3.2. URL Management (The "Watcher" Dashboard)**

* **Input:** A simple interface to "Paste URL" (Limited to 10 URLs on the base plan).  
* **Validation:** System validates that the URL is reachable.  
* **Labeling:** Users can assign a "Product Name" to each URL for easy tracking.  
* **Status:** Display the "Last Checked Price" and "Current Price" for each entry.

### **3.3. Price Scraping Engine (Playwright)**

* **Frequency:** Automated daily checks for all active URLs.  
* **Engine:** Uses **Playwright** to handle JavaScript-heavy pages (standard for modern Shopify themes).  
* **Data Extraction:** Targeted extraction of price elements (looking for itemprop="price", common CSS classes, or JSON-LD data).

### **3.4. Alerts & Notifications**

* **Trigger:** Notification sent only when Current Price \!= Last Saved Price.  
* **Delivery:** Initial version will support **Email Alerts**.  
* **History:** A simple log showing the price history for the last 30 days.

### **3.5. Billing & Subscriptions (Stripe)**

* **Integration:** **Stripe Checkout** for handling payments.  
* **Plans:** Simple monthly subscription (e.g., $19/mo).  
* **Gating:** Access to the tracking dashboard is restricted until an active subscription is detected.

### **3.6. Stripe Product & Price Sync**

* **Two-way sync scope:** Keep Stripe Products/Prices and our internal plans in parity (create/update both directions). No auto-deletes; flag discrepancies for manual review.
* **Metadata contract:** All Stripe objects we create must include metadata `{"saas_id":"competitor_tracker"}` and a `plan_type` that matches our PostgreSQL `plans.plan_type` value. Reject/ignore external objects lacking matching metadata to avoid cross-app pollution in the shared Stripe account.
* **Inbound reconciliation:** When reading from Stripe, filter by `metadata.saas_id` and map `metadata.plan_type` to our local plan record. Unknown `plan_type` -> quarantine queue + alert; do not attach to users.
* **Outbound mapping:** When creating/updating Products/Prices from our app, set the metadata fields above and store the resulting Stripe IDs on our plans table for idempotency.
* **Change detection:** Poll Stripe (or use webhooks) to detect external edits; update local records when metadata matches, otherwise ignore.
* **Safety rails:** Never overwrite Price amounts on Stripe if `metadata.saas_id` is missing or different; log and alert.

---

## **4\. Technical Stack**

| Component | Technology |
| :---- | :---- |
| **Backend** | **Go (Golang) + Gin** \- High performance API, hot-reloaded locally with **air**. |
| **Frontend** | **React (Vite)** deployed to **Cloudflare Workers**; local dev via Vite. |
| **Database** | **PostgreSQL** \- Stores user accounts, URLs, and price history logs. |
| **Scraper** | **Playwright** (Python or Node.js worker) \- To bypass JS-rendered content. |
| **Payments** | **Stripe** \- Subscription management and billing. |

**Stripe integration notes:** Shared Stripe account; rely on metadata (`saas_id`, `plan_type`) to isolate CPT data. Use Stripe webhooks for reliability; fall back to polling for missed events.

**Repo layout:** `frontend/` (Vite + React + Cloudflare Worker wrapper), `backend/` (Go + Gin + air), `docs/` (PRD), root-level `_env.example`.

---

## **5\. Database Schema (High-Level)**

### **Users Table**

* id (UUID)  
* email (String, Unique)  
* password\_hash (String)  
* stripe\_customer\_id (String)  
* subscription\_active (Boolean)

### **Plans Table**

* id (UUID)
* plan_type (String, unique)
* stripe_product_id (String)
* stripe_price_id (String)
* price_cents (Integer)
* currency (String)
* active (Boolean)

### **Tracked\_URLs Table**

* id (UUID)  
* user\_id (FK to Users)  
* product\_name (String)  
* url (Text)  
* last\_price (Decimal)  
* created\_at (Timestamp)

### **Price\_Logs Table**

* id (UUID)  
* url\_id (FK to Tracked\_URLs)  
* price (Decimal)  
* checked\_at (Timestamp)

---

## **6\. Environments & Runtime Config**

* **Dev servers (bind all interfaces):** Vite `0.0.0.0:20910`, Go API `0.0.0.0:20911`, Wrangler preview `0.0.0.0:20912` (behind local reverse proxy).
* **Backend config file:** `/etc/api-competitor-tracker.truvis.co/config.ini`
* **Backend binary target (deploy):** `/var/www/vhosts/api-competitor-tracker.truvis.co/bin`
* **Backend logs directory:** `/var/www/vhosts/api-competitor-tracker.truvis.co/logs`
* **Stripe metadata contract:** `{"saas_id":"competitor_tracker"}`, `plan_type` (matches `plans.plan_type`).
* **Cloudflare deploy:** uses `CLOUDFLARE_API_TOKEN` secret via Wrangler; Worker name `competitor-tracker-frontend`.
* **CI/CD:** Jenkins can SSH as `grimlock@web1` to deploy Go backend to the paths above.

---

## **7\. Success Metrics**

* **Time to Alert:** Notifications should be sent within 10 minutes of a price change detection.  
* **Scrape Success Rate:** >95% success rate on common Shopify-based domains.  
* **Churn Rate:** Aim for low churn by maintaining a price point significantly lower than enterprise competitors.
* **Stripe Sync Health:** <0.5% mismatched plan records between Stripe (filtered by `saas_id`) and local DB; zero incidents of cross-app object updates.
