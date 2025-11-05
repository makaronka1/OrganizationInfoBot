import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let globalBrowser = null;

export async function openBrowserForDownload(INN, chatId) {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Начало процесса загрузки для ИНН: ${INN}`);
  
  if (!globalBrowser) {
    globalBrowser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
  }
  
  const browser = globalBrowser;
  const page = await browser.newPage();
  
  const downloadPath = path.join(__dirname, 'downloads', chatId.toString());
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  const downloadPromise = new Promise((resolve, reject) => {
    page.on('download', async (download) => {
      console.log(`[${new Date().toISOString()}] Началась загрузка файла`);
      
      try {
        const filePath = path.join(downloadPath, download.suggestedFilename());
        await download.saveAs(filePath);
        console.log(`[${new Date().toISOString()}] Файл успешно загружен: ${filePath}`);
        resolve(filePath);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Ошибка при загрузке файла:`, error);
        reject(error);
      }
    });
  });

  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  try {
    await page.goto('https://egrul.nalog.ru/index.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.locator('#query').fill(INN);
    await page.locator('#btnSearch').click();

    await new Promise(resolve => setTimeout(resolve, 200));

    const downloadButton = await page.waitForSelector(
      '.res-line button', 
      { timeout: 30000 }
    );
    
    await page.locator('.res-line button').click();
    const downloadedFilePath = await downloadPromise;

    await page.close();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[${new Date().toISOString()}] Процесс завершен для ИНН: ${INN}. Время выполнения: ${duration}мс (${(duration / 1000).toFixed(2)}с)`);

    return downloadedFilePath;

  } catch (error) {
    await page.close();
    throw error;
  }
}

// Функция для закрытия глобального браузера
export async function closeGlobalBrowser() {
  if (globalBrowser) {
    await globalBrowser.close();
    globalBrowser = null;
  }
}

// ESM exports above