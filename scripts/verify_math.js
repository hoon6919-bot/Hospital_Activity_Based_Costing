import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), '4관점_활동원가계산_개요시트_v2.csv');
const content = fs.readFileSync(csvPath);
const decoder = new TextDecoder('euc-kr');
const csvLines = decoder.decode(content).split('\n');

console.log('--- CSV Line Scan ---');
csvLines.forEach((line, idx) => {
    // Look for lines that contain numbers in column 5 (amt) or other areas related to revenue
    if (line.includes('외래검사실') || line.includes('정형외과') || line.includes('재료수익비')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
