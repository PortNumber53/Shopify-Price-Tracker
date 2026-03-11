package models

import (
	"time"
)

type User struct {
	ID                 string    `json:"id"`
	Email              string    `json:"email"`
	PasswordHash       string    `json:"-"`
	StripeCustomerID   string    `json:"stripe_customer_id"`
	SubscriptionActive bool      `json:"subscription_active"`
	CreatedAt          time.Time `json:"created_at"`
}

type SignupRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
