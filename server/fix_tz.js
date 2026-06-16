const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const sql = `ALTER TABLE users 
    ALTER COLUMN last_login TYPE TIMESTAMPTZ USING last_login AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';`;

pool.query(sql)
    .then(() => {
        console.log('Success altering users table');
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
