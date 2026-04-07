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
1. **Clone the repository.**
2. **Start the local server**: 
   Since EmergiX utilizes external API requests and React `.jsx` via Babel, it must be accessed on a local server (e.g., using `serve` or `live-server`).
   ```bash
   npx serve . -p 3000
   ```
3. Navigate to `http://localhost:3000` via your browser.

## File Structure 📁
- `index.html` / `app.js` / `style.css` - Main Landing Page & interactions.
- `ambulance-dispatch.html/jsx/css` - Fleet routing & live Leaflet map simulation.
- `video-consultation.html/jsx/css` - Triage call and mock consultation flow.
- `server.js` - Lightweight Express backend for auth testing (`signup.html` / `signin.html`).

## License 📄
MIT License
