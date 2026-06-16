import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), '4관점_활동원가계산_개요시트_v2.csv');
const content = fs.readFileSync(csvPath);
const decoder = new TextDecoder('euc-kr');
const csvLines = decoder.decode(content).split('\n');

console.log('--- Search for raw revenue rows containing 재료 or 행위 ---');
csvLines.forEach((line, idx) => {
    // If line has "재료" or "행위" and contains numbers like "000"
    if ((line.includes('재료') || line.includes('행위')) && line.includes('000') && !line.includes('배부')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
