import puppeteer from "puppeteer";
import sanitizeHtml from "sanitize-html";
import { logger } from "../../config/logger";

export const extractURL = async (url: string): Promise<{ text: string; pageCount: null }> => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    const html  = await page.content();
    const clean = sanitizeHtml(html, {
      allowedTags: ["p","h1","h2","h3","h4","h5","li","td","th","span"],
      allowedAttributes: {},
    });
    const text = clean.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
    logger.info(`URL extracted: ${url} (${text.length} chars)`);
    return { text, pageCount: null };
  } finally {
    if (browser) await browser.close();
  }
};