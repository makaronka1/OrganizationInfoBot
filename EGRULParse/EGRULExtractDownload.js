const { chromium } = require('playwright');

const fs = require('fs');
const path = require('path');

async function openBrowserForDownload (INN, chatId) {
  const delay = Math.floor(Math.random() * 1000);
  console.log(delay);
  
  let browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto('https://egrul.nalog.ru/index.html');

  await page.locator('#query').pressSequentially(INN, {delay: 125});

  await page.locator('#btnSearch').click({delay: 237});

  await new Promise(resolve => setTimeout(resolve, 1000));

  const downloadButton = await page.waitForSelector(
    '.res-line button', 
    { timeout: 30000 } // 30 секунд timeout
  );
  await page.locator('.res-line button').click({delay: 100});
  await downloadExtract(page, chatId.toString());

  await new Promise(resolve => setTimeout(resolve, delay));

  await browser.close();

  return true;
}

async function downloadExtract (page, chatId) {
  const downloadPromise = page.waitForEvent('download');

  const download = await downloadPromise;
  const downloadPath = path.join(__dirname, 'downloads', chatId);
  const filePath = path.join(downloadPath, await download.suggestedFilename());
  
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  }

  await download.saveAs(filePath);
  
  console.log(`Файл сохранен: ${filePath}`);
}

module.exports = {
	openBrowserForDownload,
};
