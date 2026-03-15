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

const (
	// Scheduler runs every 30 minutes to pick up due URLs.
	schedulerInterval = 30 * time.Minute

	// Max unique URLs scraped per scheduler tick to spread load.
	maxURLsPerTick = 15

	// Pause between individual URL scrapes within a single tick.
	scrapeDelay = 3 * time.Second

	// Per-plan check intervals.
	freePlanInterval    = 24 * time.Hour
	proPlanInterval     = 6 * time.Hour
	premiumPlanInterval = 1 * time.Hour
)

func StartScraperWorker(db *sql.DB, cfg config.Config) {
	go func() {
		// Run once immediately on startup to catch any due URLs.
		log.Println("[Scraper] Initial startup check...")
		TriggerScrape(db, cfg, false)

		ticker := time.NewTicker(schedulerInterval)
		for range ticker.C {
			log.Println("[Scraper] Scheduler tick — checking for due URLs...")
			TriggerScrape(db, cfg, false)
		}
	}()
}

// TriggerScrape scrapes URLs that are due based on user plan intervals.
// forceAll=true bypasses interval checks (used by manual sync).
func TriggerScrape(db *sql.DB, cfg config.Config, forceAll bool) error {
	log.Println("[Scraper] Running scrape job...")

	var (
		rows *sql.Rows
		err  error
	)

	if forceAll {
		// Manual sync: scrape all unique URLs regardless of last_checked.
		rows, err = db.Query(`
			SELECT DISTINCT ON (url)
				url,
				product_name,
				COALESCE(last_price::text, '') AS last_price
			FROM tracked_urls
			ORDER BY url, last_checked ASC NULLS FIRST
		`)
	} else {
		// Scheduled: only pick up URLs that are due per their user's plan tier.
		// DISTINCT ON (url) deduplicates — the same URL only gets scraped once
		// even if multiple users track it.
		rows, err = db.Query(`
			SELECT DISTINCT ON (tu.url)
				tu.url,
				tu.product_name,
				COALESCE(tu.last_price::text, '') AS last_price
			FROM tracked_urls tu
			JOIN users u ON u.id = tu.user_id
			WHERE
				(u.plan_type = 'premium'
					AND (tu.last_checked IS NULL OR tu.last_checked < NOW() - INTERVAL '1 hour'))
			OR	(u.plan_type = 'pro'
					AND (tu.last_checked IS NULL OR tu.last_checked < NOW() - INTERVAL '6 hours'))
			OR	(u.plan_type NOT IN ('pro', 'premium')
					AND (tu.last_checked IS NULL OR tu.last_checked < NOW() - INTERVAL '24 hours'))
			ORDER BY tu.url ASC
			LIMIT $1
		`, maxURLsPerTick)
	}

	if err != nil {
		log.Printf("[Scraper] DB error fetching due URLs: %v", err)
		return err
	}

	type urlJob struct{ url, productName, lastPrice string }
	var jobs []urlJob
	for rows.Next() {
		var j urlJob
		if err := rows.Scan(&j.url, &j.productName, &j.lastPrice); err != nil {
			log.Printf("[Scraper] Row scan error: %v", err)
			continue
		}
		jobs = append(jobs, j)
	}
	rows.Close()

	log.Printf("[Scraper] %d unique URL(s) queued for this run", len(jobs))

	// Process sequentially with a short delay between scrapes to spread load
	// on both our infrastructure and third-party sites.
	for i, job := range jobs {
		if i > 0 {
			time.Sleep(scrapeDelay)
		}
		scrapeAndPersist(db, cfg, job.url, job.productName, job.lastPrice)
	}

	return nil
}

// scrapeAndPersist fetches the price for a URL and writes results for every
// tracked_urls row that shares it, so all users tracking the same URL benefit
// from a single network request.
func scrapeAndPersist(db *sql.DB, cfg config.Config, urlStr, productName, lastPriceStr string) {
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
		_, err = db.Exec("UPDATE tracked_urls SET last_checked = NOW() WHERE url = $1", urlStr)
		if err != nil {
			log.Printf("[Scraper] Failed to stamp last_checked for %s: %v", urlStr, err)
		}
		return
	}

	var lastPrice float64
	if lastPriceStr != "" {
		if val, err := strconv.ParseFloat(lastPriceStr, 64); err == nil {
			lastPrice = val
		}
	}

	// Insert a price_log entry for every tracked_urls row sharing this URL
	// so each subscriber gets a complete price history without extra scrapes.
	_, err = db.Exec(`
		INSERT INTO price_logs (url_id, price)
		SELECT id, $1 FROM tracked_urls WHERE url = $2
	`, currentPrice, urlStr)
	if err != nil {
		log.Printf("[Scraper] Failed to save price logs for %s: %v", urlStr, err)
	}

	// Update last_price + last_checked for all rows sharing this URL.
	if lastPrice == 0 || lastPrice != currentPrice {
		log.Printf("[Scraper] Price change for %s: %.2f -> %.2f", productName, lastPrice, currentPrice)
		_, err = db.Exec("UPDATE tracked_urls SET last_price = $1, last_checked = NOW() WHERE url = $2", currentPrice, urlStr)
	} else {
		_, err = db.Exec("UPDATE tracked_urls SET last_checked = NOW() WHERE url = $1", urlStr)
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
