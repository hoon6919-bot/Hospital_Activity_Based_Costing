const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

const tables = [
    'clinic_driver_logic', 'clinic_driver_data', 'generic_store', 'period',
    'clinic_departments', 'clinic_costobject', 'clinic_activity', 'clinic_account',
    'clinic_job_type', 'clinic_driver', 'clinic_payment', 'clinic_revenue',
    'clinic_expense', 'clinic_patient_stats', 'clinic_allocation_rules_account',
    'clinic_activity_ratio', 'clinic_allocation_rules_activity', 'clinic_costing_process',
    'clinic_costing_result', 'clinic_costing_report'
];

async function migrate() {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            // 1. Create users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                hospital_name TEXT,
                role TEXT,
                join_date TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // 2. Add user_id to all tables if it doesn't exist
            for (const table of tables) {
                db.all(`PRAGMA table_info(${table})`, (err, columns) => {
                    if (err) return console.error(err);
                    const hasUserId = columns.some(c => c.name === 'user_id');
                    if (!hasUserId) {
                        db.run(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER`, (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.error(`Error adding user_id to ${table}:`, err.message);
                            }
                        });
                    }
                });
            }

            // 3. Create default admin user if not exists
            const email = 'SDhospital@gmail.com';
            const password = 'admin'; // Default password
            const hospital_name = '신동병원';
            const role = '관리자 (Admin)';
            const join_date = '2025-01-26';
            const password_hash = await bcrypt.hash(password, 10);

            db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
                if (err) return reject(err);
                
                if (!row) {
                    db.run(`INSERT INTO users (email, password_hash, hospital_name, role, join_date) VALUES (?, ?, ?, ?, ?)`,
                        [email, password_hash, hospital_name, role, join_date], function(err) {
                        if (err) return reject(err);
                        const adminId = this.lastID;
                        console.log(`Created admin user with ID ${adminId}`);
                        
                        // 4. Update all existing records to belong to this admin
                        tables.forEach(table => {
                            db.run(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [adminId]);
                        });
                        resolve();
                    });
                } else {
                    console.log(`Admin user already exists with ID ${row.id}`);
                    // Ensure existing records have user_id
                    tables.forEach(table => {
                        db.run(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [row.id]);
                    });
                    resolve();
                }
            });
        });
    });
}

migrate().then(() => {
    console.log('Migration complete. You can login with SDhospital@gmail.com / admin');
    db.close();
}).catch(console.error);
