const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { attachSignalingServer } = require('../backend/signaling');

function nextMessage(ws) {
    return new Promise((resolve) => ws.once('message', (data) => resolve(JSON.parse(data))));
}

function waitForMessage(ws, predicate, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out waiting for signaling message')), timeoutMs);
        const onMessage = (data) => {
            const msg = JSON.parse(data);
            if (!predicate(msg)) return;
            clearTimeout(timer);
            ws.off('message', onMessage);
            resolve(msg);
        };
        ws.on('message', onMessage);
    });
}

test('signaling rejects unknown rooms', async () => {
    const server = http.createServer();
    attachSignalingServer(server, new Map());
    await new Promise((resolve) => server.listen(0, resolve));
    const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws?roomId=missing&role=patient`);
    const msg = await new Promise((resolve) => ws.once('message', (data) => resolve(JSON.parse(data))));
    assert.equal(msg.type, 'error');
    server.close();
});

test('signaling queues messages until peer joins', async () => {
    const rooms = new Map([['room-1', { roomId: 'room-1', doctorId: 'doc-1' }]]);
    const server = http.createServer();
    attachSignalingServer(server, rooms);
    await new Promise((resolve) => server.listen(0, resolve));
    const base = `ws://127.0.0.1:${server.address().port}/ws?roomId=room-1`;
    const patient = new WebSocket(`${base}&role=patient`);
    await nextMessage(patient);
    patient.send(JSON.stringify({ type: 'chat', text: 'hello' }));
    const doctor = new WebSocket(`${base}&role=doctor`);
    const queued = await waitForMessage(doctor, (msg) => msg.type === 'chat');
    assert.equal(queued.type, 'chat');
    assert.equal(queued.text, 'hello');
    patient.close();
    doctor.close();
    server.close();
});
