const fs = require("fs");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");


// --- функция извлечения текста с позиции ---
async function extractTextLines(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const lines = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let currentY = null;
    let line = "";

    content.items.forEach(item => {
      if (currentY === null || Math.abs(currentY - item.transform[5]) > 2) {
        if (line) lines.push(line.trim());
        line = item.str;
        currentY = item.transform[5];
      } else {
        line += " " + item.str;
      }
    });

    if (line) lines.push(line.trim());
  }

  return lines;
}

// --- функция извлечения таблицы ---
function extractTable(lines) {
  const rows = [];
  let current = null;

  let startIndex = lines.findIndex(l =>
    l.replace(/\s+/g,"").includes("Noп/п") &&
    l.replace(/\s+/g,"").includes("Наименованиепоказателя") &&
    l.replace(/\s+/g,"").includes("Значениепоказателя")
  );

  if (startIndex === -1) throw new Error("Таблица с шапкой не найдена");

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(/^(\d+)(.*)$/);
    if (match) {
      if (current) rows.push(current);

      const number = match[1];
      let rest = match[2].trim();

      const quoteIndex = rest.indexOf('"');
      let name = rest, value = "";
      if (quoteIndex > 0) {
        name = rest.slice(0, quoteIndex).trim();
        value = rest.slice(quoteIndex).trim();
      }

      current = {
        "№ п/п": number,
        "Наименование показателя": name,
        "Значение показателя": value
      };
    } else if (current) {
      if (current["Значение показателя"]) current["Значение показателя"] += " " + line;
      else current["Значение показателя"] = line;
    }
  }

  if (current) rows.push(current);
  return rows;
}

function getInfo(searchString, massive) {
  let firstLineNumber;
  let lastLineNumber;
  const infoLinesMassive = [];

  for (const line of massive) {
    if (line.includes(searchString)) {
      firstLineNumber = line.split(' ')[0];
      lastLineNumber = parseInt(firstLineNumber) + 1;
    }

    if (firstLineNumber && line.split(' ')[0] != lastLineNumber) {
      infoLinesMassive.push(line);
    } else if (line.split(' ')[0] == lastLineNumber && lastLineNumber) {
      break;
    }
  }

  const resultString = infoLinesMassive[0].split(' ').slice(1, ).filter(item => item !== '').join(' ').replace(searchString, '').trim();
  return resultString;
}

async function getInfoFromEGRULExtract(extractPath) {
	const lines = await extractTextLines(extractPath);
	const table = extractTable(lines);

	const mergedArray = table.map(r => 
		`${r["№ п/п"]} ${r["Наименование показателя"]} ${r["Значение показателя"]}`
	);
	const fullName = getInfo('Полное наименование на русском языке', mergedArray);
	const name = getInfo('Сокращенное наименование на русском языке', mergedArray);
	const address = getInfo('Адрес юридического лица', mergedArray);
	const INN = getInfo('ИНН юридического лица', mergedArray);
	const KPP = getInfo('КПП юридического лица', mergedArray);

	return {
		'fullName': fullName,
		'name': name,
		'address': address,
		'inn': INN,
		'kpp': KPP
	}
}

module.exports = {
	getInfoFromEGRULExtract,
};