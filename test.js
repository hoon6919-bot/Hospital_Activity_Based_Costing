const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('data/database.sqlite'); db.all('SELECT * FROM clinic_driver', (err, rows) => { console.log(JSON.stringify(rows)); });
