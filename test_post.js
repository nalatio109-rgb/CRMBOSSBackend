require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 'dummy', role: 'admin' }, process.env.JWT_SECRET || 'latio_secret_key_123', { expiresIn: '1d' });

const http = require('http');

const data = JSON.stringify({
  title: 'Test Deal',
  customer: 'Test Cust',
  value: '1000'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/deals',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer ' + token
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.write(data);
req.end();
