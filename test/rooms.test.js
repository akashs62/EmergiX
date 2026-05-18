process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../backend/server');
const roomsRouter = require('../backend/routes/rooms');

function request(server, method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const { port } = server.address();
        const req = http.request({
            hostname: '127.0.0.1',
            port,
            path,
            method,
            headers: {
                ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => raw += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

test('active rooms are scoped to the authenticated doctor', async () => {
    roomsRouter.getRoomsMap().clear();
    const server = app.listen(0);
    const doctor1 = jwt.sign({ id: 'doc-1', role: 'doctor' }, process.env.JWT_SECRET);
    const doctor2 = jwt.sign({ id: 'doc-2', role: 'doctor' }, process.env.JWT_SECRET);

    try {
        await request(server, 'POST', '/api/rooms/create', { doctorId: 'doc-1', patientName: 'A' });
        await request(server, 'POST', '/api/rooms/create', { doctorId: 'doc-2', patientName: 'B' });

        const res1 = await request(server, 'GET', '/api/rooms/active', null, doctor1);
        const res2 = await request(server, 'GET', '/api/rooms/active', null, doctor2);

        assert.equal(res1.status, 200);
        assert.equal(res1.body.activeRooms.length, 1);
        assert.equal(res1.body.activeRooms[0].patientName, 'A');
        assert.equal(res2.body.activeRooms.length, 1);
        assert.equal(res2.body.activeRooms[0].patientName, 'B');
    } finally {
        server.close();
    }
});
