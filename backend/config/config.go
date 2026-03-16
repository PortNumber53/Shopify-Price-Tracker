package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                 string
	GinMode              string
	DatabaseURL          string
	StripeSecretKey      string
	StripeWebhookSecret  string
	StripeWebhookURLPath string
	StripeSaaSID         string
	StripePlanType       string
	FrontendURL          string
	AllowedOrigins       string
	OpenAIApiKey         string
	LlmProvider          string
	OpenRouterApiKey     string
	NvidiaApiKey         string
	LlmModel             string
	MaxTokens            int
	Temperature          float32
}

func LoadConfig() Config {
	return Config{
		Port:                 getEnv("PORT", "20911"),
		GinMode:              getEnv("GIN_MODE", "debug"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/competitor_tracker?sslmode=disable"),
		StripeSecretKey:      getEnv("STRIPE_SECRET_KEY", "sk_test_replace_me"),
		StripeWebhookSecret:  getEnv("STRIPE_WEBHOOK_SECRET", "whsec_replace_me"),
		StripeWebhookURLPath: getEnv("STRIPE_WEBHOOK_URL_PATH", "/api/stripe/webhook"),
		StripeSaaSID:         getEnv("STRIPE_METADATA_SAAS_ID", "competitor_tracker"),
		StripePlanType:       getEnv("STRIPE_DEFAULT_PLAN_TYPE", "base"),
		FrontendURL:          getEnv("FRONTEND_URL", "http://localhost:20910"),
		AllowedOrigins:       getEnv("ALLOWED_ORIGINS", "*"),
		OpenAIApiKey:         getEnv("OPENAI_API_KEY", ""),
		LlmProvider:          getEnv("LLM_PROVIDER", "openai"),
		OpenRouterApiKey:     getEnv("OPENROUTER_API_KEY", ""),
		NvidiaApiKey:         getEnv("NVIDIA_API_KEY", ""),
		LlmModel:             getEnv("MODEL", "gpt-4o-mini"),
		MaxTokens:            getEnvAsInt("MAX_TOKENS", 1024),
		Temperature:          getEnvAsFloat32("TEMPERATURE", 0.0),
	}
}

func getEnvAsInt(key string, defaultVal int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultVal
}

func getEnvAsFloat32(key string, defaultVal float32) float32 {
	if value, exists := os.LookupEnv(key); exists {
		if floatVal, err := strconv.ParseFloat(value, 32); err == nil {
			return float32(floatVal)
		}
	}
	return defaultVal
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
