const fs = require('fs');
const path = require('path');

// Путь к файлу с токеном
const tokenPath = path.join(__dirname, 'bot-token.txt');

function getBotToken() {
  try {
    // Проверяем существование файла
    if (!fs.existsSync(tokenPath)) {
      // Создаем пример файла если его нет
      fs.writeFileSync(
        path.join(__dirname, 'bot-token.example.txt'),
        'ВСТАВЬТЕ_ВАШ_ТОКЕН_ЗДЕСЬ'
      );
      throw new Error(`Файл с токеном не найден: ${tokenPath}\nСоздан пример файла: bot-token.example.txt`);
    }
    
    // Читаем токен из файла
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    
    // Проверяем что токен не пустой
    if (!token || token === 'ВСТАВЬТЕ_ВАШ_ТОКЕН_ЗДЕСЬ') {
      throw new Error('Токен бота не установлен. Заполните файл bot-token.txt');
    }
    
    return token;
  } catch (error) {
    console.error('❌ Ошибка загрузки токена:', error.message);
    process.exit(1);
  }
}

module.exports = { getBotToken };