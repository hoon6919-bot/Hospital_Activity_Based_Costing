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
    
    console.log('--- Printing lines 105 to 135 ---');
    for (let i = 104; i < 135; i++) {
        if (lines[i]) {
            console.log(`${i + 1}: ${lines[i].trim()}`);
        }
    }
} else {
    console.log('File not found:', filePath);
}
