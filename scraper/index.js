const { chromium } = require('playwright');
const { Client } = require('pg');
const cron = require('node-cron');
require('dotenv').config({ path: '../_env.example' }); // Load from example for dev, use .env in prod

const dbParams = {
  connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/shopify_price_tracker?sslmode=disable',
};

async function extractPrice(page) {
  // A heuristic approach to extracting prices, commonly seen in Shopify sites
  const priceText = await page.evaluate(() => {
    // 1. Look for meta or spans with itemprop="price"
    const priceMeta = document.querySelector('[itemprop="price"]');
    if (priceMeta) {
      return priceMeta.getAttribute('content') || priceMeta.innerText;
    }
    
    // 2. Look for common Shopify price classes
    const priceElements = document.querySelectorAll('.price-item, .price, .product__price, span.money');
    for (let el of priceElements) {
      const text = el.innerText.trim();
      if (text.match(/[\$€£]\s?\d+(?:,\d{3})*(?:\.\d{2})?/)) { // Looks like a price
        return text;
      }
    }
    return null;
  });

  if (priceText) {
    // Clean to float
    const numMatch = priceText.replace(/,/g, '').match(/\d+(?:\.\d{2})?/);
    if (numMatch) {
      return parseFloat(numMatch[0]);
    }
  }
  return null;
}

async function runScraper() {
  console.log('Starting scraper run at', new Date().toISOString());
  const client = new Client(dbParams);
  
  try {
    await client.connect();
    
    // Get all tracked URLs
    const res = await client.query('SELECT id, user_id, product_name, url, last_price FROM tracked_urls');
    const urls = res.rows;
    
    if (urls.length === 0) {
      console.log('No URLs to track.');
      return;
    }
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    
    for (const item of urls) {
      try {
        console.log(`Scraping ${item.url} ...`);
        const page = await context.newPage();
        await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait a little bit for dynamic prices to load
        await page.waitForTimeout(2000);
        
        const currentPrice = await extractPrice(page);
        console.log(`Extracted price for ${item.product_name}:`, currentPrice);
        
        if (currentPrice !== null) {
            // Check if price changed or is new
            const lastPrice = item.last_price !== null ? parseFloat(item.last_price) : null;
            
            // Always insert log for history
            await client.query(
                `INSERT INTO price_logs (url_id, price) VALUES ($1, $2)`,
                [item.id, currentPrice]
            );

            if (lastPrice !== currentPrice) {
              console.log(`Price change detected for ${item.product_name}: ${lastPrice} -> ${currentPrice}`);
              
              // Update last_price
              await client.query(
                `UPDATE tracked_urls SET last_price = $1 WHERE id = $2`,
                [currentPrice, item.id]
              );
              
              // TODO: Send Email Notification to user (requires querying user email)
            }
        } else {
            console.log(`Could not extract price for ${item.url}`);
        }
        await page.close();
      } catch (err) {
        console.error(`Error scraping ${item.url}:`, err.message);
      }
    }
    
    await browser.close();
    
  } catch (err) {
    console.error('Database connection or execution error:', err);
  } finally {
    await client.end();
    console.log('Scraper run completed at', new Date().toISOString());
  }
}

// Run immediately if called directly with `node index.js --run`
if (process.argv.includes('--run')) {
    runScraper().then(() => process.exit(0));
} else {
    // Schedule to run every day at midnight (or configure via env)
    const schedule = process.env.SCRAPER_CRON || '0 0 * * *'; 
    console.log(`Scheduling scraper with cron: ${schedule}`);
    cron.schedule(schedule, () => {
        runScraper();
    });
}
