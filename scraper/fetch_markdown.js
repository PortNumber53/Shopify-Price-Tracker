const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const cheerio = require('cheerio');
const { NodeHtmlMarkdown } = require('node-html-markdown');

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error(JSON.stringify({ error: "Missing URL argument" }));
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for dynamic content and prices to render

    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const $ = cheerio.load(html);

    // Aggressively sanitize the page before markdown conversion to reduce LLM tokens
    $('script, style, path, footer, header, head, noscript, svg, iframe, canvas, video, audio').remove();

    const sanitizedHtml = $.html();
    const markdown = NodeHtmlMarkdown.translate(sanitizedHtml);

    console.log(JSON.stringify({ markdown }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
