const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.sqlite');
const outPath = path.join(__dirname, '../src/utils/mockData.json');

const db = new sqlite3.Database(dbPath);
const dump = {};

db.serialize(() => {
    db.each("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, table) => {
        if (err) return console.error(err);
        const tableName = table.name;
        db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (err) return console.error(err);
            dump[tableName] = rows;
            fs.writeFileSync(outPath, JSON.stringify(dump, null, 2));
        });
    });
});
