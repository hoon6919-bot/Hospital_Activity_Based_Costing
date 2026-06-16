const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        const expRes = await pool.query(`SELECT amount FROM clinic_expense WHERE user_id=1 AND costing_yn='Y'`);
        let eSum = 0;
        expRes.rows.forEach(r => {
            console.log('Expense:', r.amount);
            eSum += r.amount;
        });
        console.log('Expense sum JS:', eSum);

        const payRes = await pool.query(`SELECT (avg_salary * headcount) as amt FROM clinic_payment WHERE user_id=1`);
        let pSum = 0;
        payRes.rows.forEach(r => {
            console.log('Payment:', r.amt);
            pSum += r.amt;
        });
        console.log('Payment sum JS:', pSum);

        console.log('Total Input JS:', eSum + pSum);
    } catch (e) {
        console.log(e);
    } finally {
        process.exit(0);
    }
}
run();
