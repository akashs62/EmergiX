// EmergiX Doctor Dashboard — Functional Logic (Live Data)
// =============================================

const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : '';
const supabase = (window.supabase && window.EmergiXConfig.SUPABASE_URL) 
    ? window.supabase.createClient(window.EmergiXConfig.SUPABASE_URL, window.EmergiXConfig.SUPABASE_ANON_KEY) 
    : null;

// ── Data Store ──
const DB = {
    patients: [],
    appointments: [],
    notifications: [
        { id: 'N0', text: 'Welcome to your live dashboard!', time: 'Just now', type: 'info', read: false }
    ],
    schedule: {
        'Monday': [{ time: '9:00 AM - 12:00 PM', label: 'OPD', active: true }, { time: '2:00 PM - 5:00 PM', label: 'Consultations', active: true }],
        'Tuesday': [{ time: '9:00 AM - 1:00 PM', label: 'OPD', active: true }],
        'Wednesday': [{ time: '10:00 AM - 1:00 PM', label: 'Video Consults', active: true }, { time: '2:00 PM - 5:00 PM', label: 'OPD', active: true }],
        'Thursday': [{ time: '9:00 AM - 12:00 PM', label: 'OPD', active: true }, { time: '1:00 PM - 4:00 PM', label: 'Rounds', active: true }],
        'Friday': [{ time: '10:00 AM - 1:00 PM', label: 'Consultations', active: true }],
        'Saturday': [{ time: '9:00 AM - 12:00 PM', label: 'Emergency Only', active: true }],
        'Sunday': []
    },
    records: []
};

// ── State ──
let currentView = 'dashboard';
let notifOpen = false;
let consultationActive = false;
let consultationTimer = null;
let consultationSeconds = 0;
let docWebRTC = null;
let docCallConnected = false;
let docRoomId = null;
let docPeerState = 'new';
let docRemoteTrackStats = 'video 0, audio 0';

let activeCalls = [];
let activeRoomsInterval = null;

function getDoctorRemoteElements() {
    return {
        video: document.getElementById('doc-remote-video'),
        overlay: document.getElementById('doc-waiting-overlay'),
        placeholder: document.getElementById('doc-patient-feed-placeholder')
    };
}

function setDoctorRemoteWaiting(isWaiting) {
    const { overlay, placeholder } = getDoctorRemoteElements();
    if (overlay) overlay.style.display = isWaiting ? 'flex' : 'none';
    if (placeholder) placeholder.style.display = isWaiting ? 'flex' : 'none';
}

function updateDocMediaDebug(text) {
    const el = document.getElementById('doc-media-debug');
    if (el) el.textContent = text;
}

function renderDocMediaDebug() {
    updateDocMediaDebug(`Peer: ${docPeerState} | Remote: ${docRemoteTrackStats}`);
}

function enableDoctorRemoteAudioOnGesture() {
    const restoreAudio = () => {
        const remote = document.getElementById('doc-remote-video');
        if (remote) {
            remote.muted = false;
            remote.volume = 1;
            remote.play().catch(() => {});
        }
        document.removeEventListener('pointerdown', restoreAudio, true);
        document.removeEventListener('keydown', restoreAudio, true);
    };

    document.addEventListener('pointerdown', restoreAudio, true);
    document.addEventListener('keydown', restoreAudio, true);
}

async function attachDoctorLocalStream(stream) {
    const video = document.getElementById('doc-local-video');
    const placeholder = document.getElementById('doc-local-placeholder');
    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    try { await video.play(); } catch {}

    if (placeholder) placeholder.style.display = 'none';
    video.style.display = _docVideoOff ? 'none' : 'block';
}

function syncDoctorLocalPreview() {
    const video = document.getElementById('doc-local-video');
    const placeholder = document.getElementById('doc-local-placeholder');
    if (!video) return;

    video.style.display = _docVideoOff ? 'none' : 'block';
    if (placeholder) placeholder.style.display = _docVideoOff ? 'flex' : 'none';
}

async function attachDoctorRemoteStream(stream) {
    const { video } = getDoctorRemoteElements();
    if (!video || !stream) return;

    video.autoplay = true;
    video.playsInline = true;
    video.muted = false;
    video.volume = 1;
    video.srcObject = stream;
    setDoctorRemoteWaiting(false);
    const vCount = stream.getVideoTracks().length;
    const aCount = stream.getAudioTracks().length;
    const firstVideo = stream.getVideoTracks()[0];
    const videoState = firstVideo ? `${firstVideo.readyState}/${firstVideo.muted ? 'muted' : 'unmuted'}` : 'none';
    docRemoteTrackStats = `video ${vCount}, audio ${aCount}, state ${videoState}`;
    renderDocMediaDebug();

    try {
        await video.play();
        video.muted = false;
        video.volume = 1;
    } catch {
        // Autoplay fallback for strict browser policies.
        video.muted = true;
        try {
            await video.play();
            // Keep video running, then request user gesture to restore audio.
            enableDoctorRemoteAudioOnGesture();
        } catch {
            console.warn('[Doctor] Remote video autoplay blocked');
        }
    }

    stream.getVideoTracks().forEach((track) => {
        track.onended = () => setDoctorRemoteWaiting(true);
        track.onmute = () => setDoctorRemoteWaiting(true);
        track.onunmute = () => setDoctorRemoteWaiting(false);
    });

    // If media tracks exist but rendering stays black, rebind stream a few times.
    let retries = 0;
    const healTimer = setInterval(async () => {
        retries += 1;

        if (!consultationActive || video.srcObject !== stream) {
            clearInterval(healTimer);
            return;
        }

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            docRemoteTrackStats = `video ${vCount}, audio ${aCount}, frame ${video.videoWidth}x${video.videoHeight}`;
            renderDocMediaDebug();
            clearInterval(healTimer);
            return;
        }

        if (retries <= 6) {
            video.srcObject = null;
            video.srcObject = stream;
            try { await video.play(); } catch {}
            docRemoteTrackStats = `video ${vCount}, audio ${aCount}, rendering retry ${retries}`;
            renderDocMediaDebug();
            return;
        }

        clearInterval(healTimer);
    }, 1000);
}

// ── WebRTC State ──

// ─── ICE Config ───────────────────────────────────────────────────────────────
const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ─── Doctor WebRTC Manager ───────────────────────────────────────────────────
class DoctorWebRTC {
    constructor({ roomId, onLocalStream, onRemoteStream, onStatusChange, onChatMessage, onPeerLeft }) {
        this.roomId = roomId;
        this.onLocalStream = onLocalStream;
        this.onRemoteStream = onRemoteStream;
        this.onStatusChange = onStatusChange;
        this.onChatMessage = onChatMessage;
        this.onPeerLeft = onPeerLeft;
        this.pc = null;
        this.channel = null;
        this.localStream = null;
        this.remoteStream = new MediaStream();
        this._pendingCandidates = [];
        this._isMuted = false;
        this._isVideoOff = false;
        this._chatMessages = [];
    }

    async start() {
        this.onStatusChange('Accessing camera & microphone...');
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.onLocalStream(this.localStream);
        this.onStatusChange('Connecting to room...');

        if (!supabase) {
            console.error('Supabase client not loaded');
            this.onStatusChange('System Error: Realtime client not available.');
            return;
        }

        this.channel = supabase.channel(`webrtc:${this.roomId}`, {
            config: { broadcast: { ack: false } },
        });

        this.channel.on('broadcast', { event: 'signal' }, (payload) => {
            this._handleSignal(payload.payload);
        }).subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[Doctor] Channel subscribed');
                this.onStatusChange('Joined room — waiting for patient...');
                this._sendSignal({ type: 'hello', role: 'doctor' });
            }
        });
    }

    _sendSignal(msg) {
        if (this.channel) {
            this.channel.send({ type: 'broadcast', event: 'signal', payload: msg });
        }
    }

    _createPeerConnection() {
        const pc = new RTCPeerConnection(ICE_CONFIG);
        this.pc = pc;
        this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream));
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                this._sendSignal({ type: 'ice-candidate', candidate, role: 'doctor' });
            }
        };
        pc.ontrack = ({ track, streams }) => {
            if (streams && streams[0]) {
                this.remoteStream = streams[0];
                this.onRemoteStream(this.remoteStream);
                return;
            }
            this.remoteStream.addTrack(track);
            this.onRemoteStream(this.remoteStream);
        };
        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            docPeerState = s;
            renderDocMediaDebug();
            if (s === 'connected') this.onStatusChange('connected');
            if (s === 'disconnected' || s === 'failed') {
                this.onStatusChange('disconnected');
                this.onPeerLeft();
            }
        };
        return pc;
    }

    async _handleSignal(msg) {
        if (msg.role === 'doctor') return; // Ignore our own messages

        switch (msg.type) {
            case 'hello':
            case 'welcome':
                // Patient is ready, doctor sends offer
                if (msg.type === 'hello') this._sendSignal({ type: 'welcome', role: 'doctor' });
                this.onStatusChange('Patient ready — starting call...');
                if (!this.pc) this._createPeerConnection();
                const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                await this.pc.setLocalDescription(offer);
                this._sendSignal({ type: 'offer', sdp: this.pc.localDescription, role: 'doctor' });
                break;
            case 'answer':
                if (this.pc) {
                    await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    for (const c of this._pendingCandidates) {
                        await this.pc.addIceCandidate(new RTCIceCandidate(c));
                    }
                    this._pendingCandidates = [];
                    this.onStatusChange('Call connected');
                }
                break;
            case 'ice-candidate':
                if (this.pc && this.pc.remoteDescription) {
                    await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                } else {
                    this._pendingCandidates.push(msg.candidate);
                }
                break;
            case 'chat':
                this._chatMessages.push({ from: 'Patient', text: msg.text });
                this.onChatMessage({ from: 'Patient', text: msg.text });
                break;
            case 'end-call':
                this.onPeerLeft();
                break;
        }
    }

    sendChat(text) {
        this._sendSignal({ type: 'chat', text, role: 'doctor' });
    }

    toggleMute(muted) {
        this._isMuted = muted;
        if (this.localStream) this.localStream.getAudioTracks().forEach(t => { t.enabled = !muted; });
        this._sendSignal({ type: 'toggle-audio', muted, role: 'doctor' });
    }

    toggleVideo(videoOff) {
        this._isVideoOff = videoOff;
        if (this.localStream) this.localStream.getVideoTracks().forEach(t => { t.enabled = !videoOff; });
        this._sendSignal({ type: 'toggle-video', videoOff, role: 'doctor' });
    }

    endCall() {
        this._sendSignal({ type: 'end-call', role: 'doctor' });
        this.destroy();
    }

    destroy() {
        if (this.pc) { this.pc.close(); this.pc = null; }
        if (this.channel) { supabase.removeChannel(this.channel); this.channel = null; }
        if (this.localStream) { this.localStream.getTracks().forEach(t => t.stop()); this.localStream = null; }
        if (this.remoteStream) {
            this.remoteStream.getTracks().forEach(t => t.stop());
            this.remoteStream = new MediaStream();
        }
    }
}

async function setDoctorStatus(status) {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
        await fetch(`${API_Base}/api/doctors/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
    } catch (e) {
        console.error('Failed to update doctor status:', e);
    }
}

// ── Init ──
async function initDashboard() {
    populateUserInfo();
    bindSidebarNav();
    bindNotifications();
    bindTopActions();
    
    // Fetch real data
    await fetchLiveAppointments();
    
    // Set status
    setDoctorStatus('Available');

    // Handle abrupt exit
    window.addEventListener('beforeunload', () => {
        const userId = localStorage.getItem('userId');
        if (userId) navigator.sendBeacon(`${API_Base}/api/doctors/${userId}`, JSON.stringify({ status: 'Inactive' }));
    });
    
    showView('dashboard');
}

// ── Fetch Logic ──
async function fetchLiveAppointments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_Base}/api/appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.status === 'success') {
            // Map backend appointments to frontend format
            DB.appointments = result.data.map(a => {
                const dateObj = new Date(a.created_at);
                return {
                    id: a.appointment_id,
                    patientId: a.user_id || 'guest',
                    patient: a.patient_name,
                    time: a.appointment_time.split(' ')[0],
                    period: a.appointment_time.split(' ')[1] || 'PM',
                    type: a.symptoms,
                    status: a.status || 'confirmed',
                    date: a.appointment_date
                };
            });
            
            // Also derive unique patients from appointments if needed
            const patientMap = {};
            result.data.forEach(a => {
                if (!patientMap[a.patient_name]) {
                    patientMap[a.patient_name] = {
                        id: a.user_id || ('P-' + a.appointment_id),
                        name: a.patient_name,
                        age: a.patient_age,
                        gender: a.patient_sex,
                        phone: 'Live Client',
                        condition: a.symptoms,
                        status: 'Active',
                        lastVisit: a.appointment_date,
                        notes: 'Booked via EmergiX Portal'
                    };
                }
            });
            DB.patients = Object.values(patientMap);
            
            if (currentView === 'dashboard') renderDashboard();
        }
    } catch (err) {
        console.error('Failed to fetch appointments:', err);
    }
}

// ── User Info ──
function populateUserInfo() {
    const email = localStorage.getItem('userEmail') || 'doctor@emergix.com';
    const name = localStorage.getItem('userName') || email.split('@')[0];

    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const displayName = name.startsWith('Dr.') ? name : 'Dr. ' + name.charAt(0).toUpperCase() + name.slice(1);

    document.getElementById('greeting').textContent = `${greeting}, ${displayName}`;
    const now = new Date();
    document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const initials = displayName.replace('Dr. ', '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('user-avatar').textContent = initials || 'DR';
    document.getElementById('sidebar-name').textContent = displayName;
    
    const username = localStorage.getItem('username');
    if (document.getElementById('sidebar-username') && username) {
        document.getElementById('sidebar-username').textContent = `ID: ${username}`;
    }
}

// ── Sidebar Navigation ──
function bindSidebarNav() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            showView(view);
        });
    });
}

function showView(view) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (activeNav) activeNav.classList.add('active');

    document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');
    const panel = document.getElementById('view-' + view);
    if (panel) { panel.style.display = 'block'; panel.style.animation = 'fadeInUp 0.4s ease forwards'; }

    if (view === 'consultations') {
        startRoomPolling();
    } else {
        if (activeRoomsInterval) {
            clearInterval(activeRoomsInterval);
            activeRoomsInterval = null;
        }
    }

    switch (view) {
        case 'dashboard': renderDashboard(); break;
        case 'patients': renderPatients(); break;
        case 'consultations': renderConsultations(); break;
        case 'schedule': renderSchedule(); break;
        case 'records': renderRecords(); break;
        case 'settings': renderSettings(); break;
    }
}

// ── Toast ──
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => { if(t) t.className = 'toast'; }, 3500);
}

// ── Notifications ──
function bindNotifications() {
    const btn = document.querySelector('.notification-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        notifOpen = !notifOpen;
        document.getElementById('notif-panel').style.display = notifOpen ? 'block' : 'none';
        if (notifOpen) renderNotifications();
    });

    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notif-panel');
        if (notifOpen && !e.target.closest('.notification-btn') && !e.target.closest('#notif-panel')) {
            notifOpen = false;
            if(panel) panel.style.display = 'none';
        }
    });
}

function renderNotifications() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const unread = DB.notifications.filter(n => !n.read).length;
    const dot = document.querySelector('.notification-dot');
    if(dot) dot.style.display = unread > 0 ? 'block' : 'none';

    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
            <strong style="font-size:15px;">Notifications ${unread > 0 ? `<span style="background:#ef4444;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:6px;">${unread}</span>` : ''}</strong>
            <button onclick="markAllRead()" style="background:none;border:none;color:#4f46e5;font-size:13px;cursor:pointer;font-weight:600;">Mark all read</button>
        </div>
        <div style="max-height:340px;overflow-y:auto;">
            ${DB.notifications.length === 0 ? '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No new alerts</div>' : DB.notifications.map(n => `
                <div onclick="markNotifRead('${n.id}')" style="padding:14px 20px;border-bottom:1px solid #f1f5f9;cursor:pointer;background:${n.read ? '#fff' : '#faf5ff'};transition:background 0.2s;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${n.type === 'danger' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : n.type === 'success' ? '#10b981' : '#4f46e5'};flex-shrink:0;"></span>
                        <span style="font-size:13px;color:#1e293b;font-weight:${n.read ? '400' : '500'};">${n.text}</span>
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:6px;padding-left:18px;">${n.time}</div>
                </div>
            `).join('')}
        </div>`;
}

function markNotifRead(id) {
    const n = DB.notifications.find(x => x.id === id);
    if (n) n.read = true;
    renderNotifications();
}

function markAllRead() {
    DB.notifications.forEach(n => n.read = true);
    renderNotifications();
    showToast('All notifications marked as read', 'success');
}

// ── Top Actions ──
function bindTopActions() {
    const btn = document.getElementById('btn-start-consult');
    if (btn) btn.addEventListener('click', () => { showView('consultations'); });
}

// ── Dashboard View ──
function renderDashboard() {
    const activeCount = DB.patients.length;
    const todayAppts = DB.appointments.length;
    const pending = DB.appointments.filter(a => a.status === 'pending' || a.status === 'urgent').length;
    const emergencies = DB.appointments.filter(a => a.status === 'urgent').length;

    document.getElementById('stat-appointments').textContent = todayAppts;
    document.getElementById('stat-patients').textContent = activeCount;
    document.getElementById('stat-consultations').textContent = pending;
    document.getElementById('stat-alerts').textContent = emergencies;

    const list = document.getElementById('dashboard-appointments');
    if (DB.appointments.length === 0) {
        list.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;">No appointments scheduled today.</div>';
        return;
    }

    list.innerHTML = DB.appointments.slice(0, 5).map(a => `
        <div class="appointment-item" style="cursor:pointer" onclick="viewAppointment('${a.id}')">
            <div class="appt-time"><div class="appt-time-value">${a.time}</div><div class="appt-time-period">${a.period}</div></div>
            <div class="appt-info"><div class="appt-patient">${a.patient}</div><div class="appt-type">${a.type}</div></div>
            <span class="appt-status ${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
        </div>`).join('');
}

function viewAppointment(id) {
    const a = DB.appointments.find(x => x.id === id);
    if (!a) return;
    const p = DB.patients.find(x => x.id === a.patientId);

    openModal(`
        <h3 style="margin-bottom:4px;">Appointment Details</h3>
        <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${a.time} ${a.period} · <span class="appt-status ${a.status}" style="font-size:11px;">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span></p>
        <div style="background:#faf9ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #ede9fe;">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px;">${a.patient}</div>
            <div style="color:#64748b;font-size:13px;">Reason: ${a.type}</div>
            <div style="color:#64748b;font-size:13px;margin-top:4px;">Date: ${a.date}</div>
            ${p ? `<div style="color:#64748b;font-size:13px;margin-top:4px;">${p.age} yrs · ${p.gender}</div>` : ''}
        </div>
        <div style="display:flex;gap:10px;">
            ${a.status === 'pending' ? `<button onclick="updateApptStatus('${a.id}','confirmed')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:600;cursor:pointer;">✓ Confirm</button>` : ''}
            ${a.status !== 'completed' ? `<button onclick="updateApptStatus('${a.id}','completed')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-weight:600;cursor:pointer;">Mark Complete</button>` : ''}
            <button onclick="updateApptStatus('${a.id}','cancelled')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#fee2e2;color:#ef4444;font-weight:600;cursor:pointer;">Cancel</button>
        </div>
    `);
}

function updateApptStatus(id, status) {
    const a = DB.appointments.find(x => x.id === id);
    if (a) a.status = status;
    closeModal();
    showToast(`Appointment ${status}`, 'success');
    if (currentView === 'schedule') renderSchedule();
    if (currentView === 'settings') renderSettings();

    // Start room polling if view is consultations
    if (currentView === 'consultations') {
        startRoomPolling();
    } else {
        if (activeRoomsInterval) clearInterval(activeRoomsInterval);
        activeRoomsInterval = null;
    }
}

// ── Patients View ──
function renderPatients(filter = '') {
    const panel = document.getElementById('view-patients');
    const filtered = filter ? DB.patients.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.condition.toLowerCase().includes(filter.toLowerCase())) : DB.patients;

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Patient Records</h2>
        <div style="display:flex;gap:12px;margin-bottom:24px;">
            <input type="text" id="patient-search" placeholder="Search patients by name or condition..." value="${filter}" oninput="renderPatients(this.value)"
                style="flex:1;padding:10px 16px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="addPatientPrompt()" style="padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:14px;">+ Add Patient</button>
        </div>
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="text-align:left;padding:14px 20px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Patient</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Condition</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Status</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Last Visit</th>
                    <th style="text-align:center;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Actions</th>
                </tr></thead>
                <tbody>${filtered.map(p => `
                    <tr style="border-top:1px solid #f1f5f9;transition:background 0.2s;" onmouseover="this.style.background='#faf9ff'" onmouseout="this.style.background='#fff'">
                        <td style="padding:14px 20px;"><div style="font-weight:600;font-size:14px;">${p.name}</div><div style="font-size:12px;color:#94a3b8;">${p.age} yrs · ${p.gender}</div></td>
                        <td style="padding:14px 16px;font-size:13px;color:#475569;">${p.condition}</td>
                        <td style="padding:14px 16px;"><span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${p.status === 'Critical' ? 'rgba(239,68,68,0.1)' : p.status === 'Active' ? 'rgba(79,70,229,0.1)' : 'rgba(16,185,129,0.1)'};color:${p.status === 'Critical' ? '#ef4444' : p.status === 'Active' ? '#4f46e5' : '#10b981'};">${p.status}</span></td>
                        <td style="padding:14px 16px;font-size:13px;color:#64748b;">${p.lastVisit}</td>
                        <td style="padding:14px 16px;text-align:center;">
                            <button onclick="viewPatient('${p.id}')" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-weight:600;color:#4f46e5;">View</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
            ${filtered.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">No real-time patient data available. Records are populated as appointments are made.</div>' : ''}
        </div>`;
}

function viewPatient(id) {
    const p = DB.patients.find(x => x.id === id);
    if (!p) return;
    openModal(`
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
            <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">${p.name.split(' ').map(n => n[0]).join('')}</div>
            <div><div style="font-weight:700;font-size:18px;">${p.name}</div><div style="color:#64748b;font-size:13px;">${p.age} yrs · ${p.gender}</div></div>
        </div>
        <div style="background:#faf9ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #ede9fe;">
            <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Condition</div>
            <div style="font-weight:600;font-size:15px;">${p.condition}</div>
            <div style="font-size:13px;color:#64748b;margin-top:10px;margin-bottom:4px;">Notes</div>
            <div style="font-size:14px;">${p.notes}</div>
        </div>
    `);
}

function addPatientPrompt() {
    openModal(`
        <h3 style="margin-bottom:16px;">Add Patient Record</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <input id="np-name" placeholder="Full Name" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <div style="display:flex;gap:10px;">
                <input id="np-age" type="number" placeholder="Age" style="flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
                <select id="np-gender" style="flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>
            </div>
            <input id="np-condition" placeholder="Clinical Condition" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="saveNewPatient()" style="padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:15px;margin-top:4px;">Create Record</button>
        </div>
    `);
}

function saveNewPatient() {
    const name = document.getElementById('np-name').value.trim();
    const age = parseInt(document.getElementById('np-age').value);
    const gender = document.getElementById('np-gender').value;
    const condition = document.getElementById('np-condition').value.trim();
    if (!name || !age || !condition) { showToast('Please fill all fields', 'warning'); return; }
    DB.patients.push({ id: 'P' + Date.now(), name, age, gender, status: 'Active', condition, lastVisit: new Date().toISOString().split('T')[0], notes: 'Manually added record.' });
    closeModal();
    showToast('Patient record created locally.', 'success');
    renderPatients();
}

// ── Consultations View ──
function startRoomPolling() {
    if (activeRoomsInterval) clearInterval(activeRoomsInterval);
    const fetchRooms = async () => {
        if (currentView !== 'consultations' || consultationActive) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_Base}/api/rooms/active`, { headers: { 'Authorization': 'Bearer ' + token } });
            const data = await res.json();
            if (data.status === 'success') {
                const newString = JSON.stringify(data.activeRooms);
                const oldString = JSON.stringify(activeCalls);
                if (oldString !== newString) {
                    activeCalls = data.activeRooms;
                    renderConsultations();
                }
            }
        } catch(e) {}
    };
    fetchRooms();
    activeRoomsInterval = setInterval(fetchRooms, 3000);
}

function renderConsultations() {
    const panel = document.getElementById('view-consultations');
    const pending = DB.appointments.filter(a => a.status === 'pending' || a.status === 'urgent');

    if (consultationActive) {
        // Show full-screen call UI
        renderActiveConsultation();
        return;
    }

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Virtual Consultations</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
            <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">📋 Queued Consultations</h3>
                ${pending.length === 0 ? '<p style="color:#94a3b8;font-size:14px;">No active queue.</p>' : pending.map(a => `
                    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:#faf9ff;border-radius:10px;margin-bottom:10px;border:1px solid #ede9fe;">
                        <div style="flex:1;"><div style="font-weight:600;font-size:14px;">${a.patient}</div><div style="font-size:12px;color:#64748b;">${a.type}</div></div>
                        <button onclick="startConsultation('${a.id}')" style="padding:8px 16px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">🎥 Enter Room</button>
                    </div>`).join('')}
            </div>
            <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;">🚨 Incoming Live Calls</h3>
                <p style="color:#64748b;font-size:13px;margin-bottom:14px;">Instant connection mapped from patient bookings.</p>
                <div id="incoming-calls-container">
                    ${activeCalls.length === 0 ? '<div style="padding:14px;background:#f8fafc;border-radius:8px;color:#94a3b8;font-size:13px;text-align:center;">No incoming active calls.</div>' : activeCalls.map(room => `
                    <div style="padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:12px;display:flex;flex-direction:column;gap:12px;">
                        <div>
                            <div style="font-weight:700;color:#1e3a8a;font-size:15px;margin-bottom:2px;">Incoming from: ${room.patientName}</div>
                            <div style="font-size:12px;color:#3b82f6;">Room ID: ${room.roomId}</div>
                        </div>
                        <button onclick="launchDoctorCall('${room.roomId}', '${room.patientName}')" style="width:100%;padding:12px;border:none;border-radius:10px;background:#10b981;color:#fff;font-weight:700;cursor:pointer;font-size:14px;box-shadow:0 4px 6px -1px rgba(16,185,129,0.3);">
                            ▶ Join Call Instantly
                        </button>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:18px 22px;color:#166534;font-size:13px;">
            💡 <strong>How it works:</strong> Patient books & pays → The backend connects them to a private room mapped to your account → Click "Join Call Instantly" to enter.
        </div>`;
}

function startConsultation(apptId) {
    const a = DB.appointments.find(x => x.id === apptId);
    if (!a) return;
    a.status = 'in-progress';
    // For appointment-based calls, patient would have created the room — prompt doctor for room ID
    const rid = prompt(`Enter the Room ID provided by patient ${a.patient}:`);
    if (!rid || !rid.trim()) return;
    window._currentConsultPatient = a.patient;
    window._currentConsultApptId = a.id;
    launchDoctorCall(rid.trim(), a.patient);
}



async function launchDoctorCall(roomId, patientName) {
    docRoomId = roomId;
    consultationActive = true;
    consultationSeconds = 0;
    docCallConnected = false;
    docPeerState = 'connecting';
    docRemoteTrackStats = 'video 0, audio 0';
    renderConsultations();
    setDoctorRemoteWaiting(true);
    renderDocMediaDebug();
    setDoctorStatus('Busy');

    // Start WebRTC
    try {
        docWebRTC = new DoctorWebRTC({
            roomId,
            onLocalStream: (stream) => {
                attachDoctorLocalStream(stream);
            },
            onRemoteStream: (stream) => {
                attachDoctorRemoteStream(stream);
                docCallConnected = true;
                updateDocCallStatus('Call connected — Live');
                startDocTimer();
            },
            onStatusChange: (s) => updateDocCallStatus(s),
            onChatMessage: (msg) => appendDocChat(msg),
            onPeerLeft: () => {
                updateDocCallStatus('Patient left the call');
                setTimeout(() => endConsultation(), 2000);
            }
        });
        await docWebRTC.start();

        // If connected but no remote video track arrives, surface it clearly.
        setTimeout(() => {
            if (!consultationActive) return;
            if (!docCallConnected && docPeerState === 'connected') {
                updateDocCallStatus('Connected, but no patient media track received');
                showToast('Patient video not received. Ask patient to re-enable camera and rejoin.', 'warning');
            }
        }, 8000);
    } catch(err) {
        console.error('Doctor WebRTC failed:', err);
        showToast('Camera/mic access denied. Check permissions.', 'danger');
        consultationActive = false;
        renderConsultations();
    }
}

function startDocTimer() {
    clearInterval(consultationTimer);
    consultationTimer = setInterval(() => {
        consultationSeconds++;
        const el = document.getElementById('doc-call-timer');
        if (el) el.textContent = formatTime(consultationSeconds);
    }, 1000);
}

function updateDocCallStatus(status) {
    const el = document.getElementById('doc-call-status');
    if (el) el.textContent = status;
}

function appendDocChat(msg) {
    const body = document.getElementById('doc-chat-body');
    if (!body) return;
    const div = document.createElement('div');
    div.style.cssText = `display:flex;flex-direction:column;gap:2px;margin-bottom:8px;align-items:${msg.from === 'You' ? 'flex-end':'flex-start'};`;
    div.innerHTML = `<span style="font-size:0.7rem;color:#64748b;">${msg.from}</span><span style="padding:8px 12px;border-radius:12px;font-size:0.85rem;background:${msg.from==='You'?'#4f46e5':'#1e293b'};color:${msg.from==='You'?'white':'#cbd5e1'};">${msg.text}</span>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function renderActiveConsultation() {
    const panel = document.getElementById('view-consultations');
    const patientName = window._currentConsultPatient || 'Patient';

    panel.innerHTML = `
    <div style="position:relative;width:100%;height:calc(100vh - 260px);min-height:620px;background:#0a0f1e;z-index:20;display:flex;flex-direction:column;font-family:'Inter',sans-serif;border-radius:18px;overflow:hidden;">
        <!-- Header -->
        <div style="background:rgba(10,15,30,0.95);padding:14px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;animation:pulse-d 1.5s infinite;flex-shrink:0;"></div>
                <div>
                    <div style="font-weight:600;font-size:1.05rem;color:white;">${patientName}</div>
                    <div style="font-size:0.8rem;color:#64748b;">Patient — Video Consultation</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
                <div id="doc-call-status" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);padding:4px 12px;border-radius:20px;font-size:0.78rem;color:#94a3b8;">Connecting...</div>
                <div style="background:rgba(255,255,255,0.08);padding:6px 14px;border-radius:6px;font-family:monospace;font-size:1rem;color:white;">
                    ● <span id="doc-call-timer">00:00</span>
                </div>
            </div>
        </div>
        <!-- Room ID bar -->
        <div style="background:rgba(79,70,229,0.12);border-bottom:1px solid rgba(79,70,229,0.2);padding:8px 24px;display:flex;align-items:center;gap:10px;color:#a78bfa;font-size:0.82rem;">
            <span>Room:</span>
            <code style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:2px 10px;border-radius:5px;font-family:monospace;color:#c4b5fd;">${docRoomId}</code>
            <span id="doc-media-debug" style="margin-left:auto;color:#93c5fd;font-size:0.78rem;">Peer: connecting | Remote: video 0, audio 0</span>
        </div>
        <!-- Call Body -->
        <div style="flex:1;display:flex;padding:14px;gap:14px;overflow:hidden;min-height:420px;">
            <!-- Main Video -->
            <div style="flex:3;background:#111827;border-radius:20px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);min-height:380px;">
                <!-- Remote (Patient) video -->
                <video id="doc-remote-video" autoplay playsinline style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:20px;display:block;z-index:5;background:#000;transform:translateZ(0);"></video>
                <div id="doc-patient-feed-placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;background:linear-gradient(180deg, #0f172a, #111827);color:#94a3b8;font-size:0.95rem;letter-spacing:0.02em;">Patient feed will appear here</div>
                <!-- Waiting overlay -->
                <div id="doc-waiting-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:2;background:linear-gradient(180deg, rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.6));">
                    <div style="position:absolute;width:110px;height:110px;border-radius:50%;border:2px solid rgba(79,70,229,0.4);animation:pulse-d 2s ease infinite;"></div>
                    <div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#1e3a5f,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:700;color:white;z-index:2;">${patientName.charAt(0).toUpperCase()}</div>
                    <p style="color:#94a3b8;font-size:1rem;z-index:2;">Waiting for patient to connect...</p>
                </div>
                <!-- Patient name label -->
                <div style="position:absolute;bottom:16px;left:16px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);color:white;font-size:0.75rem;padding:3px 10px;border-radius:6px;z-index:3;">${patientName} (Patient)</div>
                <!-- Local PiP -->
                <div style="position:absolute;bottom:20px;right:20px;width:220px;height:146px;background:#1e293b;border-radius:14px;border:2px solid rgba(255,255,255,0.25);overflow:hidden;z-index:8;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                    <video id="doc-local-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
                    <div id="doc-local-placeholder" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:6px;background:#111827;color:#cbd5e1;font-size:0.78rem;">
                        <span style="font-size:1.4rem;">📷</span>
                        <span>Camera Off</span>
                    </div>
                    <div style="position:absolute;bottom:6px;left:8px;background:rgba(0,0,0,0.6);color:white;font-size:0.7rem;padding:2px 8px;border-radius:5px;">You (Dr.)</div>
                </div>
            </div>
            <!-- Chat Sidebar -->
            <div style="flex:1;background:#111827;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;max-width:320px;min-width:220px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                <div style="padding:14px;background:rgba(255,255,255,0.05);color:white;font-weight:600;font-size:0.9rem;border-bottom:1px solid rgba(255,255,255,0.07);">💬 Consultation Chat</div>
                <div id="doc-chat-body" style="flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin;scrollbar-color:#334155 transparent;">
                    <div style="text-align:center;color:#475569;font-size:0.82rem;padding:10px;">Chat will activate when patient joins.</div>
                </div>
                <div style="padding:12px;background:rgba(0,0,0,0.3);display:flex;gap:8px;border-top:1px solid rgba(255,255,255,0.05);">
                    <input id="doc-chat-input" type="text" placeholder="Type a message..." style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);padding:9px 12px;border-radius:10px;color:white;outline:none;font-size:0.83rem;font-family:'Inter',sans-serif;" onkeydown="if(event.key==='Enter')sendDocChat()">
                    <button onclick="sendDocChat()" style="width:42px;height:42px;border-radius:50%;border:none;background:#4f46e5;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
        </div>
        <!-- Controls -->
        <div style="padding:16px;background:rgba(10,15,30,0.95);display:flex;justify-content:center;gap:16px;align-items:center;border-top:1px solid rgba(255,255,255,0.06);">
            <button id="doc-mute-btn" onclick="docToggleMute()" style="width:56px;height:56px;border-radius:50%;border:none;background:#1e293b;border:1px solid rgba(255,255,255,0.1);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" title="Mute">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 1a4 4 0 014 4v5a4 4 0 01-8 0V5a4 4 0 014-4z" fill="white"/><path d="M19 10a7 7 0 01-14 0" stroke="white" stroke-width="2"/><line x1="12" y1="17" x2="12" y2="21" stroke="white" stroke-width="2"/></svg>
            </button>
            <button id="doc-video-btn" onclick="docToggleVideo()" style="width:56px;height:56px;border-radius:50%;border:none;background:#1e293b;border:1px solid rgba(255,255,255,0.1);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" title="Video">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M16 3H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z" fill="white"/><path d="M22 8.5l-4 3 4 3V8.5z" fill="white"/></svg>
            </button>
            <button onclick="endConsultation()" style="width:68px;height:68px;border-radius:50%;border:none;background:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(239,68,68,0.4);transition:all 0.2s;" title="End Call">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C9.6 21 3 14.4 3 6c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="white"/></svg>
            </button>
            <button onclick="docShareScreen()" style="width:56px;height:56px;border-radius:50%;border:none;background:#1e293b;border:1px solid rgba(255,255,255,0.1);cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Share Screen">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="white" stroke-width="2"/><path d="M8 21h8M12 17v4" stroke="white" stroke-width="2"/></svg>
            </button>
        </div>
        <style>@keyframes pulse-d { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.4)} }</style>
    </div>`;
}

function sendDocChat() {
    const input = document.getElementById('doc-chat-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    appendDocChat({ from: 'You', text });
    if (docWebRTC) docWebRTC.sendChat(text);
    input.value = '';
}

let _docMuted = false;
function docToggleMute() {
    _docMuted = !_docMuted;
    if (docWebRTC) docWebRTC.toggleMute(_docMuted);
    const btn = document.getElementById('doc-mute-btn');
    if (btn) btn.style.background = _docMuted ? '#1d4ed8' : '#1e293b';
    showToast(_docMuted ? 'Microphone muted' : 'Microphone on', 'info');
}

let _docVideoOff = false;
function docToggleVideo() {
    _docVideoOff = !_docVideoOff;
    if (docWebRTC) docWebRTC.toggleVideo(_docVideoOff);
    syncDoctorLocalPreview();
    const btn = document.getElementById('doc-video-btn');
    if (btn) btn.style.background = _docVideoOff ? '#1d4ed8' : '#1e293b';
    showToast(_docVideoOff ? 'Camera off' : 'Camera on', 'info');
}

function docShareScreen() {
    showToast('Screen sharing requires HTTPS — available in production.', 'warning');
}

function endConsultation() {
    clearInterval(consultationTimer);
    consultationActive = false;
    docCallConnected = false;
    _docMuted = false;
    _docVideoOff = false;
    if (docWebRTC) { docWebRTC.endCall(); docWebRTC = null; }
    if (window._currentConsultApptId) {
        const a = DB.appointments.find(x => x.id === window._currentConsultApptId);
        if (a) a.status = 'completed';
    }
    const duration = formatTime(consultationSeconds);
    consultationSeconds = 0;
    docRoomId = null;
    setDoctorStatus('Available');
    showToast(`Session completed. Duration: ${duration}`, 'success');
    showView('consultations');
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Schedule View ──
function renderSchedule() {
    const panel = document.getElementById('view-schedule');
    const days = Object.keys(DB.schedule);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">My Availability</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
            ${days.map(day => `
                <div style="background:#fff;border-radius:16px;border:1px solid ${day === today ? '#4f46e5' : '#e2e8f0'};padding:20px;">
                    <div style="font-weight:700;font-size:15px;margin-bottom:14px;${day === today ? 'color:#4f46e5;' : ''}">${day}</div>
                    ${DB.schedule[day].length === 0 ? '<div style="color:#94a3b8;font-size:13px;">No slots</div>' : DB.schedule[day].map((slot, i) => `
                        <div style="padding:10px 12px;background:${slot.active ? '#faf9ff' : '#f8fafc'};border-radius:8px;margin-bottom:8px;border:1px solid ${slot.active ? '#ede9fe' : '#e2e8f0'};">
                            <div style="font-size:13px;font-weight:600;">${slot.time}</div><div style="font-size:12px;color:#64748b;">${slot.label}</div>
                        </div>`).join('')}
                </div>`).join('')}
        </div>`;
}

// ── Records View ──
function renderRecords(filter = '') {
    const panel = document.getElementById('view-records');
    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Clinical Records</h2>
        <div style="padding:40px;text-align:center;color:#94a3b8;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
            No historical records found for your account.
        </div>`;
}

// ── Settings View ──
function renderSettings() {
    const panel = document.getElementById('view-settings');
    const email = localStorage.getItem('userEmail') || '';
    const name = localStorage.getItem('userName') || '';
    const age = localStorage.getItem('userAge') || '';
    const exp = localStorage.getItem('userExperience') || '';
    const fee = localStorage.getItem('userFee') || '';

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Settings</h2>
        <div style="max-width:600px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:20px;">Profile</h3>
            <div style="display:flex;flex-direction:column;gap:14px;">
                <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Name</label>
                    <input disabled value="${name}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>
                <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Email</label>
                    <input disabled value="${email}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Age</label>
                        <input id="settings-age" type="number" value="${age}" placeholder="e.g. 35" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;"></div>
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Experience (Years)</label>
                        <input id="settings-exp" type="number" value="${exp}" placeholder="e.g. 10" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;"></div>
                </div>
                <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Consultation Fee (₹)</label>
                    <input id="settings-fee" type="number" value="${fee}" placeholder="e.g. 500" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;"></div>

                <div style="margin-top:10px;">
                    <button id="btn-save-settings" onclick="saveDoctorProfile()" style="width:100%;padding:12px;border:none;border-radius:10px;color:#fff;background:var(--grad-brand);font-weight:600;cursor:pointer;margin-bottom:10px;transition:0.3s;">Save Changes</button>
                    <button onclick="logout()" style="width:100%;padding:12px;border:1px solid #ef4444;border-radius:10px;color:#ef4444;background:#fff;font-weight:600;cursor:pointer;">Sign Out</button>
                </div>
            </div>
        </div>`;
}

async function saveDoctorProfile() {
    const btn = document.getElementById('btn-save-settings');
    const age = document.getElementById('settings-age').value;
    const exp = document.getElementById('settings-exp').value;
    const fee = document.getElementById('settings-fee').value;
    const userId = localStorage.getItem('userId');

    if (!userId) {
        alert('User ID is missing. Please sign out and sign in again.');
        return;
    }

    const payload = {};
    if (age !== '') payload.age = parseInt(age, 10);
    if (exp !== '') payload.experience = parseInt(exp, 10);
    if (fee !== '') payload.fee = parseInt(fee, 10);

    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_Base}/api/doctors/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            btn.innerText = 'Saved!';
            btn.style.background = '#27ae60';
            
            // Update local storage so it persists on reload
            if (payload.age !== undefined) localStorage.setItem('userAge', payload.age);
            if (payload.experience !== undefined) localStorage.setItem('userExperience', payload.experience);
            if (payload.fee !== undefined) localStorage.setItem('userFee', payload.fee);
        } else {
            alert(data.error || 'Failed to save settings.');
            btn.innerText = originalText;
        }
    } catch (err) {
        console.error('Save error:', err);
        alert('Server error while saving.');
        btn.innerText = originalText;
    }

    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = 'var(--grad-brand)';
        btn.disabled = false;
    }, 2000);
}

// ── Modal ──
function openModal(content) {
    const m = document.getElementById('dashboard-modal');
    const body = document.getElementById('modal-body');
    if(!m || !body) return;
    body.innerHTML = content;
    m.style.display = 'flex';
    setTimeout(() => m.style.opacity = '1', 10);
}

function closeModal() {
    const m = document.getElementById('dashboard-modal');
    if(!m) return;
    m.style.opacity = '0';
    setTimeout(() => m.style.display = 'none', 250);
}

async function logout() {
    await setDoctorStatus('Inactive');
    localStorage.clear();
    window.location.href = 'signin.html';
}

document.addEventListener('DOMContentLoaded', initDashboard);
