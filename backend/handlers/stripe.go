package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v76"
	portalsession "github.com/stripe/stripe-go/v76/billingportal/session"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/webhook"
	"github.com/truvis/shopify-price-tracker/backend/config"
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
			SuccessURL: stripe.String("http://localhost:20910/dashboard?session_id={CHECKOUT_SESSION_ID}"),
			CancelURL:  stripe.String("http://localhost:20910/dashboard"),
			CustomerEmail: stripe.String(email),
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

		s, err := session.New(params)
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
			ReturnURL: stripe.String("http://localhost:20910/subscription"),
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

func handleCheckoutSessionCompleted(db *sql.DB, cfg config.Config, session stripe.CheckoutSession) {
	userID := session.ClientReferenceID
	if userID == "" {
		log.Println("Webhook: no client_reference_id found")
		return
	}

	planType := session.Metadata["plan_type"]
	if planType == "" {
		planType = "pro" // fallback if somehow missing
	}

	// Update the user record
	_, err := db.Exec(
		"UPDATE users SET stripe_customer_id = $1, subscription_active = TRUE, plan_type = $2 WHERE id = $3",
		session.Customer.ID, planType, userID,
	)
	if err != nil {
		log.Printf("Error updating user subscription state: %v", err)
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

	_, err := db.Exec(
		"UPDATE users SET subscription_active = $1, plan_type = $2 WHERE stripe_customer_id = $3",
		isActive, planType, subscription.Customer.ID,
	)
	if err != nil {
		log.Printf("Error updating subscription status: %v", err)
	}
}
