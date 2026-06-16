const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.query(`SELECT * FROM clinic_expense WHERE costing_yn='N' OR costing_yn='n'`)
    .then(res => {
        console.log('Expense N:', res.rows);
        process.exit(0);
    })
    .catch(e => {
        console.log(e.message);
        process.exit(1);
    });
