const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/database.sqlite');

db.serialize(() => {
    db.run("DELETE FROM generic_store WHERE key = 'clinic_departments'", (err) => {
        if(err) console.error("Error deleting from generic_store:", err.message);
        else console.log('Deleted legacy clinic_departments from generic_store');
    });
    
    // Rename table
    db.run("ALTER TABLE clinic_departments_v2 RENAME TO clinic_departments", (err) => {
        if(err) {
            if(err.message.includes("no such table")) {
                console.log("clinic_departments_v2 already renamed or does not exist");
            } else {
                console.error("Error renaming table:", err.message);
            }
        }
        else console.log('Renamed clinic_departments_v2 to clinic_departments');
    });
});
