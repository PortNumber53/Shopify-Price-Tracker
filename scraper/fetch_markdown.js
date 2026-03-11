const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const cheerio = require('cheerio');
const { NodeHtmlMarkdown } = require('node-html-markdown');
const http = require('http');
const https = require('https');

const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || 'http://localhost:8191/v1';

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let out = '';
      res.on('data', (chunk) => out += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(out)); }
        catch (e) { reject(new Error(`FlareSolverr invalid JSON: ${out.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function fetchViaFlareSolverr(url) {
  const response = await postJSON(FLARESOLVERR_URL, {
    cmd: 'request.get',
    url,
    maxTimeout: 60000,
  });

  if (response.status !== 'ok') {
    throw new Error(`FlareSolverr failed: ${response.message || JSON.stringify(response)}`);
  }

  return response.solution.response; // raw HTML
}

function buildMarkdown(html, url) {
  const $ = cheerio.load(html);

  // Detect CAPTCHA / access denied pages (check raw HTML too for JS-injected signals)
  const pageTitle = $('title').text().toLowerCase();
  const bodyText = $('body').text().toLowerCase().slice(0, 3000);
  const rawHtmlSnippet = html.slice(0, 5000).toLowerCase();
  
  const captchaSignals = [
    'captcha', 'are you a robot', 'access denied', 'verify you are human',
    'bot detected', 'challenge', 'please verify', 'security check',
    'ddos protection', 'just a moment',
  ];
  const dataDomeSignals = [
    'geo.captcha-delivery.com', 'datadome', 'dd_app_id', "'cid':",
  ];

  const isGenericCaptcha = captchaSignals.some(s => pageTitle.includes(s) || bodyText.includes(s));
  const isDataDome = dataDomeSignals.some(s => rawHtmlSnippet.includes(s));

  if (isDataDome) return { blocked: 'DataDome' };
  if (isGenericCaptcha) return { blocked: 'CAPTCHA' };

  // Aggressively sanitize the page
  $('script, style, path, footer, header, head, noscript, svg, iframe, canvas, video, audio, nav, aside').remove();
  $('[style*="display: none"], [style*="display:none"], [hidden]').remove();
  $('.cookie-banner, .newsletter, .popup, .modal, .overlay, [class*="cookie"], [class*="popup"], [class*="modal"]').remove();

  const sanitizedHtml = $.html();
  return NodeHtmlMarkdown.translate(sanitizedHtml);
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error(JSON.stringify({ error: 'Missing URL argument' }));
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
        '--start-maximized',
        '--ignore-certificate-errors',
        '--disable-http2',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      javaScriptEnabled: true,
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();

    let html = null;
    let playwrightBlocked = false;

    // Attempt Playwright with up to 2 retries
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000 + attempt * 1000);
        html = await page.evaluate(() => document.documentElement.outerHTML);
        break;
      } catch (e) {
        if (attempt === 2) { playwrightBlocked = true; break; }
        await page.waitForTimeout(1500);
      }
    }

    // Check if Playwright got a CAPTCHA page
    if (html) {
      const result = buildMarkdown(html, url);
      if (result && !result.blocked) {
        console.log(JSON.stringify({ markdown: result }));
        return;
      }
      const reason = result ? result.blocked : 'unknown';
      process.stderr.write(`[Scraper] Playwright blocked by ${reason} for ${url}\n`);
      playwrightBlocked = true;
    }

    // --- FlareSolverr fallback ---
    if (playwrightBlocked) {
      let flareSolved = false;
      try {
        process.stderr.write(`[FlareSolverr] Trying ${url} ...\n`);
        const flareHtml = await fetchViaFlareSolverr(url);
        const result = buildMarkdown(flareHtml, url);
        if (result && !result.blocked) {
          flareSolved = true;
          process.stderr.write(`[FlareSolverr] Success for ${url}\n`);
          console.log(JSON.stringify({ markdown: result }));
          return;
        }
        const reason = result ? result.blocked : 'unknown';
        process.stderr.write(`[FlareSolverr] Also blocked by ${reason} for ${url}\n`);
      } catch (e) {
        process.stderr.write(`[FlareSolverr] Error: ${e.message}\n`);
      }

      if (!flareSolved) {
        console.error(JSON.stringify({ error: `CAPTCHA or access-denied page detected on ${url} (Playwright + FlareSolverr both failed)` }));
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
