const fs = require('fs');
const path = require('path');

function clearDirectory(directoryPath) {
  try {

    if (!fs.existsSync(directoryPath)) {
      console.log(`❌ Директория не существует: ${directoryPath}`);
      return { success: false, error: 'Directory does not exist' };
    }

    const items = fs.readdirSync(directoryPath);
    let deletedCount = 0;
    let errorCount = 0;

    items.forEach(item => {
      const itemPath = path.join(directoryPath, item);
      
      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.isFile()) {
          fs.unlinkSync(itemPath);
          console.log(`✅ Удален файл: ${item}`);
          deletedCount++;
        } else if (stats.isDirectory()) {
          console.log(`⚠️ Пропущена папка: ${item}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка удаления ${item}:`, error.message);
        errorCount++;
      }
    });

    console.log(`🎯 Удалено файлов: ${deletedCount}, ошибок: ${errorCount}`);
    return { 
      success: true, 
      deletedCount, 
      errorCount,
      message: `Удалено ${deletedCount} файлов, ошибок: ${errorCount}`
    };

  } catch (error) {
    console.error('💥 Ошибка при очистке директории:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
	clearDirectory,
};