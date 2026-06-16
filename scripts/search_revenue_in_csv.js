import fs from 'fs';

const csvContent = fs.readFileSync('temp_utf8.csv', 'utf-8');
const lines = csvContent.split('\n');

console.log("=== Revenue Map Combinations in CSV ===");
let inSection = false;
lines.forEach(line => {
    if (line.includes('=== 4. 원가대상(수익데이터) 목록 ===')) {
        inSection = true;
        return;
    }
    if (inSection && line.startsWith('===')) {
        inSection = false;
    }
    if (inSection && line.trim()) {
        const parts = line.split(',');
        if (parts.length >= 8 && parts[0] !== 'id' && parts[0] !== '') {
            // id, abc_order_dept, abc_oper_dept, abc_order_dct, abc_oper_dct, amt_revenue
            console.log(`ID: ${parts[0]}, OrderDept: ${parts[1]}, OperDept: ${parts[2]}, OrderDoc: ${parts[3]}, OperDoc: ${parts[4]}, Rev: ${parts[7]}`);
        }
    }
});
