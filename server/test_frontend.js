const axios = require('axios');
const { runFullCalculation } = require('./src/utils/calculationEngine.js');

async function testFrontend() {
    try {
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', { email: 'admin@gmail.com', password: 'admin' });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: 'Bearer ' + token } };
        
        const laborRes = await axios.post('http://localhost:3001/api/payment', { year: 2026, month: 3 }, config);
        const expenseRes = await axios.post('http://localhost:3001/api/expense', { year: 2026, month: 3 }, config);
        const patientRes = await axios.post('http://localhost:3001/api/patient_stats', { year: 2026, month: 3 }, config);
        const ratioRes = await axios.post('http://localhost:3001/api/activity-ratio', { year: 2026, month: 3 }, config);
        const rulesAccRes = await axios.post('http://localhost:3001/api/allocation-rules-account', { year: 2026, month: 3 }, config);
        const rulesActRes = await axios.post('http://localhost:3001/api/allocation-rules-activity', { year: 2026, month: 3 }, config);
        const revenueRes = await axios.post('http://localhost:3001/api/revenue', { year: 2026, month: 3 }, config); // Need revenue too

        const results = runFullCalculation(
            laborRes.data,
            expenseRes.data,
            revenueRes.data,
            patientRes.data,
            ratioRes.data,
            rulesAccRes.data,
            rulesActRes.data
        );

        console.log('Result totalCost:', results.totalCost);
        console.log('Final array sum:', results.finalTable.reduce((s, x) => s + x.cost, 0));
        console.log('totalInputCost inside engine should be equal to totalCost?');
    } catch (e) {
        console.error(e.response ? e.response.data : e);
    }
}
testFrontend();
