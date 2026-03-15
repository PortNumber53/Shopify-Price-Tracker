package services

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log"
	"net/url"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/truvis/shopify-price-tracker/backend/config"
)

type NodeOutput struct {
	Markdown string `json:"markdown"`
	Error    string `json:"error"`
}

var (
	// Regex for picking up itemprop="price" content
	priceMetaRegex = regexp.MustCompile(`itemprop="price"[^>]*content="([^"]+)"`)

	// Regex for picking up text with currency symbols
	priceTextRegex = regexp.MustCompile(`[\$€£]\s?(\d+(?:,\d{3})*(?:\.\d{2})?)`)
)

func StartScraperWorker(db *sql.DB, cfg config.Config) {
	ticker := time.NewTicker(24 * time.Hour) // Run daily
	go func() {
		for range ticker.C {
			log.Println("[Scraper] Starting scheduled scrape run...")
			TriggerScrape(db, cfg)
		}
	}()
}

// TriggerScrape runs the scrape job immediately. Can be called from API.
func TriggerScrape(db *sql.DB, cfg config.Config) error {
	log.Println("[Scraper] Running scrape job...")

	rows, err := db.Query("SELECT id, url, product_name, last_price FROM tracked_urls")
	if err != nil {
		log.Printf("[Scraper] DB error fetching URLs: %v", err)
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var id, lastPriceStr sql.NullString
		var url, productName string

		if err := rows.Scan(&id, &url, &productName, &lastPriceStr); err != nil {
			log.Printf("[Scraper] Row scan error: %v", err)
			continue
		}

		go scrapeURL(db, cfg, id.String, url, productName, lastPriceStr.String)
	}

	return nil
}

func scrapeURL(db *sql.DB, cfg config.Config, id, urlStr, productName, lastPriceStr string) {
	log.Printf("[Scraper] Scraping %s ...", urlStr)

	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		log.Printf("[Scraper] Invalid URL format %s: %v", urlStr, err)
		return
	}
	domain := parsedURL.Host
	domain = strings.TrimPrefix(domain, "www.")

	// Call our Node.js Playwright script to get the minified Markdown
	scriptPath := filepath.Join("..", "scraper", "fetch_markdown.js")
	cmd := exec.Command("node", scriptPath, urlStr)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		log.Printf("[Scraper] Playwright script failed for %s: %v. Stderr: %s", urlStr, err, stderr.String())
		return
	}

	var nodeOut NodeOutput
	if err := json.Unmarshal(stdout.Bytes(), &nodeOut); err != nil {
		log.Printf("[Scraper] Failed to parse JSON from Playwright for %s: %v", urlStr, err)
		return
	}

	if nodeOut.Error != "" {
		log.Printf("[Scraper] Playwright returned runtime error for %s: %s", urlStr, nodeOut.Error)
		return
	}

	markdownContent := nodeOut.Markdown

	// Extract the price directly using the LLM with the Markdown content
	extractedPrice, err := ExtractPriceViaAI(cfg, domain, markdownContent)
	if err != nil {
		log.Printf("[Scraper] AI Price Extraction failed for %s: %v", urlStr, err)

		// Fallback to basic regex on the Markdown string
		log.Printf("[Scraper] Falling back to Regex extraction for %s", urlStr)
		extractedPrice = extractPriceFromHTML(markdownContent)
	}

	if extractedPrice == nil {
		log.Printf("[Scraper] Could not extract price for %s using any method", urlStr)
		return
	}

	currentPrice := *extractedPrice
	log.Printf("[Scraper] Extracted price for %s: %.2f", productName, currentPrice)

	if currentPrice <= 0 {
		log.Printf("[Scraper] Extracted price is invalid (%.2f) for %s — stamping last_checked only", currentPrice, urlStr)
		_, err = db.Exec("UPDATE tracked_urls SET last_checked = NOW() WHERE id = $1", id)
		if err != nil {
			log.Printf("[Scraper] Failed to stamp last_checked for %s: %v", urlStr, err)
		}
		return
	}

	// Save to history
	_, err = db.Exec("INSERT INTO price_logs (url_id, price) VALUES ($1, $2)", id, currentPrice)
	if err != nil {
		log.Printf("[Scraper] Failed to save price log for %s: %v", urlStr, err)
	}

	var lastPrice float64
	if lastPriceStr != "" {
		if val, err := strconv.ParseFloat(lastPriceStr, 64); err == nil {
			lastPrice = val
		}
	}

	// Always stamp last_checked so the dashboard shows the real check time
	if lastPrice == 0 || lastPrice != currentPrice {
		log.Printf("[Scraper] Price change detected for %s: %.2f -> %.2f", productName, lastPrice, currentPrice)
		_, err = db.Exec("UPDATE tracked_urls SET last_price = $1, last_checked = NOW() WHERE id = $2", currentPrice, id)
	} else {
		_, err = db.Exec("UPDATE tracked_urls SET last_checked = NOW() WHERE id = $1", id)
	}
	if err != nil {
		log.Printf("[Scraper] Failed to update tracked_url for %s: %v", urlStr, err)
	}
}

func extractPriceFromHTML(html string) *float64 {
	// 1. Try itemprop="price"
	matches := priceMetaRegex.FindStringSubmatch(html)
	if len(matches) > 1 {
		val, err := parseFloatRelaxed(matches[1])
		if err == nil {
			return &val
		}
	}

	// 2. Try regex scanning for currency symbols
	matchesList := priceTextRegex.FindAllStringSubmatch(html, -1)
	for _, m := range matchesList {
		if len(m) > 1 {
			val, err := parseFloatRelaxed(m[1])
			if err == nil {
				// Return first plausible price found (basic heuristic)
				return &val
			}
		}
	}

	return nil
}

func parseFloatRelaxed(str string) (float64, error) {
	// Remove symbols and commas
	clean := strings.ReplaceAll(str, ",", "")
	clean = strings.ReplaceAll(clean, "$", "")
	clean = strings.ReplaceAll(clean, "€", "")
	clean = strings.ReplaceAll(clean, "£", "")
	return strconv.ParseFloat(strings.TrimSpace(clean), 64)
}
