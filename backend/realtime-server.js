require('dotenv').config();
const http = require('http');
const app = require('./server');
const roomsRouter = require('./routes/rooms');
const { attachSignalingServer } = require('./signaling');

const PORT = process.env.REALTIME_PORT || process.env.PORT || 3001;
const server = http.createServer(app);
attachSignalingServer(server, roomsRouter.getRoomsMap());

server.listen(PORT, () => {
    console.log(`EmergiX realtime backend live at http://localhost:${PORT}`);
    console.log(`WebSocket signaling available at ws://localhost:${PORT}/ws`);
});
