import fs from 'fs';
import path from 'path';

console.log('=== Searching for Wonmu (원무팀) + Material Cost (재료비) ===');

// 1. Search in CostPage.jsx
const costPagePath = path.join(process.cwd(), 'src', 'pages', 'CostPage.jsx');
if (fs.existsSync(costPagePath)) {
    const content = fs.readFileSync(costPagePath, 'utf-8');
    const lines = content.split('\n');
    console.log('--- Search in CostPage.jsx ---');
    lines.forEach((line, idx) => {
        if (line.includes('원무팀') && line.includes('재료비')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
}

// 2. Search in temp_utf8.csv
const csvPath = path.join(process.cwd(), 'temp_utf8.csv');
if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    console.log('--- Search in temp_utf8.csv ---');
    lines.forEach((line, idx) => {
        if (line.includes('원무팀') && line.includes('재료비')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
}
