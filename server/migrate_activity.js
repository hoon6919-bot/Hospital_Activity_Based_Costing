const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

const sqliteDb = new sqlite3.Database('../data/database.sqlite');
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

const tableName = 'clinic_allocation_rules_activity';

async function migrateTable() {
    return new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
            if (err) {
                console.error(`Error reading SQLite table ${tableName}:`, err.message);
                return resolve();
            }
            if (rows.length === 0) {
                console.log(`Table ${tableName} is empty. Skipping.`);
                return resolve();
            }

            console.log(`Migrating ${rows.length} rows for table ${tableName}...`);
            const keys = Object.keys(rows[0]);
            // lowercase the keys just in case, but they are already lowercase in sqlite here.
            const columns = keys.map(k => `"${k.toLowerCase()}"`).join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

            let successCount = 0;
            for (const row of rows) {
                const values = keys.map(k => row[k] === null ? null : row[k]);
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

migrateTable().then(() => process.exit(0));
