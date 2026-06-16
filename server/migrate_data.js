const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

const sqliteDb = new sqlite3.Database('../data/database.sqlite');
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

const tablesToMigrate = [
  'clinic_departments', 'clinic_costobject', 'clinic_activity', 'clinic_account', 'clinic_job_type', 
  'clinic_driver_logic', 'clinic_driver_data', 'generic_store', 'period', 'clinic_driver', 
  'clinic_payment', 'clinic_revenue', 'clinic_expense', 'clinic_patient_stats', 
  'clinic_allocation_rules_account', 'clinic_activity_ratio', 'clinic_allocation_rules_activity', 
  'clinic_costing_process', 'clinic_costing_result', 'clinic_costing_report'
];

async function migrateTable(tableName) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
            if (err) {
                console.error(`Error reading SQLite table ${tableName}:`, err.message);
                return resolve(); // Skip if table doesn't exist
            }
            if (rows.length === 0) {
                console.log(`Table ${tableName} is empty. Skipping.`);
                return resolve();
            }

            console.log(`Migrating ${rows.length} rows for table ${tableName}...`);
            const keys = Object.keys(rows[0]);
            const columns = keys.map(k => `"${k.toLowerCase()}"`).join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

            let successCount = 0;
            for (const row of rows) {
                const values = keys.map(k => row[k]);
                try {
                    await pgPool.query(query, values);
                    successCount++;
                } catch (pgErr) {
                    console.error(`Error inserting row into ${tableName}:`, pgErr.message);
                }
            }
            console.log(`Table ${tableName}: successfully migrated ${successCount}/${rows.length} rows.`);
            resolve();
        });
    });
}

async function startMigration() {
    console.log('Starting data migration from SQLite to PostgreSQL...');
    for (const table of tablesToMigrate) {
        await migrateTable(table);
    }
    console.log('Migration complete!');
    process.exit(0);
}

startMigration();
