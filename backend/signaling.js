const { WebSocketServer, WebSocket } = require('ws');

const FORWARD_TYPES = new Set(['offer', 'answer', 'ice-candidate', 'chat', 'toggle-video', 'toggle-audio', 'end-call']);

function send(ws, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
}

function attachSignalingServer(httpServer, rooms) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    const signalingRooms = new Map();

    const getRoom = (roomId) => {
        if (!signalingRooms.has(roomId)) {
            signalingRooms.set(roomId, { patient: null, doctor: null, pendingForPatient: [], pendingForDoctor: [] });
        }
        return signalingRooms.get(roomId);
    };

    const flush = (room, role) => {
        const queueKey = role === 'patient' ? 'pendingForPatient' : 'pendingForDoctor';
        while (room[queueKey].length) send(room[role], room[queueKey].shift());
    };

    const maybeReady = (roomId, room) => {
        if (!room.patient || !room.doctor) return;
        send(room.doctor, { type: 'ready', roomId });
        send(room.patient, { type: 'peer-joined', role: 'doctor' });
        flush(room, 'patient');
        flush(room, 'doctor');
    };

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const roomId = url.searchParams.get('roomId');
        const role = url.searchParams.get('role');

        if (!roomId || !['patient', 'doctor'].includes(role)) {
            send(ws, { type: 'error', message: 'Valid roomId and role are required.' });
            ws.close();
            return;
        }
        if (!rooms.has(roomId)) {
            send(ws, { type: 'error', message: 'Room not found.' });
            ws.close();
            return;
        }

        const room = getRoom(roomId);
        if (room[role] && room[role].readyState === WebSocket.OPEN) {
            send(room[role], { type: 'replaced', message: 'A newer connection joined this role.' });
            room[role].close();
        }

        room[role] = ws;
        send(ws, { type: 'joined', role, roomId });
        flush(room, role);
        maybeReady(roomId, room);

        ws.on('message', (data) => {
            let msg;
            try { msg = JSON.parse(data); } catch {
                send(ws, { type: 'error', message: 'Invalid signaling payload.' });
                return;
            }
            if (!FORWARD_TYPES.has(msg.type)) return;
            const peerRole = role === 'patient' ? 'doctor' : 'patient';
            if (!send(room[peerRole], msg)) {
                room[peerRole === 'patient' ? 'pendingForPatient' : 'pendingForDoctor'].push(msg);
            }
        });

        ws.on('close', () => {
            if (room[role] === ws) room[role] = null;
            send(room[role === 'patient' ? 'doctor' : 'patient'], { type: 'peer-left', role });
            if (!room.patient && !room.doctor) signalingRooms.delete(roomId);
        });
    });

    return wss;
}

module.exports = { attachSignalingServer };
