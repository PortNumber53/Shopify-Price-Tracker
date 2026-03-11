package config

import (
	"os"
)

type Config struct {
	Port                string
	GinMode             string
	DatabaseURL         string
	StripeSecretKey     string
	StripeWebhookSecret string
	StripeWebhookURLPath string
	StripeSaaSID         string
	StripePlanType       string
	AllowedOrigins       string
}

func LoadConfig() Config {
	return Config{
		Port:                getEnv("PORT", "20911"),
		GinMode:             getEnv("GIN_MODE", "debug"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/shopify_price_tracker?sslmode=disable"),
		StripeSecretKey:     getEnv("STRIPE_SECRET_KEY", "sk_test_replace_me"),
		StripeWebhookSecret:  getEnv("STRIPE_WEBHOOK_SECRET", "whsec_replace_me"),
		StripeWebhookURLPath: getEnv("STRIPE_WEBHOOK_URL_PATH", "/api/stripe/webhook"),
		StripeSaaSID:         getEnv("STRIPE_METADATA_SAAS_ID", "shopify_price_tracker"),
		StripePlanType:       getEnv("STRIPE_DEFAULT_PLAN_TYPE", "base"),
		AllowedOrigins:      getEnv("ALLOWED_ORIGINS", "*"),
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
