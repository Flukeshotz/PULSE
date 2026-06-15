import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to iPhone SE
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2 });
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // 1. Overview
  await page.screenshot({ path: 'screenshot_overview.png', fullPage: true });
  
  // 2. Themes
  await page.click('button:has-text("Themes")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot_themes.png', fullPage: true });
  
  // 3. Trends
  await page.click('button:has-text("Trends")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot_trends.png', fullPage: true });
  
  // 4. Report
  await page.click('button:has-text("Report")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot_report.png', fullPage: true });
  
  await browser.close();
  console.log("Screenshots captured!");
}

run();
