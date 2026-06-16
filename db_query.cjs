const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/database.sqlite');
db.all('SELECT period_year, period_type, period_name, COUNT(*) as cnt FROM clinic_driver_data GROUP BY period_year, period_type, period_name', (err, rows) => {
    console.log(rows);
});
