const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        const expRes = await pool.query(`SELECT SUM(amount) as s FROM clinic_expense WHERE costing_yn='Y' AND account_category NOT LIKE '%수익%' AND user_id=1`);
        const e = parseFloat(expRes.rows[0].s || 0);

        const payRes = await pool.query(`SELECT SUM(total_amount) as s FROM clinic_payment WHERE user_id=1`);
        const p = parseFloat(payRes.rows[0].s || 0);

        const inputTotal = e + p;

        const repRes = await pool.query(`SELECT SUM(cost) as s FROM clinic_costing_report WHERE user_id=1`);
        const r = parseFloat(repRes.rows[0].s || 0);

        console.log(`Expense (valid): ${e}`);
        console.log(`Payment: ${p}`);
        console.log(`Total Input: ${inputTotal}`);
        console.log(`Report Total: ${r}`);
        console.log(`Difference: ${inputTotal - r}`);

        const rawExpRes = await pool.query(`SELECT id, amount, account_name, account_category, costing_yn FROM clinic_expense WHERE user_id=1`);
        console.log('All expenses:', rawExpRes.rows);
    } catch (e) {
        console.log(e);
    } finally {
        process.exit(0);
    }
}
run();
