const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

let queryChain = Promise.resolve();

function convertQuery(sql) {
    let count = 1;
    // ? 를 $1, $2 로 변경
    let pgSql = sql.replace(/\?/g, () => `$${count++}`);
    
    // SQLite의 this.lastID 지원을 위해 INSERT 문에 RETURNING id 자동 추가
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
    }
    return pgSql;
}

const db = {
    serialize: function(callback) {
        callback();
    },
    run: function(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        
        queryChain = queryChain.then(() => pool.query(pgSql, params))
            .then(res => {
                let lastID = null;
                if (res.command === 'INSERT' && res.rows.length > 0) {
                    lastID = res.rows[0].id;
                }
                const context = { changes: res.rowCount, lastID: lastID };
                if (callback) callback.call(context, null);
            })
            .catch(err => {
                console.error('DB Run Error:', err, sql);
                if (callback) callback(err);
            });
        return this;
    },
    all: function(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        
        queryChain = queryChain.then(() => pool.query(pgSql, params))
            .then(res => {
                if (callback) callback(null, res.rows);
            })
            .catch(err => {
                console.error('DB All Error:', err, sql);
                if (callback) callback(err);
            });
        return this;
    },
    get: function(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        
        queryChain = queryChain.then(() => pool.query(pgSql, params))
            .then(res => {
                if (callback) callback(null, res.rows[0]);
            })
            .catch(err => {
                console.error('DB Get Error:', err, sql);
                if (callback) callback(err);
            });
        return this;
    },
    prepare: function(sql) {
        const pgSql = convertQuery(sql);
        return {
            run: function(...args) {
                let params = args;
                let callback = null;
                if (args.length > 0 && typeof args[args.length - 1] === 'function') {
                    callback = args.pop();
                } else if (args.length === 1 && Array.isArray(args[0])) {
                    params = args[0];
                }
                
                queryChain = queryChain.then(() => pool.query(pgSql, params))
                    .then(res => {
                        let lastID = null;
                        if (res.command === 'INSERT' && res.rows.length > 0) {
                            lastID = res.rows[0].id;
                        }
                        const context = { changes: res.rowCount, lastID: lastID };
                        if (callback) callback.call(context, null);
                    })
                    .catch(err => {
                        console.error('DB Prepare Run Error:', err.message, sql);
                        if (callback) callback(err);
                    });
                return this;
            },
            finalize: function() {}
        };
    }
};

module.exports = db;
