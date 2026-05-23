const fs = require('fs');
const https = require('https');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/Badestrand/russian-dictionary/master/nouns.csv';
const OUTPUT_FILE = path.join(__dirname, 'dictionary.js');

console.log('Downloading CSV from:', URL);

https.get(URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${res.statusCode}`);
    return;
  }

  let data = '';
  res.setEncoding('utf8');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Download complete. Processing...');
    
    // Split lines by newline
    const lines = data.split(/\r?\n/);
    if (lines.length === 0) {
      console.error('Empty CSV!');
      return;
    }

    // Determine the delimiter (usually tab '\t' or comma ',')
    // OpenRussian raw CSVs are typically tab-separated (TSV) or comma-separated.
    // Let's inspect the first line to check.
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';')) {
      delimiter = ';';
    }
    console.log(`Detected delimiter: ${JSON.stringify(delimiter)}`);

    const header = firstLine.split(delimiter);
    console.log('CSV Headers:', header);
    
    // We want the first column, let's check its index just in case.
    // By default, the first column is 'bare' or the noun itself.
    let targetColIdx = 0;
    const bareIdx = header.findIndex(h => h.toLowerCase().trim().replace(/^"|"$/g, '') === 'bare');
    if (bareIdx !== -1) {
      targetColIdx = bareIdx;
      console.log(`Found 'bare' column at index ${targetColIdx}`);
    } else {
      console.log(`'bare' column not explicitly found in header, defaulting to column index 0`);
    }

    const wordsSet = new Set();
    const cyrillicRegex = /^[а-яё]{5}$/;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple split by delimiter
      const cols = line.split(delimiter);
      if (cols.length <= targetColIdx) continue;

      // Extract the word, remove outer quotes
      let rawWord = cols[targetColIdx].trim().replace(/^"|"$/g, '');
      const word = rawWord.toLowerCase();

      // Filter: exactly 5 characters long and contains only Cyrillic letters
      if (cyrillicRegex.test(word)) {
        wordsSet.add(word);
      }
    }

    // Convert Set to array and sort alphabetically in Russian
    const sortedWords = Array.from(wordsSet).sort((a, b) => a.localeCompare(b, 'ru'));

    console.log(`Parsed ${lines.length} lines.`);
    console.log(`Found ${sortedWords.length} unique, valid 5-letter Russian nouns.`);
    
    if (sortedWords.length > 0) {
      console.log('Sample words:', sortedWords.slice(0, 10), '...', sortedWords.slice(-10));
    } else {
      console.warn('Warning: No words matched the filter! Please check CSV parsing.');
    }

    // Write to dictionary.js
    const fileContent = `// Dictionary of Russian 5-letter nouns. Source: Badestrand (CC BY-SA 4.0)
const WORDS = ${JSON.stringify(sortedWords, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WORDS;
}
`;
    
    fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf8');
    console.log(`Saved dictionary to: ${OUTPUT_FILE}`);
  });
}).on('error', (err) => {
  console.error('Error downloading CSV:', err);
});
