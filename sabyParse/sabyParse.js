const { chromium } = require('playwright');

async function parseSabyProfile(inn) {
	const browser = await chromium.launch({
		headless: true
	});
	
	const page = await browser.newPage();
	
	try {
			const url = `https://saby.ru/profile/${inn}`;
			console.log(`Загружаем страницу: ${url}`);
			
			await page.goto(url, {
					waitUntil: 'domcontentloaded',
					timeout: 30000
			});

			await page.waitForTimeout(1000);

			// Получаем JSON-LD данные
			const jsonLdData = await page.$$eval('script[type="application/ld+json"]', 
					(scripts) => {
							return scripts.map(script => {
									try {
											const content = script.textContent || script.innerHTML;
											return JSON.parse(content);
									} catch (e) {
											return null;
									}
							}).filter(data => data !== null);
					}
			);

			if (jsonLdData.length === 0) {
					throw new Error('JSON-LD данные не найдены на странице');
			}

			// Ищем организацию в JSON-LD данных
			let organizationData = null;
			
			for (const data of jsonLdData) {
					if (data && typeof data === 'object') {
							if (data['0'] || data['1'] || data['2'] || data['3']) {
									Object.values(data).forEach(item => {
											if (item && item['@type'] === 'Organization') {
													organizationData = item;
											}
									});
							}
							else if (data['@type'] === 'Organization') {
									organizationData = data;
							}
					}
			}

			if (!organizationData) {
					throw new Error('Данные организации не найдены');
			}

			// Извлекаем нужные поля
			const result = {
					name: organizationData.name || null,
					fullName: extractFullName(organizationData.description),
					address: organizationData.address ? formatAddress(organizationData.address) : null,
					inn: inn,
					kpp: extractKpp(organizationData.description)
			};

			return result;

	} catch (error) {
			console.error('Ошибка при парсинге:', error.message);
			return {
					name: null,
					fullName: null,
					address: null,
					inn: inn,
					kpp: null,
					error: error.message
			};
	} finally {
		await browser.close();
	}
}

// Вспомогательные функции
function extractFullName(description) {
	if (!description) return null;
	const match = description.match(/Реквизиты\s+(.+?)\s+ИНН/);
	return match ? match[1].trim() : null;
}

function extractKpp(description) {
	if (!description) return null;
	const match = description.match(/КПП\s+(\d+)/);
	return match ? match[1] : null;
}

function formatAddress(address) {
	if (!address || typeof address !== 'object') return null;
	
	const parts = [
			address.postalCode,
			cleanAddressLocality(address.addressLocality), // чистим от лишних точек
			address.streetAddress
	].filter(Boolean);
	
	return parts.join(', ');
}

// Функция для очистки адреса от лишних точек
function cleanAddressLocality(locality) {
	if (!locality) return null;

	return locality
		.replace(/г\.\./g, 'г.')
		.replace(/\s+/g, ' ')    
		.trim();
}

module.exports = {
	parseSabyProfile,
};