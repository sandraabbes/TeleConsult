const jwt = require('jsonwebtoken');
const axios = require('axios');

const secret = 'supersecretkey';
const payload = {
  sub: '919065f1-a3a0-4072-a781-6fe80e0e7c43', // dummy id
  role: 'patient',
  email: 'test@patient.com'
};
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('Generated token:', token.substring(0, 30) + '...');

axios.post('http://localhost:3045/api/payments/919065f1-a3a0-4072-a781-6fe80e0e7c43/initiate', {}, {
  headers: {
    Authorization: `Bearer ${token}`
  }
}).then(res => {
  console.log('Success:', res.status, res.data);
}).catch(err => {
  console.log('Error:', err.response ? err.response.status : err.message);
  if (err.response) {
    console.log('Error Data:', err.response.data);
  }
});
