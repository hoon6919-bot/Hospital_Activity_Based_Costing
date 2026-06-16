const axios = require('axios');

async function testCalc() {
    try {
        // Authenticate as admin
        const loginRes = await axios.post('http://localhost:5000/api/login', {
            email: 'admin@gmail.com',
            password: 'admin' // Or whatever the password is
        });
        const token = loginRes.data.token;
        console.log('Got token');

        // Call calculate
        const calcRes = await axios.post('http://localhost:5000/api/calculate', {
            year: 2026,
            month: 3
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = calcRes.data;
        console.log('Result total cost:', data.results.totalCost);
        console.log('Final table sum:', data.results.finalTable.reduce((s, x) => s + x.cost, 0));
        console.log('Report table sum:', data.results.reportTable.reduce((s, x) => s + x.cost, 0));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
testCalc();
