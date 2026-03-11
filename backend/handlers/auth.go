package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/truvis/shopify-price-tracker/backend/models"
	"github.com/truvis/shopify-price-tracker/backend/utils"
)

func Signup(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.SignupRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check if user exists
		var existingEmail string
		err := db.QueryRow("SELECT email FROM users WHERE email = $1", req.Email).Scan(&existingEmail)
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
			return
		}

		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		var newUserID string
		err = db.QueryRow(
			"INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
			req.Email, hashedPassword,
		).Scan(&newUserID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		token, err := utils.GenerateToken(newUserID, req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "User created successfully",
			"token":   token,
			"user": gin.H{
				"id":    newUserID,
				"email": req.Email,
			},
		})
	}
}

func Login(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		err := db.QueryRow(
			"SELECT id, email, password_hash, stripe_customer_id, subscription_active FROM users WHERE email = $1",
			req.Email,
		).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.StripeCustomerID, &user.SubscriptionActive)

		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			}
			return
		}

		if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		token, err := utils.GenerateToken(user.ID, user.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Logged in successfully",
			"token":   token,
			"user": gin.H{
				"id":                  user.ID,
				"email":               user.Email,
				"subscription_active": user.SubscriptionActive,
			},
		})
	}
}
