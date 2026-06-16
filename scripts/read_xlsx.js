import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join(process.cwd(), '원가계산_테이블_명세서.xlsx');
try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        const ws = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws);
        console.log(`Sheet "${sheetName}" has ${data.length} rows.`);
        if (data.length > 0) {
            console.log('Sample row:', data[0]);
        }
    });
} catch (e) {
    console.error('Error reading xlsx:', e.message);
}
