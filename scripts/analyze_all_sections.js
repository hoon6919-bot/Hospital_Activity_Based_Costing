import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'temp_utf8.csv');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    console.log('--- Scanning for Revenue / 수익 in temp_utf8.csv ---');
    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.includes('수익') || trimmed.includes('의료수익') || trimmed.includes('외래수익') || trimmed.includes('입원수익')) {
            console.log(`${idx + 1}: ${trimmed}`);
        }
    });
} else {
    console.log("File not found");
}
