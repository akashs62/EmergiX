const WebSocket = require('ws');

// wait for 2 seconds to let the server start (if not already)
const url1 = 'ws://localhost:3000/ws?roomId=test-room-1&role=patient';
const url2 = 'ws://localhost:3000/ws?roomId=test-room-1&role=doctor';

console.log("Connecting patient...");
const ws1 = new WebSocket(url1);

ws1.on('open', () => {
    console.log("Patient connected. Connecting doctor...");
    const ws2 = new WebSocket(url2);
    
    ws2.on('open', () => {
        console.log("Doctor connected.");
    });

    ws2.on('message', (msg) => {
        console.log("Doctor received: ", msg.toString());
    });
});

ws1.on('message', (msg) => {
    console.log("Patient received: ", msg.toString());
});

ws1.on('error', (e) => console.log('w1 error', e.message));
