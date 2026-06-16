const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const alters = [
    "ALTER TABLE clinic_driver_data ALTER COLUMN value TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_revenue ALTER COLUMN amount TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_expense ALTER COLUMN amount TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_patient_stats ALTER COLUMN value TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_allocation_rules_account ALTER COLUMN amount TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_activity_ratio ALTER COLUMN ratio TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_costing_result ALTER COLUMN revenue TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_costing_result ALTER COLUMN cost TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_costing_result ALTER COLUMN profit TYPE DOUBLE PRECISION;",
    "ALTER TABLE clinic_costing_report ALTER COLUMN cost TYPE DOUBLE PRECISION;"
];

async function runAlters() {
    for (let sql of alters) {
        try {
            await pool.query(sql);
            console.log(`Success: ${sql}`);
        } catch (e) {
            console.error(`Error on: ${sql}`, e.message);
        }
    }
    process.exit(0);
}

runAlters();
