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
  await page.evaluate(() => { Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Themes')?.click() });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_themes.png', fullPage: true });
  
  // 3. Trends
  await page.evaluate(() => { Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Trends')?.click() });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_trends.png', fullPage: true });
  
  // 4. Report
  await page.evaluate(() => { Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Report')?.click() });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_report.png', fullPage: true });
  
  await browser.close();
  console.log("Screenshots captured!");
}

run();
