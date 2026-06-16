import fs from 'fs';
import path from 'path';

console.log('=== Searching Final Allocation Details in temp_utf8.csv ===');
const csvPath = path.join(process.cwd(), 'temp_utf8.csv');
if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    
    // Find any line containing cost details or breakdowns for final targets
    lines.forEach((line, idx) => {
        if (line.includes('정형외과_외래검사실_정형1_정형1')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    });

    // Let's print the entire lines 130 to 154 to verify if there are separate columns or details
    console.log('\n--- Lines 135 to 154 ---');
    for (let i = 134; i < 154; i++) {
        if (lines[i]) {
            console.log(`${i + 1}: ${lines[i].trim()}`);
        }
    }
} else {
    console.log("temp_utf8.csv not found.");
}
