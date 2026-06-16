import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'temp_utf8_full.csv');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    console.log('--- temp_utf8_full.csv (First 40 lines) ---');
    lines.slice(0, 40).forEach((line, idx) => {
        console.log(`${idx + 1}: ${line.trim()}`);
    });
} else {
    console.log("File not found");
}
