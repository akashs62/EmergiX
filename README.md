# EmergiX 🚑

*Time is Life.*

EmergiX is a cutting-edge emergency care coordination platform. It provides rapid doctor triage, advanced ambulance dispatch routing, and smart hospital matching—all designed to ensure help arrives before hope fades.

## Features 🚀

- **Smart Ambulance Dispatch**: Book instantly or run through an AI Triage system. Real-time simulated mapping tracking provided via Leaflet.js.
- **Video Consultation**: Instant HD video connection with triage doctors and specialists featuring an active timer dashboard.
- **ER Pre-Alert**: Receive notifications and prep data before the crisis reaches the hospital gate. 

## Technology Stack 💻
- Vanilla HTML, CSS, JavaScript (Frontend UI)
- React via Babel (Standalone `.jsx` implementations)
- Leaflet.js Base Maps
- Node.js & Express (API Mock Authentication Flow)

## Getting Started ⚙️
Run all the commands in Command Prompt Terminal(cmd)

1. **Clone the repository.**
   
   ```bash
   git clone https://github.com/akashs62/EmergiX.git

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the app**:
   ```bash
   npm start
   ```
4. **For split production deployments, start the realtime server separately**:
   ```bash
   npm run realtime
   ```
5. Open `http://localhost:3000` in your browser.
6. (Optional) Check backend health at `http://localhost:3000/api/health`.

Note: the Express backend serves the frontend, so a separate `npx serve` process is not required.

For production deployments where the frontend/API stay on Vercel, host `backend/realtime-server.js`
on a Node service that supports persistent WebSocket connections and set
`window.__EMERGIX_WS_BASE_URL__ = 'wss://your-realtime-host'` before `frontend/js/config.js` loads.

## File Structure 📁
- `frontend/` - Static pages, styles, plain JS, and Babel JSX components.
- `backend/server.js` - Express API + static file hosting + WebSocket signaling.
- `backend/routes/` - Feature routes (`auth`, `doctors`, `rooms`, `triage`, etc.).
- `backend/config/` - DB and environment config helpers.

## License 📄
MIT License
