package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/truvis/shopify-price-tracker/backend/config"
	"github.com/truvis/shopify-price-tracker/backend/db"
	"github.com/truvis/shopify-price-tracker/backend/handlers"
	"github.com/truvis/shopify-price-tracker/backend/middleware"
	"github.com/truvis/shopify-price-tracker/backend/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../_env.example"); err != nil {
		log.Println("No _env.example file found or error loading, relying on environment variables")
	}

	cfg := config.LoadConfig()

	// Initialize Database
	database := db.InitDB(cfg.DatabaseURL)
	defer database.Close()

	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS Configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(corsConfig))

	// Add Trusted Proxies
	r.SetTrustedProxies([]string{
		"shopify-price-tracker14.dev.portnumber53.com",
		"shopify-price-tracker164.dev.portnumber53.com",
	})

	// Setup routes
	r.POST("/api/auth/signup", handlers.Signup(database))
	r.POST("/api/auth/login", handlers.Login(database))

	// Protected routes
	authRoutes := r.Group("/api/urls")
	authRoutes.Use(middleware.AuthMiddleware())
	{
		authRoutes.POST("", handlers.AddURL(database))
		authRoutes.GET("", handlers.GetURLs(database))
		authRoutes.DELETE("/:id", handlers.DeleteURL(database))
		authRoutes.GET("/:id/history", handlers.GetURLHistory(database))
	}

	// Stripe routes
	webhookPath := cfg.StripeWebhookURLPath
	if webhookPath == "" {
		webhookPath = "/api/stripe/webhook"
	}
	r.POST(webhookPath, handlers.StripeWebhook(database, cfg))
	
	stripeAuth := r.Group("/api/stripe")
	stripeAuth.Use(middleware.AuthMiddleware())
	{
		stripeAuth.POST("/checkout", handlers.CreateCheckoutSession(database, cfg))
		stripeAuth.POST("/portal", handlers.CreateCustomerPortalSession(database, cfg))
	}

	// Start Background Workers
	services.StartTwoWaySyncWorker(database, cfg)

	// Example migration: migrating from old "pro" to new "premium" after 30 days
	// services.StartMigrationWorker(database, cfg, "old_price_id", cfg.StripePricePremium, 30)

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run("0.0.0.0:" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
