import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'temp_utf8.csv');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    console.log('--- temp_utf8.csv (Lines 130 to 160) ---');
    for (let i = 129; i < 160; i++) {
        if (lines[i]) {
            console.log(`${i + 1}: ${lines[i].trim()}`);
        }
    }
} else {
    console.log("File not found");
}
