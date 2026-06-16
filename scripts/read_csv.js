import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', '4관점_활동원가계산_개요시트_v2.csv');
if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    const decoder = new TextDecoder('euc-kr');
    const content = decoder.decode(buffer);
    const lines = content.split('\n');
    
    console.log('Search for 29,365,000:');
    lines.forEach((l, idx) => {
        if (l.includes('29,365') || l.includes('29365')) {
            console.log(`${idx + 1}: ${l}`);
        }
    });

    console.log('\nSearch for 25,016,207:');
    lines.forEach((l, idx) => {
        if (l.includes('25,016') || l.includes('25016')) {
            console.log(`${idx + 1}: ${l}`);
        }
    });
} else {
    console.log('File not found:', filePath);
}
