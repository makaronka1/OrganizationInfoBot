import { parseSabyProfile } from './sabyParse/sabyParse.js';
import { openBrowserForDownload } from './EGRULParse/EGRULExtractDownload.js';
import { clearDirectory } from './EGRULParse/EGRULClearDirectory.js';
import { getInfoFromEGRULExtract } from './EGRULParse/EGRULExtractParse.js';
import { getBotToken } from './config.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NTBA_FIX_350 = '1';

const bot = new TelegramBot(getBotToken(), { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.first_name;
  
  bot.sendMessage(chatId, `Привет, ${username}! 👋 Я бот поиска информации об организациях. Отправь мне ИНН организации и я начну поиск!`, {
  });
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  console.log(chatId);
  if (text.startsWith('/')) return;

	if (isValidINN(text)) {
    const downloadsPath = path.join(__dirname, 'EGRULParse', 'downloads', chatId.toString());

		(async () => {
      const progressMsg = await bot.sendMessage(chatId, '🔍 Ищу данные по ИНН...');

      await bot.editMessageText('💾 Скачиваю выписку...', {
        chat_id: chatId,
        message_id: progressMsg.message_id
      });

			const downloadStatus = await openBrowserForDownload(text, chatId);
			if (downloadStatus) {
        await bot.editMessageText('📊 Анализирую выписку...', {
          chat_id: chatId,
          message_id: progressMsg.message_id
        });

      	const latestFile = getLatestFile(downloadsPath);
        
        let info = await getInfoFromEGRULExtract(latestFile.path);
        const textResult = formatingForTelegram(info);

				await bot.sendDocument(chatId, latestFile.path, {
					caption: `${textResult}`,
					mimeType: 'application/pdf'
				});

        clearDirectory(downloadsPath);

        await bot.deleteMessage(chatId, progressMsg.message_id);
			}
				
		})();
	} else {
		bot.sendMessage(chatId, 'Неправильный ИНН или ошибка');
	}
})

function formatingForTelegram (parseResult) {
	if ('error' in parseResult) {
		return 'Информация об организации не найдена или организация не существует.'
	} else {
		return `Наименование: ${parseResult.name}\nПолное наименование: ${parseResult.fullName}\nАдрес: ${parseResult.address}\nИНН: ${parseResult.inn}\nКПП: ${parseResult.kpp}`
	}
}

function isValidINN(str) {
    return /^\d{10}$/.test(str);
}



function getLatestFile(directory) {
  try {

    if (!fs.existsSync(directory)) {
      console.log('Директория не существует:', directory);
      return null;
    }
    
    const files = fs.readdirSync(directory)
      .map(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          time: stats.mtime.getTime(),
          size: stats.size
        };
      })
      .filter(file => fs.statSync(file.path).isFile())
      .sort((a, b) => b.time - a.time);
    
    console.log('Найдено файлов:', files.length);
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${new Date(file.time).toLocaleString()})`);
    });
    
    return files.length > 0 ? files[0] : null;
    
  } catch (error) {
    console.error('Ошибка при чтении директории:', error);
    return null;
  }
}

console.log('Бот запущен и готов к работе...');