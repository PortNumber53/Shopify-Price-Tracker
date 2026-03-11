package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/truvis/shopify-price-tracker/backend/config"
	"github.com/truvis/shopify-price-tracker/backend/models"
	"github.com/truvis/shopify-price-tracker/backend/services"
)

func AddURL(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var req models.CreateURLRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var count int
		var planType string
		err := db.QueryRow(`
			SELECT 
				(SELECT COUNT(*) FROM tracked_urls WHERE user_id = $1),
				plan_type 
			FROM users WHERE id = $1
		`, userID).Scan(&count, &planType)
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		limit := 1 // Default to free plan limit
		switch planType {
		case "pro":
			limit = 25
		case "premium":
			limit = 100
		}

		if count >= limit {
			c.JSON(http.StatusForbidden, gin.H{"error": "You have reached the maximum number of tracked URLs for your plan"})
			return
		}

		var newURL models.TrackedURL
		err = db.QueryRow(
			"INSERT INTO tracked_urls (user_id, product_name, url) VALUES ($1, $2, $3) RETURNING id, user_id, product_name, url, created_at",
			userID, req.ProductName, req.URL,
		).Scan(&newURL.ID, &newURL.UserID, &newURL.ProductName, &newURL.URL, &newURL.CreatedAt)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add URL"})
			return
		}

		c.JSON(http.StatusCreated, newURL)
	}
}

func GetURLs(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		rows, err := db.Query(
			"SELECT id, product_name, url, COALESCE(last_price, 0) as last_price, created_at FROM tracked_urls WHERE user_id = $1 ORDER BY created_at DESC",
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		defer rows.Close()

		var urls []models.TrackedURL
		for rows.Next() {
			var u models.TrackedURL
			if err := rows.Scan(&u.ID, &u.ProductName, &u.URL, &u.LastPrice, &u.CreatedAt); err != nil {
				continue
			}
			urls = append(urls, u)
		}

		c.JSON(http.StatusOK, urls)
	}
}

func DeleteURL(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		urlID := c.Param("id")

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		result, err := db.Exec("DELETE FROM tracked_urls WHERE id = $1 AND user_id = $2", urlID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete URL"})
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "URL not found or unauthorized"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "URL deleted successfully"})
	}
}

func GetURLHistory(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		urlID := c.Param("id")

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// First ensure the URL belongs to the user
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM tracked_urls WHERE id = $1 AND user_id = $2", urlID, userID).Scan(&count)
		if err != nil || count == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
			return
		}

		rows, err := db.Query(
			"SELECT id, url_id, price, checked_at FROM price_logs WHERE url_id = $1 ORDER BY checked_at DESC LIMIT 30",
			urlID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		defer rows.Close()

		var history []models.PriceLog
		for rows.Next() {
			var h models.PriceLog
			if err := rows.Scan(&h.ID, &h.URLID, &h.Price, &h.CheckedAt); err == nil {
				history = append(history, h)
			}
		}
		// If empty, return empty array not null
		if history == nil {
			history = make([]models.PriceLog, 0)
		}
		c.JSON(http.StatusOK, history)
	}
}

// SyncURLs manually triggers the background scraper for testing
func SyncURLs(db *sql.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Because the scraper is async and runs in background
		go services.TriggerScrape(db, cfg)

		c.JSON(http.StatusAccepted, gin.H{"message": "Sync job triggered successfully. Prices will update shortly."})
	}
}
