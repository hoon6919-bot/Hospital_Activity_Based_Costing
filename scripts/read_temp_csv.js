import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'temp_utf8.csv');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    console.log('Total lines in temp_utf8.csv:', lines.length);
    console.log('Header:', lines[0]);
    
    let materialRevenueTotal = 0;
    let materialRevenueExam = 0;
    let materialRevenueOrthopedics = 0;

    let actRevenueTotal = 0;
    let actRevenueExam = 0;
    let actRevenueOrthopedics = 0;

    lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const cols = line.split(',');
        // Columns might be: treatDept, performDept, prescDoc, performDoc, patientType, actMaterial, amount
        // Let's check typical fields:
        // suga_category / actMaterial could be cols[5] (행위/재료)
        // execDept / performDept could be cols[1] (시행과)
        // amount / amt could be cols[6]
        const operDept = cols[1];
        const sugaCat = cols[5];
        const amt = parseFloat(cols[6]) || 0;

        if (sugaCat === '재료') {
            materialRevenueTotal += amt;
            if (operDept === '외래검사실') {
                materialRevenueExam += amt;
            } else if (operDept === '정형외과') {
                materialRevenueOrthopedics += amt;
            }
        } else if (sugaCat === '행위') {
            actRevenueTotal += amt;
            if (operDept === '외래검사실') {
                actRevenueExam += amt;
            } else if (operDept === '정형외과') {
                materialRevenueOrthopedics += amt;
            }
        }
    });

    console.log('Total Material Revenue:', materialRevenueTotal.toLocaleString());
    console.log('Material Revenue for 외래검사실:', materialRevenueExam.toLocaleString());
    console.log('Material Revenue for 정형외과:', materialRevenueOrthopedics.toLocaleString());
    console.log('Material Revenue Ratio for 외래검사실:', (materialRevenueExam / materialRevenueTotal * 100).toFixed(4) + '%');
    
    const expectedAlloc = 52500000 * (materialRevenueExam / materialRevenueTotal);
    console.log('Expected Allocation to 외래검사실 by Material Revenue:', Math.round(expectedAlloc).toLocaleString());
} else {
    console.log('temp_utf8.csv not found');
}
