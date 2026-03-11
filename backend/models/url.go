package models

import "time"

type TrackedURL struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	ProductName string    `json:"product_name"`
	URL         string    `json:"url"`
	LastPrice   float64   `json:"last_price"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateURLRequest struct {
	ProductName string `json:"product_name" binding:"required"`
	URL         string `json:"url" binding:"required,url"`
}

type PriceLog struct {
	ID        string    `json:"id"`
	URLID     string    `json:"url_id"`
	Price     float64   `json:"price"`
	CheckedAt time.Time `json:"checked_at"`
}
