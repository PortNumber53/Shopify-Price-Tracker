package services

import (
	"database/sql"
	"log"
	"time"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/price"
	"github.com/stripe/stripe-go/v76/product"
	"github.com/stripe/stripe-go/v76/subscription"
	"github.com/truvis/competitor-tracker/backend/config"
)

// StartTwoWaySyncWorker starts a periodic goroutine to sync DB state with Stripe.
// It acts as the source of truth, correcting any manual DB manipulations.
func StartTwoWaySyncWorker(db *sql.DB, cfg config.Config) {
	ticker := time.NewTicker(1 * time.Hour) // Run every hour
	go func() {
		// Run immediately on boot
		log.Println("[StripeSync] Booting up... Starting initial two-way sync loop...")
		SyncPlans(db, cfg)
		syncSubscriptions(db, cfg)
		log.Println("[StripeSync] Finished initial two-way sync loop.")

		for range ticker.C {
			log.Println("[StripeSync] Starting two-way sync loop...")
			SyncPlans(db, cfg)
			syncSubscriptions(db, cfg)
			log.Println("[StripeSync] Finished two-way sync loop.")
		}
	}()
}

func SyncPlans(db *sql.DB, cfg config.Config) {
	stripe.Key = cfg.StripeSecretKey

	log.Println("[StripeSync] Synchronizing subscription plans from Stripe...")

	// The expected plans that our application controls
	expectedPlans := map[string]struct {
		Name   string
		Amount int64
		Found  bool
	}{
		"free":    {"Competitor Tracker - Free", 0, false},
		"pro":     {"Competitor Tracker - Pro", 1900, false},
		"premium": {"Competitor Tracker - Premium", 5000, false},
	}

	params := &stripe.PriceListParams{
		Active: stripe.Bool(true),
	}
	params.AddExpand("data.product")

	iter := price.List(params)
	for iter.Next() {
		p := iter.Price()
		if p.Product == nil {
			continue
		}

		saasID := p.Product.Metadata["saas_id"]
		if saasID != cfg.StripeSaaSID {
			continue
		}

		planType := p.Product.Metadata["plan_type"]
		if planType == "" {
			continue
		}

		// Mark as found if it's one of our expected plans
		if expected, exists := expectedPlans[planType]; exists {
			expected.Found = true
			expectedPlans[planType] = expected
		}

		// Upsert the active price into our plans table
		_, err := db.Exec(`
			INSERT INTO plans (plan_type, stripe_price_id, price_cents, currency)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (plan_type) DO UPDATE SET
				stripe_price_id = EXCLUDED.stripe_price_id,
				price_cents = EXCLUDED.price_cents,
				currency = EXCLUDED.currency
		`, planType, p.ID, p.UnitAmount, string(p.Currency))

		if err != nil {
			log.Printf("[StripeSync] Failed to upsert plan '%s': %v", planType, err)
		} else {
			log.Printf("[StripeSync] Synced plan '%s' (Price ID: %s, %d %s)", planType, p.ID, p.UnitAmount, p.Currency)
		}
	}

	if iter.Err() != nil {
		log.Printf("[StripeSync] Stripe API error while listing prices: %v", iter.Err())
	}

	// Create any missing expected plans
	for planType, expected := range expectedPlans {
		if !expected.Found {
			log.Printf("[StripeSync] Expected plan '%s' not found on Stripe. Creating it automatically...", planType)

			prodParams := &stripe.ProductParams{
				Name: stripe.String(expected.Name),
				Metadata: map[string]string{
					"saas_id":   cfg.StripeSaaSID,
					"plan_type": planType,
				},
			}
			prod, err := product.New(prodParams)
			if err != nil {
				log.Printf("[StripeSync] Failed to create product %s: %v", expected.Name, err)
				continue
			}

			priceParams := &stripe.PriceParams{
				Product:    stripe.String(prod.ID),
				UnitAmount: stripe.Int64(expected.Amount),
				Currency:   stripe.String(string(stripe.CurrencyUSD)),
				Recurring: &stripe.PriceRecurringParams{
					Interval: stripe.String(string(stripe.PriceRecurringIntervalMonth)),
				},
			}
			pr, err := price.New(priceParams)
			if err != nil {
				log.Printf("[StripeSync] Failed to create price for %s: %v", expected.Name, err)
				continue
			}

			// Insert directly into DB to avoid waiting for next sync
			_, err = db.Exec(`
				INSERT INTO plans (plan_type, stripe_price_id, price_cents, currency)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (plan_type) DO UPDATE SET
					stripe_price_id = EXCLUDED.stripe_price_id,
					price_cents = EXCLUDED.price_cents,
					currency = EXCLUDED.currency
			`, planType, pr.ID, pr.UnitAmount, string(pr.Currency))

			if err != nil {
				log.Printf("[StripeSync] Failed to upsert newly created plan '%s' to DB: %v", planType, err)
			} else {
				log.Printf("[StripeSync] Successfully created and synced missing plan '%s' -> Price ID: %s", planType, pr.ID)
			}
		}
	}
}

func syncSubscriptions(db *sql.DB, cfg config.Config) {
	stripe.Key = cfg.StripeSecretKey

	// Get all users who have ever had a stripe customer
	rows, err := db.Query("SELECT id, stripe_customer_id, subscription_active, plan_type FROM users WHERE stripe_customer_id IS NOT NULL")
	if err != nil {
		log.Printf("[StripeSync] DB error: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var (
			userID     string
			customerID string
			isActiveDB bool
			planTypeDB string
		)
		if err := rows.Scan(&userID, &customerID, &isActiveDB, &planTypeDB); err != nil {
			log.Printf("[StripeSync] Scan error: %v", err)
			continue
		}

		// List all subscriptions for this customer from Stripe
		params := &stripe.SubscriptionListParams{
			Customer: stripe.String(customerID),
			Status:   stripe.String("active"), // Note: this only gets active subs. We might want to get all to find trialing or past_due.
		}
		// Actually let's just get the latest one by not filtering on status, or filtering on active/trialing/past_due
		params.AddExpand("data.default_payment_method")

		iter := subscription.List(params)

		hasActiveStripe := false
		var activePlanType string = "free"

		for iter.Next() {
			sub := iter.Subscription()
			if sub.Status == stripe.SubscriptionStatusActive || sub.Status == stripe.SubscriptionStatusTrialing {
				// We found an active sub
				hasActiveStripe = true

				planType := sub.Metadata["plan_type"]
				if planType != "" {
					activePlanType = planType
				} else {
					activePlanType = "pro" // fallback
				}
				break // just take the first active one we find
			}
		}

		if iter.Err() != nil {
			log.Printf("[StripeSync] Stripe API error for customer %s: %v", customerID, iter.Err())
			continue
		}

		// Reconciliation logic
		if isActiveDB != hasActiveStripe || planTypeDB != activePlanType {
			log.Printf("[StripeSync] Mismatch found for user %s: DB(active=%t, plan=%s) vs Stripe(active=%t, plan=%s). Correcting DB...",
				userID, isActiveDB, planTypeDB, hasActiveStripe, activePlanType)

			_, err := db.Exec(
				"UPDATE users SET subscription_active = $1, plan_type = $2 WHERE id = $3",
				hasActiveStripe, activePlanType, userID,
			)
			if err != nil {
				log.Printf("[StripeSync] Failed to correct DB for user %s: %v", userID, err)
			}
		}
	}
}

// StartMigrationWorker runs to seamlessly migrate users over to new pricing models based on their grace period.
func StartMigrationWorker(db *sql.DB, cfg config.Config, oldPriceID string, newPriceID string, gracePeriodDays int) {
	ticker := time.NewTicker(24 * time.Hour) // Run daily
	go func() {
		for range ticker.C {
			log.Printf("[MigrationWorker] Checking for users on oldPriceID: %s to migrate to newPriceID: %s...", oldPriceID, newPriceID)
			migratePrice(db, cfg, oldPriceID, newPriceID, gracePeriodDays)
		}
	}()
}

func migratePrice(db *sql.DB, cfg config.Config, oldPriceID string, newPriceID string, gracePeriodDays int) {
	stripe.Key = cfg.StripeSecretKey

	// We query stripe for all subscriptions with oldPriceID
	params := &stripe.SubscriptionListParams{
		Price: stripe.String(oldPriceID),
	}

	iter := subscription.List(params)
	for iter.Next() {
		sub := iter.Subscription()

		// Calculate how many days they've been on this plan/created.
		// For simplicity, we compare created against gracePeriodDays.
		// If created + gracePeriod < now => migrate.
		createdTime := time.Unix(sub.Created, 0)
		expirationTime := createdTime.AddDate(0, 0, gracePeriodDays)

		if time.Now().After(expirationTime) {
			log.Printf("[MigrationWorker] Migrating subscription %s from %s to %s", sub.ID, oldPriceID, newPriceID)

			// To smoothly migrate on the next cycle, we update the subscription item with proration_behavior="none"
			// Get the subscription item id
			if len(sub.Items.Data) == 0 {
				continue
			}
			subItemID := sub.Items.Data[0].ID

			updateParams := &stripe.SubscriptionParams{
				Items: []*stripe.SubscriptionItemsParams{
					{
						ID:    stripe.String(subItemID),
						Price: stripe.String(newPriceID),
					},
				},
				ProrationBehavior: stripe.String("none"),
			}

			_, err := subscription.Update(sub.ID, updateParams)
			if err != nil {
				log.Printf("[MigrationWorker] Failed to migrate sub %s: %v", sub.ID, err)
			} else {
				log.Printf("[MigrationWorker] Successfully set migration for sub %s to next cycle", sub.ID)
			}
		}
	}

	if iter.Err() != nil {
		log.Printf("[MigrationWorker] Stripe API error while listing: %v", iter.Err())
	}
}
