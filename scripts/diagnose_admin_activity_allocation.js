import { runFullCalculation } from './src/utils/calculationEngine.js';

// Mock localStorage for Node environment
const store = {
    'clinic_revenue_data': JSON.stringify([
        { id: 1, abc_order_dept: '정형외과', abc_oper_dept: '정형외과', abc_order_dct: '정형1', abc_oper_dct: '정형1', patient_in_out: '외래', suga_category: '행위', account_category: '의료수익', account_code: '외래수익', amt: 5600000 },
        { id: 2, abc_order_dept: '정형외과', abc_oper_dept: '정형외과', abc_order_dct: '정형1', abc_oper_dct: '정형1', patient_in_out: '외래', suga_category: '재료', account_category: '의료수익', account_code: '외래수익', amt: 6700000 },
        // Let's load the full set if possible or some sample rows to verify
    ]),
    'clinic_driver_data': JSON.stringify([]),
    'clinic_account_driver_mapping': JSON.stringify({}),
    'clinic_account_view_mapping': JSON.stringify({}),
    'clinic_account_scope_mapping': JSON.stringify({}),
    'clinic_activity_logic_mappings': JSON.stringify({}),
    'clinic_activity_ratio_mappings': JSON.stringify([]),
    'clinic_labor_data': JSON.stringify([]),
    'clinic_cost_manual_data': JSON.stringify([]),
};

global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = val; },
};

// Let's load the actual storage values from the workspace if they exist!
import fs from 'fs';
import path from 'path';

// We can read temp_utf8_full.csv to check if we can simulate the exact browser environment.
console.log('--- Diagnosing 행정팀 행정활동 Allocation ---');
// Let's run a script that analyzes the temp_utf8.csv instead, since that contains the exact results of the full calculation!
const tempCsvPath = path.join(process.cwd(), 'temp_utf8.csv');
if (fs.existsSync(tempCsvPath)) {
    const csvContent = fs.readFileSync(tempCsvPath, 'utf-8');
    const lines = csvContent.split('\n');
    console.log('Searching for "행정팀_행정활동" rows in temp_utf8.csv...');
    lines.forEach((line, idx) => {
        if (line.includes('행정팀_행정활동')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    });
} else {
    console.log('temp_utf8.csv not found.');
}
