package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v76"
	portalsession "github.com/stripe/stripe-go/v76/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v76/checkout/session"
	stripesubscription "github.com/stripe/stripe-go/v76/subscription"
	"github.com/stripe/stripe-go/v76/webhook"
	"github.com/truvis/competitor-tracker/backend/config"
)

func CreateCheckoutSession(db *sql.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		email := c.GetString("email")

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		stripe.Key = cfg.StripeSecretKey

		var req struct {
			Plan string `json:"plan"`
		}
		_ = c.ShouldBindJSON(&req)

		var priceID string
		var planType string = "pro" // Default to pro if nothing specified

		if req.Plan != "" {
			planType = req.Plan
		}

		err := db.QueryRow("SELECT stripe_price_id FROM plans WHERE plan_type = $1", planType).Scan(&priceID)

		if err != nil || priceID == "" || priceID == "price_pro_replace_me" {
			// Fallback/mock for dev if config is empty
			priceID = "price_mock123"
			log.Printf("Warning: No valid price ID found in DB for plan %s, using mock priceID: %v", planType, err)
		}

		// If you have a separate frontend port:
		// domain = "http://localhost:20910"
		// Ideally from config.AllowedOrigins or an explicit BASE_URL

		params := &stripe.CheckoutSessionParams{
			PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
			Mode:               stripe.String(string(stripe.CheckoutSessionModeSubscription)),
			LineItems: []*stripe.CheckoutSessionLineItemParams{
				{
					Price:    stripe.String(priceID),
					Quantity: stripe.Int64(1),
				},
			},
			SuccessURL:        stripe.String(cfg.FrontendURL + "/dashboard?session_id={CHECKOUT_SESSION_ID}"),
			CancelURL:         stripe.String(cfg.FrontendURL + "/dashboard"),
			CustomerEmail:     stripe.String(email),
			ClientReferenceID: stripe.String(userID),
			Metadata: map[string]string{
				"saas_id":   cfg.StripeSaaSID,
				"plan_type": planType,
				"user_id":   userID,
			},
			SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
				Metadata: map[string]string{
					"saas_id":   cfg.StripeSaaSID,
					"plan_type": planType,
					"user_id":   userID,
				},
			},
		}

		s, err := checkoutsession.New(params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout session"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": s.URL})
	}
}

func CreateCustomerPortalSession(db *sql.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var customerID sql.NullString
		err := db.QueryRow("SELECT stripe_customer_id FROM users WHERE id = $1", userID).Scan(&customerID)
		if err != nil || !customerID.Valid || customerID.String == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No active subscription/customer found."})
			return
		}

		stripe.Key = cfg.StripeSecretKey

		params := &stripe.BillingPortalSessionParams{
			Customer:  stripe.String(customerID.String),
			ReturnURL: stripe.String(cfg.FrontendURL + "/subscription"),
		}

		s, err := portalsession.New(params)
		if err != nil {
			log.Printf("Failed to create portal session: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create portal session"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": s.URL})
	}
}

func StripeWebhook(db *sql.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		const MaxBodyBytes = int64(65536)
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)
		payload, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Error reading request body"})
			return
		}

		event, err := webhook.ConstructEventWithOptions(
			payload,
			c.GetHeader("Stripe-Signature"),
			cfg.StripeWebhookSecret,
			webhook.ConstructEventOptions{
				IgnoreAPIVersionMismatch: true,
			},
		)

		switch event.Type {
		case "checkout.session.completed":
			var session stripe.CheckoutSession
			err := json.Unmarshal(event.Data.Raw, &session)
			if err != nil {
				log.Printf("Error parsing webhook JSON: %v", err)
				c.Status(http.StatusBadRequest)
				return
			}

			handleCheckoutSessionCompleted(db, cfg, session)

		case "customer.subscription.deleted", "customer.subscription.updated":
			var subscription stripe.Subscription
			err := json.Unmarshal(event.Data.Raw, &subscription)
			if err != nil {
				log.Printf("Error parsing webhook JSON: %v", err)
				c.Status(http.StatusBadRequest)
				return
			}

			handleSubscriptionChange(db, cfg, subscription)
		}

		c.Status(http.StatusOK)
	}
}

func handleCheckoutSessionCompleted(db *sql.DB, cfg config.Config, sess stripe.CheckoutSession) {
	userID := sess.ClientReferenceID
	if userID == "" {
		log.Println("Webhook: no client_reference_id found")
		return
	}

	planType := sess.Metadata["plan_type"]
	if planType == "" {
		planType = "pro"
	}

	newSubID := ""
	if sess.Subscription != nil {
		newSubID = sess.Subscription.ID
	}

	_, err := db.Exec(
		"UPDATE users SET stripe_customer_id = $1, subscription_active = TRUE, plan_type = $2, stripe_subscription_id = $3 WHERE id = $4",
		sess.Customer.ID, planType, newSubID, userID,
	)
	if err != nil {
		log.Printf("Error updating user subscription state: %v", err)
	}

	// Handle plan switch: cancel the old subscription
	switchMode := sess.Metadata["switch_mode"]
	oldSubID := sess.Metadata["old_subscription_id"]
	if oldSubID != "" && oldSubID != newSubID {
		switch switchMode {
		case "immediate":
			if _, err := stripesubscription.Cancel(oldSubID, nil); err != nil {
				log.Printf("Webhook: failed to cancel old subscription %s immediately: %v", oldSubID, err)
			} else {
				log.Printf("Webhook: cancelled old subscription %s immediately", oldSubID)
			}
		case "scheduled":
			if _, err := stripesubscription.Update(oldSubID, &stripe.SubscriptionParams{
				CancelAtPeriodEnd: stripe.Bool(true),
			}); err != nil {
				log.Printf("Webhook: failed to schedule cancellation of old subscription %s: %v", oldSubID, err)
			} else {
				log.Printf("Webhook: scheduled cancellation of old subscription %s at period end", oldSubID)
			}
		}
	}
}

func handleSubscriptionChange(db *sql.DB, cfg config.Config, subscription stripe.Subscription) {
	// Verify metadata contract
	if subscription.Metadata["saas_id"] != cfg.StripeSaaSID {
		log.Println("Webhook ignored: metadata saas_id mismatch or missing")
		return
	}

	isActive := subscription.Status == stripe.SubscriptionStatusActive || subscription.Status == stripe.SubscriptionStatusTrialing

	planType := subscription.Metadata["plan_type"]
	if planType == "" {
		planType = "free"
	}

	if !isActive {
		planType = "free"
	}

	periodEnd := time.Unix(subscription.CurrentPeriodEnd, 0)

	_, err := db.Exec(
		"UPDATE users SET subscription_active = $1, plan_type = $2, stripe_subscription_id = $3, subscription_period_end = $4 WHERE stripe_customer_id = $5",
		isActive, planType, subscription.ID, periodEnd, subscription.Customer.ID,
	)
	if err != nil {
		log.Printf("Error updating subscription status: %v", err)
	}
}

func GetCurrentSubscription(db *sql.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var subID sql.NullString
		var periodEnd sql.NullTime
		var planType string
		var active bool
		err := db.QueryRow(
			"SELECT subscription_active, plan_type, stripe_subscription_id, subscription_period_end FROM users WHERE id = $1",
			userID,
		).Scan(&active, &planType, &subID, &periodEnd)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscription"})
			return
		}

		var periodEndUnix int64
		if periodEnd.Valid {
			periodEndUnix = periodEnd.Time.Unix()
		}

		c.JSON(http.StatusOK, gin.H{
			"subscription_active": active,
			"plan_type":           planType,
			"subscription_id":     subID.String,
			"period_end":          periodEndUnix,
		})
	}
}

func SwitchPlan(db *sql.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		email := c.GetString("email")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var req struct {
			Plan      string `json:"plan"`
			Immediate bool   `json:"immediate"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Plan == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "plan is required"})
			return
		}

		stripe.Key = cfg.StripeSecretKey

		var priceID string
		err := db.QueryRow("SELECT stripe_price_id FROM plans WHERE plan_type = $1", req.Plan).Scan(&priceID)
		if err != nil || priceID == "" {
			priceID = "price_mock123"
			log.Printf("Warning: No valid price ID for plan %s: %v", req.Plan, err)
		}

		var currentSubID sql.NullString
		db.QueryRow("SELECT stripe_subscription_id FROM users WHERE id = $1", userID).Scan(&currentSubID)

		// Determine switch mode and trial end
		switchMode := "scheduled"
		if req.Immediate {
			switchMode = "immediate"
		}

		params := &stripe.CheckoutSessionParams{
			PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
			Mode:               stripe.String(string(stripe.CheckoutSessionModeSubscription)),
			LineItems: []*stripe.CheckoutSessionLineItemParams{
				{
					Price:    stripe.String(priceID),
					Quantity: stripe.Int64(1),
				},
			},
			SuccessURL:        stripe.String(cfg.FrontendURL + "/subscription?switch=success"),
			CancelURL:         stripe.String(cfg.FrontendURL + "/subscription"),
			CustomerEmail:     stripe.String(email),
			ClientReferenceID: stripe.String(userID),
			Metadata: map[string]string{
				"saas_id":             cfg.StripeSaaSID,
				"plan_type":           req.Plan,
				"user_id":             userID,
				"switch_mode":         switchMode,
				"old_subscription_id": currentSubID.String,
			},
			SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
				Metadata: map[string]string{
					"saas_id":   cfg.StripeSaaSID,
					"plan_type": req.Plan,
					"user_id":   userID,
				},
			},
		}

		// For scheduled switch: start new plan at the end of the current billing period
		if !req.Immediate && currentSubID.Valid && currentSubID.String != "" {
			sub, err := stripesubscription.Get(currentSubID.String, nil)
			if err == nil && sub.CurrentPeriodEnd > 0 {
				params.SubscriptionData.TrialEnd = stripe.Int64(sub.CurrentPeriodEnd)
				log.Printf("SwitchPlan: scheduling new %s plan to start at %v (sub %s)", req.Plan, time.Unix(sub.CurrentPeriodEnd, 0), currentSubID.String)
			}
		}

		s, err := checkoutsession.New(params)
		if err != nil {
			log.Printf("SwitchPlan: failed to create checkout session: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create switch checkout session"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": s.URL})
	}
}
