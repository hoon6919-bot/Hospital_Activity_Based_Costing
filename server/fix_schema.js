const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixSchema() {
    try {
        console.log('Fixing schema...');
        
        // clinic_driver_logic
        await pool.query(`ALTER TABLE clinic_driver_logic RENAME COLUMN valuetype TO "valueType"`).catch(e => console.log('valuetype:', e.message));
        await pool.query(`ALTER TABLE clinic_driver_logic RENAME COLUMN successcount TO "successCount"`).catch(e => console.log('successcount:', e.message));
        await pool.query(`ALTER TABLE clinic_driver_logic RENAME COLUMN errorcount TO "errorCount"`).catch(e => console.log('errorcount:', e.message));
        await pool.query(`ALTER TABLE clinic_driver_logic RENAME COLUMN errornote TO "errorNote"`).catch(e => console.log('errornote:', e.message));

        // clinic_driver_data
        await pool.query(`ALTER TABLE clinic_driver_data RENAME COLUMN driver_type TO "type"`).catch(e => console.log('driver_type:', e.message));

        // clinic_allocation_rules_activity
        await pool.query(`ALTER TABLE clinic_allocation_rules_activity ADD COLUMN IF NOT EXISTS "dept" TEXT`).catch(e => console.log('dept:', e.message));
        await pool.query(`ALTER TABLE clinic_allocation_rules_activity ADD COLUMN IF NOT EXISTS "activity_ratio" REAL`).catch(e => console.log('activity_ratio:', e.message));
        await pool.query(`ALTER TABLE clinic_allocation_rules_activity ADD COLUMN IF NOT EXISTS "activity_cost" REAL`).catch(e => console.log('activity_cost:', e.message));
        
        console.log('Schema fix complete.');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
fixSchema();
