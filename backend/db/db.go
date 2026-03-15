package db

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
)

func InitDB(databaseURL string) *sql.DB {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to PostgreSQL successfully")

	createTables(db)

	return db
}

func createTables(db *sql.DB) {
	query := `
	CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		stripe_customer_id VARCHAR(255),
		subscription_active BOOLEAN DEFAULT FALSE,
		plan_type VARCHAR(50) DEFAULT 'free',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS plans (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		plan_type VARCHAR(50) UNIQUE NOT NULL,
		stripe_product_id VARCHAR(255),
		stripe_price_id VARCHAR(255),
		price_cents INTEGER NOT NULL,
		currency VARCHAR(10) NOT NULL,
		active BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tracked_urls (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		product_name VARCHAR(255) NOT NULL,
		url TEXT NOT NULL,
		last_price NUMERIC(10, 2),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS price_logs (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		url_id UUID NOT NULL REFERENCES tracked_urls(id) ON DELETE CASCADE,
		price NUMERIC(10, 2) NOT NULL,
		checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err := db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create tables: %v", err)
	}

	// 5. Create domain_selectors table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS domain_selectors (
			id SERIAL PRIMARY KEY,
			domain VARCHAR(255) UNIQUE NOT NULL,
			css_selector VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Fatal("Failed to create domain_selectors table:", err)
	}

	migrations := []string{
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE`,
		`ALTER TABLE tracked_urls ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP WITH TIME ZONE`,
	}
	for _, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			log.Printf("Migration warning: %v", err)
		}
	}

	log.Println("Database tables initialized successfully")
}
