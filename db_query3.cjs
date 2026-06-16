const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/database.sqlite');
db.all("SELECT * FROM clinic_patient_stats WHERE driver_code = '검사환자수'", (err, rows) => {
    console.log(rows);
});
