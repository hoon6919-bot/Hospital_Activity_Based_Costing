const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'clinicprofit_secret_2026';

// 인증 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ error: '인증 토큰이 없습니다.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        req.user = user;
        next();
    });
}

// === Auth API ===
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다.' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다.' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, hospital_name: user.hospital_name }, JWT_SECRET, { expiresIn: '24h' });
        db.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), user.id]);
        res.json({ token, user: { email: user.email, hospital_name: user.hospital_name, role: user.role, join_date: user.join_date, contact_name: user.contact_name } });
    });
});

app.post('/api/auth/find-id', (req, res) => {
    const { hospital_name } = req.body;
    db.get('SELECT email FROM users WHERE hospital_name = ?', [hospital_name], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: '해당 병원명으로 등록된 계정이 없습니다.' });
        
        const emailParts = user.email.split('@');
        let maskedEmail = user.email;
        if (emailParts.length === 2) {
            const idPart = emailParts[0];
            const maskedId = idPart.length > 2 ? idPart.substring(0, 2) + '*'.repeat(idPart.length - 2) : idPart + '***';
            maskedEmail = maskedId + '@' + emailParts[1];
        } else {
            maskedEmail = user.email.substring(0, 2) + '***'; // admin 같이 이메일 형식이 아닐경우
        }
        res.json({ maskedEmail });
    });
});

app.post('/api/auth/reset-pw', async (req, res) => {
    const { email, hospital_name, new_password } = req.body;
    db.get('SELECT id FROM users WHERE email = ? AND hospital_name = ?', [email, hospital_name], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: '이메일과 병원명이 일치하는 계정을 찾을 수 없습니다.' });

        const password_hash = await bcrypt.hash(new_password, 10);
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, user.id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
        });
    });
});

app.post('/api/auth/register', async (req, res) => {
    const { email, password, hospital_name, contact_name, phone } = req.body;
    if (!email || !password || !hospital_name) return res.status(400).json({ error: '필수 필드를 입력해주세요.' });

    try {
        const password_hash = await bcrypt.hash(password, 10);
        const join_date = new Date().toISOString().split('T')[0];
        const role = '일반';
        const status = '정상';

        db.run('INSERT INTO users (email, password_hash, hospital_name, role, join_date, status, contact_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [email, password_hash, hospital_name, role, join_date, status, contact_name || '', phone || ''], function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
                    return res.status(500).json({ error: err.message });
                }
                
                const newUserId = this.lastID;
                const templateUserId = 1;
                const tablesToCopy = [
                    'clinic_driver_logic', 'clinic_driver_data', 'generic_store', 'period',
                    'clinic_departments', 'clinic_costobject', 'clinic_activity', 'clinic_account',
                    'clinic_job_type', 'clinic_driver', 'clinic_payment', 'clinic_revenue',
                    'clinic_expense', 'clinic_patient_stats', 'clinic_allocation_rules_account',
                    'clinic_activity_ratio', 'clinic_allocation_rules_activity'
                ];

                db.serialize(() => {
                    tablesToCopy.forEach(table => {
                        db.all(`PRAGMA table_info(${table})`, (err, columns) => {
                            if (err) return;
                            const colNames = columns.filter(c => c.name !== 'id').map(c => c.name);
                            if (colNames.length === 0) return;
                            
                            const insertCols = colNames.join(', ');
                            const selectCols = colNames.map(c => c === 'user_id' ? newUserId : c).join(', ');
                            
                            db.run(`INSERT INTO ${table} (${insertCols}) SELECT ${selectCols} FROM ${table} WHERE user_id = ${templateUserId}`);
                        });
                    });
                });

                res.json({ success: true, message: '회원가입이 완료되었습니다.' });
            });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get('SELECT id, email, hospital_name, role, join_date FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        res.json(row);
    });
});

app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== '관리자') return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    
    db.all('SELECT id, email, hospital_name, role, status, contact_name, phone, note, join_date, last_login FROM users ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== '관리자') return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    
    const userId = req.params.id;
    if (userId == 1) return res.status(400).json({ error: '최고 관리자 계정은 삭제할 수 없습니다.' });

    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        res.json({ success: true, message: '사용자가 삭제되었습니다.' });
    });
});

app.post('/api/users/:id/reset-password', authenticateToken, async (req, res) => {
    if (req.user.role !== '관리자') return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    
    const userId = req.params.id;
    const tempPassword = 'abc-costing';
    
    try {
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
            res.json({ success: true, message: '비밀번호가 초기화되었습니다.' });
        });
    } catch (error) {
        res.status(500).json({ error: '비밀번호 암호화 중 오류가 발생했습니다.' });
    }
});

app.get('/api/table-columns/:table', authenticateToken, (req, res) => {
    const table = req.params.table;
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Invalid table name' });
    
    db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const excludeCols = ['id', 'period_year', 'period_type', 'period_name', 'note', 'user_id'];
        const columns = rows.filter(r => !excludeCols.includes(r.name)).map(r => r.name);
        res.json(columns);
    });
});

// === Driver Logic API (formerly allocation-rules) ===
app.get('/api/driver-logic', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });

    db.all('SELECT * FROM clinic_driver_logic WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/driver-logic', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    const rules = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'Expected an array of rules' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_driver_logic WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const stmt = db.prepare(`INSERT INTO clinic_driver_logic (
                period_year, period_type, period_name,
                type, source, driver, valueType, condition_field, condition_value, sql_text,
                note, status, successCount, errorCount, errorNote, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let r of rules) {
                stmt.run(
                    year, r.period_type || 'Year', name,
                    r.type, r.source, r.driver, r.valueType, r.condition_field, r.condition_value, r.sql_text,
                    r.note, r.status, r.successCount, r.errorCount, r.errorNote, req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Rules saved successfully' });
        });
    });
});

// === Driver Data API ===
app.get('/api/driver-data', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });

    db.all('SELECT * FROM clinic_driver_data WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/driver-data', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array of driver data' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_driver_data WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const stmt = db.prepare(`INSERT INTO clinic_driver_data (
                period_year, period_type, period_name,
                type, driver_code, dept_code, abc_order_dept, abc_oper_dept, 
                abc_order_dct, abc_oper_dct, value, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    year, d.period_type || 'Year', name,
                    d.type, d.driver_code || d.driver || '', d.dept_code || '', 
                    d.abc_order_dept || '', d.abc_oper_dept || '', d.abc_order_dct || '', d.abc_oper_dct || '', 
                    d.value || 0, d.note || '', req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Driver data saved' });
        });
    });
});

// === Period API ===
app.get('/api/period', authenticateToken, (req, res) => {
    db.get('SELECT * FROM period WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || null);
    });
});

app.post('/api/period', authenticateToken, (req, res) => {
    const { period_year, period_type, period_name } = req.body;
    if (!period_year || !period_type || !period_name) {
        return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }
    db.serialize(() => {
        db.run('DELETE FROM period WHERE user_id = ?', [req.user.id]);
        db.run('INSERT INTO period (period_year, period_type, period_name, user_id) VALUES (?, ?, ?, ?)',
            [period_year, period_type, period_name, req.user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
    });
});

// === Departments API ===
app.get('/api/departments', authenticateToken, (req, res) => {
    db.all('SELECT * FROM clinic_departments WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/departments', authenticateToken, (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_departments WHERE user_id = ?', [req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_departments (
                period_year, period_type, period_name, name, parent_name, level, is_dept, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    d.period_year || null, d.period_type || null, d.period_name || null,
                    d.name, d.parent_name || null, d.level || 1, d.is_dept !== undefined ? d.is_dept : 1, req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Departments saved' });
        });
    });
});

// === CostObject API ===
app.get('/api/costobject', authenticateToken, (req, res) => {
    db.all('SELECT * FROM clinic_costobject WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/costobject', authenticateToken, (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_costobject WHERE user_id = ?', [req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_costobject (
                period_year, period_type, period_name, name, parent_name, level, is_cost_obj, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    d.period_year || null, d.period_type || null, d.period_name || null,
                    d.name, d.parent_name || null, d.level || 1, d.is_cost_obj !== undefined ? d.is_cost_obj : 1, req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'CostObject saved' });
        });
    });
});

// === Standard Codes API ===
const createStandardApi = (endpoint, table, fields, insertFields, insertValues, objToParams) => {
    app.get(endpoint, authenticateToken, (req, res) => {
        const { year, name } = req.query;
        let query = `SELECT * FROM ${table} WHERE user_id = ?`;
        let params = [req.user.id];
        if (year && name) {
            query += ' AND period_year = ? AND period_name = ?';
            params.push(year, name);
        }
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.post(endpoint, authenticateToken, (req, res) => {
        const data = req.body;
        if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });

        db.serialize(() => {
            db.run(`DELETE FROM ${table} WHERE user_id = ?`, [req.user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                const stmt = db.prepare(`INSERT INTO ${table} (
                    period_year, period_type, period_name, ${insertFields}, user_id
                ) VALUES (?, ?, ?, ${insertValues}, ?)`);

                for (let d of data) {
                    stmt.run(
                        d.period_year || null, d.period_type || null, d.period_name || null,
                        ...objToParams(d), req.user.id
                    );
                }
                stmt.finalize();
                res.json({ success: true, message: `${table} saved` });
            });
        });
    });
};

createStandardApi('/api/standard-activities', 'clinic_activity', 'activity_type, activity_name', 'activity_type, activity_name', '?, ?', d => [d.activity_type, d.activity_name]);
createStandardApi('/api/standard-accounts', 'clinic_account', 'account_type, account_name', 'account_type, account_name', '?, ?', d => [d.account_type, d.account_name]);
createStandardApi('/api/standard-jobs', 'clinic_job_type', 'job_type, job_name', 'job_type, job_name', '?, ?', d => [d.job_type, d.job_name]);
createStandardApi('/api/standard-drivers', 'clinic_driver', 'driver_type, driver_name', 'driver_type, driver_name', '?, ?', d => [d.driver_type, d.driver_name]);

// === Payment API ===
app.get('/api/payment', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    let query = 'SELECT * FROM clinic_payment WHERE user_id = ?';
    let params = [req.user.id];
    if (year && name) {
        query += ' AND period_year = ? AND period_name = ?';
        params.push(year, name);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/payment', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });
    if (!year || !name) return res.status(400).json({ error: 'Year and name are required' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_payment WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_payment (
                period_year, period_type, period_name, dept_name, job_type, emp_name, account_category, account_name, headcount, avg_salary, total_amount, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    d.period_year || null, d.period_type || null, d.period_name || null,
                    d.dept_name, d.job_type, d.emp_name, d.account_category || '의료비용', d.account_name || '', d.headcount || 0, d.avg_salary || 0, d.total_amount || 0, d.note || '', req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Payment saved' });
        });
    });
});

// === Revenue API ===
app.get('/api/revenue', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    let query = 'SELECT * FROM clinic_revenue WHERE user_id = ?';
    let params = [req.user.id];
    if (year && name) {
        query += ' AND period_year = ? AND period_name = ?';
        params.push(year, name);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/revenue', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });
    if (!year || !name) return res.status(400).json({ error: 'Year and name are required' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_revenue WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_revenue (
                period_year, period_type, period_name, abc_order_dept, abc_oper_dept, abc_order_dct, abc_oper_dct, patient_in_out, suga_category, patient_reg_no, patient_no, suga_code, suga_name, order_date, registration_date, discharge_date, account_category, account_name, amount, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    d.period_year || null, d.period_type || null, d.period_name || null,
                    d.abc_order_dept || '', d.abc_oper_dept || '', d.abc_order_dct || '', d.abc_oper_dct || '',
                    d.patient_in_out || '', d.suga_category || '', d.patient_reg_no || '', d.patient_no || '',
                    d.suga_code || '', d.suga_name || '', d.order_date || '', d.registration_date || '', d.discharge_date || '',
                    d.account_category || '', d.account_name || '', d.amount || 0, d.note || '', req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Revenue saved' });
        });
    });
});

// === Patient Stats API ===
app.get('/api/patient_stats', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    let query = 'SELECT * FROM clinic_patient_stats WHERE user_id = ?';
    let params = [req.user.id];
    if (year && name) {
        query += ' AND period_year = ? AND period_name = ?';
        params.push(year, name);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/patient_stats', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });
    if (!year || !name) return res.status(400).json({ error: 'Year and name are required' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_patient_stats WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_patient_stats (
                period_year, period_type, period_name, driver_code, abc_order_dept, abc_oper_dept, abc_order_dct, abc_oper_dct, value, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    d.period_year || null, d.period_type || null, d.period_name || null,
                    d.driver_code || '', d.abc_order_dept || '', d.abc_oper_dept || '', d.abc_order_dct || '', d.abc_oper_dct || '', d.value || 0, d.note || '', req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Patient stats saved' });
        });
    });
});

// === Expense API ===
app.get('/api/expense', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    let query = 'SELECT * FROM clinic_expense WHERE user_id = ?';
    let params = [req.user.id];
    if (year && name) {
        query += ' AND period_year = ? AND period_name = ?';
        params.push(year, name);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/expense', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });
    if (!year || !name) return res.status(400).json({ error: 'Year and name are required' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_expense WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_expense (
                period_year, period_type, period_name, dept, account_category, account_name, costing_yn, amount, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    d.period_year || null, d.period_type || null, d.period_name || null,
                    d.dept || '', d.account_category || '', d.account_name || '', d.costing_yn || 'N', d.amount || 0, d.note || '', req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Expense saved' });
        });
    });
});

// === Period CRUD API ===
app.get('/api/periods', authenticateToken, (req, res) => {
    db.all('SELECT * FROM period WHERE user_id = ? ORDER BY period_year DESC, id DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/periods', authenticateToken, (req, res) => {
    const { period_year, period_type, period_name } = req.body;
    if (!period_year || !period_type || !period_name) {
        return res.status(400).json({ error: '회계연도, 대상기간, 기간명을 모두 입력해주세요.' });
    }
    db.run('INSERT INTO period (period_year, period_type, period_name, user_id) VALUES (?, ?, ?, ?)',
        [period_year, period_type, period_name, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, period_year, period_type, period_name });
        }
    );
});

app.put('/api/periods/:id', authenticateToken, (req, res) => {
    const { period_year, period_type, period_name } = req.body;
    db.run('UPDATE period SET period_year=?, period_type=?, period_name=? WHERE id=? AND user_id=?',
        [period_year, period_type, period_name, req.params.id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/periods/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM period WHERE id = ? AND user_id = ?', [id, req.user.id], (err, period) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!period) return res.status(404).json({ error: '기간을 찾을 수 없습니다.' });

        db.run('DELETE FROM clinic_payment WHERE period_year=? AND period_name=? AND user_id=?',
            [period.period_year, period.period_name, req.user.id],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                db.run('DELETE FROM period WHERE id=? AND user_id=?', [id, req.user.id], (err3) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ success: true });
                });
            }
        );
    });
});

// === Allocation Rules Account API ===
app.get('/api/allocation-rules-account', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    db.all('SELECT * FROM clinic_allocation_rules_account WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/allocation-rules-account', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    const data = req.body;
    db.serialize(() => {
        db.run('DELETE FROM clinic_allocation_rules_account WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            const stmt = db.prepare(`INSERT INTO clinic_allocation_rules_account (
                period_year, period_type, period_name, source, dept, account_category, account_name, amount, allocation_method, driver, allocation_base, allocation_scope, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (let d of data) {
                stmt.run(year, d.period_type || 'Year', name, d.source, d.dept, d.account_category, d.account_name, d.amount || 0, d.allocation_method, d.driver, d.allocation_base, d.allocation_scope, d.note || '', req.user.id);
            }
            stmt.finalize();
            res.json({ success: true, message: 'Saved successfully' });
        });
    });
});

// === Activity Ratio API ===
app.get('/api/activity-ratio', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    db.all('SELECT * FROM clinic_activity_ratio WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/activity-ratio', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    const data = req.body;
    db.serialize(() => {
        db.run('DELETE FROM clinic_activity_ratio WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            const stmt = db.prepare(`INSERT INTO clinic_activity_ratio (
                period_year, period_type, period_name, dept, job_type, emp_name, activity_name, ratio, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (let d of data) {
                stmt.run(year, d.period_type || 'Year', name, d.dept, d.job_type, d.emp_name, d.activity_name, d.ratio || 0, d.note || '', req.user.id);
            }
            stmt.finalize();
            res.json({ success: true, message: 'Saved successfully' });
        });
    });
});

// === Allocation Rules Activity API ===
app.get('/api/allocation-rules-activity', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    db.all('SELECT * FROM clinic_allocation_rules_activity WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/allocation-rules-activity', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    if (!year || !name) return res.status(400).json({ error: 'Missing period year or name' });
    const data = req.body;
    db.serialize(() => {
        db.run('DELETE FROM clinic_allocation_rules_activity WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            const stmt = db.prepare(`INSERT INTO clinic_allocation_rules_activity (
                period_year, period_type, period_name, dept, activity_name, activity_ratio, activity_cost, allocation_method, driver, allocation_base, allocation_scope, note, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (let d of data) {
                stmt.run(year, d.period_type || 'Year', name, d.dept, d.activity_name, d.activity_ratio || 0, d.activity_cost || 0, d.allocation_method, d.driver, d.allocation_base, d.allocation_scope, d.note || '', req.user.id);
            }
            stmt.finalize();
            res.json({ success: true, message: 'Saved successfully' });
        });
    });
});

app.get('/api/costing-result', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    let query = 'SELECT * FROM clinic_costing_result WHERE user_id = ?';
    let params = [req.user.id];
    if (year && name) {
        query += ' AND period_year = ? AND period_name = ?';
        params.push(year, name);
    }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        try {
            const data = rows.map(r => ({
                ...r,
                costBreakdown: r.cost_breakdown ? JSON.parse(r.cost_breakdown) : {}
            }));
            res.json(data);
        } catch (e) {
            res.json(rows);
        }
    });
});

app.get('/api/completed-periods', authenticateToken, (req, res) => {
    db.all('SELECT DISTINCT period_year, period_name FROM clinic_costing_result WHERE user_id = ? ORDER BY period_name DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/costing-report', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    let query = 'SELECT * FROM clinic_costing_report WHERE user_id = ?';
    let params = [req.user.id];
    if (year && name) {
        query += ' AND period_year = ? AND period_name = ?';
        params.push(year, name);
    }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/costing-result', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });
    if (!year || !name) return res.status(400).json({ error: 'Year and name are required' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_costing_result WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_costing_result (
                period_year, period_type, period_name, abc_order_dept, abc_oper_dept, abc_order_dct, abc_oper_dct, revenue, cost, profit, cost_breakdown, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    year, null, name,
                    d.abc_order_dept, d.abc_oper_dept, d.abc_order_dct, d.abc_oper_dct,
                    d.revenue || 0, d.cost || 0, d.profit || 0, JSON.stringify(d.costBreakdown || {}), req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Result saved' });
        });
    });
});

app.post('/api/costing-report', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });
    if (!year || !name) return res.status(400).json({ error: 'Year and name are required' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_costing_report WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_costing_report (
                period_year, period_type, period_name, abc_order_dept, abc_oper_dept, abc_order_dct, abc_oper_dct, dept, activity_name, cost, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    year, null, name,
                    d.abc_order_dept, d.abc_oper_dept, d.abc_order_dct, d.abc_oper_dct,
                    d.dept || '', d.activity_name || '', d.cost || 0, req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Report saved' });
        });
    });
});

app.post('/api/costing-process', authenticateToken, (req, res) => {
    const { year, name } = req.query;
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected an array' });
    if (!year || !name) return res.status(400).json({ error: 'Year and name are required' });

    db.serialize(() => {
        db.run('DELETE FROM clinic_costing_process WHERE period_year = ? AND period_name = ? AND user_id = ?', [year, name, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(`INSERT INTO clinic_costing_process (
                period_year, period_type, period_name, step_title, message, detail_json, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`);

            for (let d of data) {
                stmt.run(
                    year, null, name,
                    d.title, d.message, JSON.stringify(d.data || {}), req.user.id
                );
            }
            stmt.finalize();
            res.json({ success: true, message: 'Process saved' });
        });
    });
});

app.get('/api/store/:key', authenticateToken, (req, res) => {
    db.get('SELECT value FROM generic_store WHERE key = ? AND user_id = ?', [req.params.key, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            try {
                res.json(JSON.parse(row.value));
            } catch(e) {
                res.json(row.value);
            }
        } else {
            res.json(null);
        }
    });
});

app.post('/api/store/:key', authenticateToken, (req, res) => {
    const valueStr = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    
    // UPSERT with user_id is tricky because key must be unique per user.
    // Let's modify logic: check if exists, then update or insert.
    db.get('SELECT key FROM generic_store WHERE key = ? AND user_id = ?', [req.params.key, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            db.run('UPDATE generic_store SET value = ? WHERE key = ? AND user_id = ?', [valueStr, req.params.key, req.user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        } else {
            db.run('INSERT INTO generic_store (key, value, user_id) VALUES (?, ?, ?)', [req.params.key, valueStr, req.user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
