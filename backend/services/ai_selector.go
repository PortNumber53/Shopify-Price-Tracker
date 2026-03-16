package services

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/sashabaranov/go-openai"
	"github.com/truvis/competitor-tracker/backend/config"
)

// ExtractPriceViaAI queries an LLM to find the exact price from the provided Markdown
func ExtractPriceViaAI(cfg config.Config, domain, markdownContent string) (*float64, error) {
	// Truncate the markdown if it's absurdly large, though Markdown should be much smaller than HTML
	maxLen := 100000
	if len(markdownContent) > maxLen {
		markdownContent = markdownContent[:maxLen]
	}

	// If the content is suspiciously tiny it's probably an error/redirect page — skip early
	if len(strings.TrimSpace(markdownContent)) < 100 {
		return nil, fmt.Errorf("page content too short to contain a price (possible redirect or CAPTCHA)")
	}

	prompt := fmt.Sprintf(`Analyze the following Markdown extracted from an e-commerce product page hosted on '%s'.
Locate the main product's current retail price.
Return ONLY the raw numeric price. 
Do not include currency symbols, formatting, or extra text.
Example output: 1596.99

Markdown Snippet:
%s`, domain, markdownContent)

	performCall := func(provider, apiKey, baseURL, model string) (string, error) {
		clientConfig := openai.DefaultConfig(apiKey)
		if baseURL != "" {
			clientConfig.BaseURL = baseURL
		}
		client := openai.NewClientWithConfig(clientConfig)

		log.Printf("[AI Extraction] Prompting LLM (%s / %s) for domain: %s ...", provider, model, domain)

		resp, err := client.CreateChatCompletion(
			context.Background(),
			openai.ChatCompletionRequest{
				Model: model,
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    openai.ChatMessageRoleSystem,
						Content: "You are an expert web scraping AI. Your output must strictly be a raw float value.",
					},
					{
						Role:    openai.ChatMessageRoleUser,
						Content: prompt,
					},
				},
				Temperature: cfg.Temperature,
				MaxTokens:   cfg.MaxTokens,
			},
		)

		if err != nil {
			return "", err
		}

		priceText := strings.TrimSpace(resp.Choices[0].Message.Content)

		// Clean the LLM output aggressively
		priceText = strings.ReplaceAll(priceText, "`", "")
		priceText = strings.ReplaceAll(priceText, "$", "")
		priceText = strings.ReplaceAll(priceText, "€", "")
		priceText = strings.ReplaceAll(priceText, "£", "")
		priceText = strings.ReplaceAll(priceText, ",", "")
		priceText = strings.TrimSpace(priceText)

		return priceText, nil
	}

	var primaryProvider, primaryKey, primaryBaseURL, primaryModel string
	switch strings.ToLower(cfg.LlmProvider) {
	case "openrouter":
		primaryProvider = "openrouter"
		primaryKey = cfg.OpenRouterApiKey
		primaryBaseURL = "https://openrouter.ai/api/v1"
		primaryModel = cfg.LlmModel
	case "nvidia":
		primaryProvider = "nvidia"
		primaryKey = cfg.NvidiaApiKey
		primaryBaseURL = "https://integrate.api.nvidia.com/v1"
		primaryModel = cfg.LlmModel
	default:
		primaryProvider = "openai"
		primaryKey = cfg.OpenAIApiKey
		primaryBaseURL = ""
		primaryModel = cfg.LlmModel
	}

	if primaryKey == "" {
		return nil, fmt.Errorf("API key for provider %s is not configured", primaryProvider)
	}

	priceStr, err := performCall(primaryProvider, primaryKey, primaryBaseURL, primaryModel)
	if err != nil {
		log.Printf("[AI Extraction] Primary provider %s failed: %v", primaryProvider, err)

		// Fallback to nvidia if openrouter fails and key is available
		if primaryProvider == "openrouter" && cfg.NvidiaApiKey != "" {
			log.Printf("[AI Extraction] Falling back to nvidia provider...")
			fallbackModel := "meta/llama-3.1-8b-instruct"
			priceStr, err = performCall("nvidia", cfg.NvidiaApiKey, "https://integrate.api.nvidia.com/v1", fallbackModel)
		}
	}

	if err != nil {
		log.Printf("[AI Extraction] Exhausted LLM providers. Last error: %v", err)
		return nil, err
	}

	log.Printf("[AI Extraction] AI returned raw text: %s", priceStr)

	// Detect if the AI returned a CAPTCHA/error explanation instead of a price
	lowerPrice := strings.ToLower(priceStr)
	captchaKeywords := []string{"captcha", "snippet", "please provide", "i don't see", "i need to see", "not see any", "no price", "no information", "there is no"}
	for _, kw := range captchaKeywords {
		if strings.Contains(lowerPrice, kw) {
			log.Printf("[AI Extraction] AI indicated CAPTCHA or missing content for %s", domain)
			return nil, fmt.Errorf("AI detected CAPTCHA or blocked page for %s", domain)
		}
	}

	val, err := strconv.ParseFloat(priceStr, 64)
	if err != nil {
		log.Printf("[AI Extraction] Failed to parse AI output as float: %v", err)
		return nil, err
	}

	return &val, nil
}
