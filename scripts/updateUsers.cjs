const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/database.sqlite');

db.serialize(() => {
    ['contact_name', 'phone', 'status', 'last_login', 'note'].forEach(col => {
        db.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, (err) => {
            if(err) console.log(err.message);
        });
    });
    db.run("UPDATE users SET email = 'admin', role = '관리자', status = '정상', hospital_name = '신동병원' WHERE id = 1", (err) => {
        if(err) console.log(err.message);
        else console.log('Admin user updated');
    });
});
