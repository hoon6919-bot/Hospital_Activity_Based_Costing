const BASE_URL = 'http://localhost:3001/api';

const getAuthHeaders = (extraHeaders = {}) => {
    const token = localStorage.getItem('token');
    return {
        ...extraHeaders,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const authFetch = async (url, options = {}) => {
    options.headers = getAuthHeaders(options.headers);
    const res = await fetch(url, options);
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // 이미 로그인 화면이나 가입 화면이라면 리다이렉트 하지 않음 (무한 루프 방지)
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                window.location.href = '/login'; 
            }
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return res.json();
};

export const api = {
    // === Auth API ===
    async login(email, password) {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    },
    async register(email, password, hospital_name, contact_name = '', phone = '') {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, hospital_name, contact_name, phone })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Registration failed');
        }
        return res.json();
    },
    async findId(hospital_name) {
        const res = await fetch(`${BASE_URL}/auth/find-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hospital_name })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to find ID');
        }
        return res.json();
    },
    async resetPassword(email, hospital_name, new_password) {
        const res = await fetch(`${BASE_URL}/auth/reset-pw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, hospital_name, new_password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to reset password');
        }
        return res.json();
    },
    async getMe() {
        return authFetch(`${BASE_URL}/auth/me`);
    },
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    async getUsers() {
        return authFetch(`${BASE_URL}/users`);
    },
    async deleteUser(id) {
        return authFetch(`${BASE_URL}/users/${id}`, { method: 'DELETE' });
    },
    async resetUserPassword(id) {
        return authFetch(`${BASE_URL}/users/${id}/reset-password`, { method: 'POST' });
    },

    // === Existing API Routes modified to use authFetch ===
    async getRules(year, name) {
        if (!year || !name) throw new Error('Period year and name are required');
        return authFetch(`${BASE_URL}/driver-logic?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async saveRules(year, name, rules) {
        if (!year || !name) throw new Error('Period year and name are required');
        return authFetch(`${BASE_URL}/driver-logic?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rules)
        });
    },
    async getDriverData(year, name) {
        if (!year || !name) throw new Error('Period year and name are required');
        return authFetch(`${BASE_URL}/driver-data?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async saveDriverData(year, name, data) {
        if (!year || !name) throw new Error('Period year and name are required');
        return authFetch(`${BASE_URL}/driver-data?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    async getStore(key) {
        return authFetch(`${BASE_URL}/store/${key}`);
    },
    async saveStore(key, value) {
        return authFetch(`${BASE_URL}/store/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value)
        });
    },
    async getPeriod() {
        return authFetch(`${BASE_URL}/period`);
    },
    async savePeriod(data) {
        return authFetch(`${BASE_URL}/period`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    async getDepartments() {
        return authFetch(`${BASE_URL}/departments`);
    },
    async saveDepartments(data) {
        return authFetch(`${BASE_URL}/departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    async getCostObject() {
        return authFetch(`${BASE_URL}/costobject`);
    },
    async saveCostObject(data) {
        return authFetch(`${BASE_URL}/costobject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    async getStandardActivities() {
        return authFetch(`${BASE_URL}/standard-activities`);
    },
    async saveStandardActivities(data) {
        return authFetch(`${BASE_URL}/standard-activities`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getStandardAccounts() {
        return authFetch(`${BASE_URL}/standard-accounts`);
    },
    async saveStandardAccounts(data) {
        return authFetch(`${BASE_URL}/standard-accounts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getStandardJobs() {
        return authFetch(`${BASE_URL}/standard-jobs`);
    },
    async saveStandardJobs(data) {
        return authFetch(`${BASE_URL}/standard-jobs`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getStandardDrivers(year, name) {
        const url = (year && name) ? `${BASE_URL}/standard-drivers?year=${year}&name=${name}` : `${BASE_URL}/standard-drivers`;
        return authFetch(url);
    },
    async saveStandardDrivers(data) {
        return authFetch(`${BASE_URL}/standard-drivers`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getPayment(year, name) {
        return authFetch(`${BASE_URL}/payment?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async savePayment(year, name, data) {
        return authFetch(`${BASE_URL}/payment?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getExpenseData(year, name) {
        return authFetch(`${BASE_URL}/expense?year=${year}&name=${name}`);
    },
    async saveExpenseData(year, name, data) {
        return authFetch(`${BASE_URL}/expense?year=${year}&name=${name}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getPatientStats(year, name) {
        return authFetch(`${BASE_URL}/patient_stats?year=${year}&name=${name}`);
    },
    async savePatientStats(year, name, data) {
        return authFetch(`${BASE_URL}/patient_stats?year=${year}&name=${name}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getTableColumns(tableName) {
        return authFetch(`${BASE_URL}/table-columns/${tableName}`);
    },
    async getRevenueData(year, name) {
        return authFetch(`${BASE_URL}/revenue?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async saveRevenueData(year, name, data) {
        return authFetch(`${BASE_URL}/revenue?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getPeriods() {
        return authFetch(`${BASE_URL}/periods`);
    },
    async addPeriod(data) {
        return authFetch(`${BASE_URL}/periods`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async updatePeriod(id, data) {
        return authFetch(`${BASE_URL}/periods/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async deletePeriod(id) {
        return authFetch(`${BASE_URL}/periods/${id}`, { method: 'DELETE' });
    },
    async getAllocationRulesAccount(year, name) {
        return authFetch(`${BASE_URL}/allocation-rules-account?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async saveAllocationRulesAccount(year, name, data) {
        return authFetch(`${BASE_URL}/allocation-rules-account?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getActivityRatio(year, name) {
        return authFetch(`${BASE_URL}/activity-ratio?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async saveActivityRatio(year, name, data) {
        return authFetch(`${BASE_URL}/activity-ratio?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getAllocationRulesActivity(year, name) {
        return authFetch(`${BASE_URL}/allocation-rules-activity?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async saveAllocationRulesActivity(year, name, data) {
        return authFetch(`${BASE_URL}/allocation-rules-activity?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async getCostingResult(year, name) {
        return authFetch(`${BASE_URL}/costing-result?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async getCostingReport(year, name) {
        return authFetch(`${BASE_URL}/costing-report?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
    },
    async getCompletedPeriods() {
        return authFetch(`${BASE_URL}/completed-periods`);
    },
    async saveCostingResult(year, name, data) {
        return authFetch(`${BASE_URL}/costing-result?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async saveCostingReport(year, name, data) {
        return authFetch(`${BASE_URL}/costing-report?year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    },
    async saveCostingProcess(year, name, data) {
        return authFetch(`${BASE_URL}/costing-process?year=${year}&name=${name}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    }
};
