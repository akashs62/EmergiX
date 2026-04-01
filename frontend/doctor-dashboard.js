// EmergiX Doctor Dashboard — Functional Logic (Live Data)
// =============================================

const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : '';

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

// ── Init ──
async function initDashboard() {
    populateUserInfo();
    bindSidebarNav();
    bindNotifications();
    bindTopActions();
    
    // Fetch real data
    await fetchLiveAppointments();
    
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
    if (currentView === 'dashboard') renderDashboard();
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
function renderConsultations() {
    const panel = document.getElementById('view-consultations');
    const pending = DB.appointments.filter(a => a.status === 'pending' || a.status === 'urgent');

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Virtual Consultations</h2>
        <div id="consultation-area">
            ${consultationActive ? '' : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
                <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
                    <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Queued Consultations</h3>
                    ${pending.length === 0 ? '<p style="color:#94a3b8;font-size:14px;">No active queue.</p>' : pending.map(a => `
                        <div style="display:flex;align-items:center;gap:12px;padding:14px;background:#faf9ff;border-radius:10px;margin-bottom:10px;border:1px solid #ede9fe;">
                            <div style="flex:1;"><div style="font-weight:600;font-size:14px;">${a.patient}</div><div style="font-size:12px;color:#64748b;">${a.type}</div></div>
                            <button onclick="startConsultation('${a.id}')" style="padding:8px 16px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Enter Room</button>
                        </div>`).join('')}
                </div>
                <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
                    <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Quick Start</h3>
                    <p style="color:#64748b;font-size:14px;margin-bottom:16px;">Start session with patient</p>
                    <select id="consult-patient-select" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:12px;font-family:'Inter',sans-serif;">
                        ${DB.patients.length === 0 ? '<option>No patients available</option>' : DB.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                    <button onclick="startQuickConsult()" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:14px;">▶ Start HD Video Call</button>
                </div>
            </div>`}
        </div>
        <div id="active-consultation" style="display:${consultationActive ? 'block' : 'none'};"></div>`;

    if (consultationActive) renderActiveConsultation();
}

function startConsultation(apptId) {
    const a = DB.appointments.find(x => x.id === apptId);
    if (!a) return;
    a.status = 'in-progress';
    consultationActive = true;
    consultationSeconds = 0;
    consultationTimer = setInterval(() => {
        consultationSeconds++;
        const el = document.getElementById('consult-timer');
        if (el) el.textContent = formatTime(consultationSeconds);
    }, 1000);
    window._currentConsultPatient = a.patient;
    window._currentConsultApptId = a.id;
    renderConsultations();
}

function startQuickConsult() {
    const select = document.getElementById('consult-patient-select');
    const pid = select.value;
    const p = DB.patients.find(x => x.id === pid);
    if (!p) return;
    consultationActive = true;
    consultationSeconds = 0;
    consultationTimer = setInterval(() => {
        consultationSeconds++;
        const el = document.getElementById('consult-timer');
        if (el) el.textContent = formatTime(consultationSeconds);
    }, 1000);
    window._currentConsultPatient = p.name;
    window._currentConsultApptId = null;
    renderConsultations();
}

function renderActiveConsultation() {
    const area = document.getElementById('active-consultation');
    area.style.display = 'block';
    area.innerHTML = `
        <div style="background:#1e1b4b;border-radius:16px;padding:32px;color:#fff;margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div><div style="font-size:13px;color:#a78bfa;font-weight:600;margin-bottom:4px;">LIVE SESSION</div>
                    <div style="font-size:22px;font-weight:700;">${window._currentConsultPatient || 'Patient'}</div></div>
                <div style="text-align:center;"><div style="font-size:12px;color:#a78bfa;margin-bottom:4px;">Time</div>
                    <div id="consult-timer" style="font-size:28px;font-weight:700;font-family:'Poppins',sans-serif;">${formatTime(consultationSeconds)}</div></div>
            </div>
            <div style="background:rgba(255,255,255,0.08);border-radius:12px;height:280px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <div style="text-align:center;"><div style="font-size:48px;margin-bottom:8px;">📹</div><div style="color:#a78bfa;font-size:14px;">Patient stream connected</div></div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button onclick="toggleMute(this)" style="padding:12px 24px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-weight:600;font-size:14px;">🎤 Mute</button>
                <button onclick="toggleVideo(this)" style="padding:12px 24px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-weight:600;font-size:14px;">📷 Video</button>
                <button onclick="endConsultation()" style="padding:12px 24px;border:none;border-radius:10px;background:#ef4444;color:#fff;cursor:pointer;font-weight:700;font-size:14px;">✕ End Session</button>
            </div>
        </div>`;
}

function toggleMute(btn) { btn.textContent = btn.textContent.includes('Mute') ? '🔇 Unmute' : '🎤 Mute'; }
function toggleVideo(btn) { btn.textContent = btn.textContent.includes('Video') ? '📷 Cam Off' : '📷 Video'; }

function endConsultation() {
    clearInterval(consultationTimer);
    consultationActive = false;
    if (window._currentConsultApptId) {
        const a = DB.appointments.find(x => x.id === window._currentConsultApptId);
        if (a) a.status = 'completed';
    }
    showToast(`Session completed.`, 'success');
    consultationSeconds = 0;
    renderConsultations();
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

function logout() {
    localStorage.clear();
    window.location.href = 'signin.html';
}

document.addEventListener('DOMContentLoaded', initDashboard);
