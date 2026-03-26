const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ sub: 'admin-sub' }, 'secret-key-replace-me', { expiresIn: '24h' });

const data = JSON.stringify({ email: "t1@test.com", password: "p", store_name: "test", address: "test" });

const req = http.request({
    hostname: '127.0.0.1',
    port: 8001,
    path: '/api/v1/grocery/admin/stores/with-owner',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    }
}, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', console.error);
req.write(data);
req.end();
