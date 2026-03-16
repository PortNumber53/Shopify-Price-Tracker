package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/truvis/competitor-tracker/backend/config"
	"github.com/truvis/competitor-tracker/backend/db"
	"github.com/truvis/competitor-tracker/backend/handlers"
	"github.com/truvis/competitor-tracker/backend/middleware"
	"github.com/truvis/competitor-tracker/backend/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No local .env file found, trying parent directory ...")
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("No parent ../.env file found, falling back to ../_env.example or environment variables")
			_ = godotenv.Load("../_env.example")
		}
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
	// Protected URL routes
	urlRoutes := r.Group("/api/urls")
	urlRoutes.Use(middleware.AuthMiddleware())
	{
		urlRoutes.POST("", handlers.AddURL(database))
		urlRoutes.GET("", handlers.GetURLs(database))
		urlRoutes.DELETE("/:id", handlers.DeleteURL(database))
		urlRoutes.GET("/:id/history", handlers.GetURLHistory(database))
		urlRoutes.POST("/sync", handlers.SyncURLs(database, cfg))
	}

	// Protected Auth routes
	protectedAuthRoutes := r.Group("/api/auth")
	protectedAuthRoutes.Use(middleware.AuthMiddleware())
	{
		protectedAuthRoutes.GET("/me", handlers.Me(database))
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
		stripeAuth.GET("/subscription", handlers.GetCurrentSubscription(database, cfg))
		stripeAuth.POST("/switch-plan", handlers.SwitchPlan(database, cfg))
	}

	// Start Background Workers
	services.StartTwoWaySyncWorker(database, cfg)
	services.StartScraperWorker(database, cfg)

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
