// =============================================
// EmergiX Doctor Dashboard — Functional Logic
// =============================================

// ── Mock Data Store ──
const DB = {
    patients: [
        { id: 'P001', name: 'Rahul Sharma', age: 45, gender: 'Male', phone: '+91 98765 43210', condition: 'Cardiac Arrhythmia', status: 'Active', lastVisit: '2026-03-10', notes: 'Regular follow-up needed. On beta-blockers.' },
        { id: 'P002', name: 'Priya Patel', age: 32, gender: 'Female', phone: '+91 87654 32109', condition: 'Chest Pain (Non-cardiac)', status: 'Active', lastVisit: '2026-03-11', notes: 'Anxiety-related. Referred to counseling.' },
        { id: 'P003', name: 'Amit Kumar', age: 28, gender: 'Male', phone: '+91 76543 21098', condition: 'Head Injury — Concussion', status: 'Critical', lastVisit: '2026-03-12', notes: 'Admitted via ER. CT scan clear. Under observation.' },
        { id: 'P004', name: 'Neha Gupta', age: 56, gender: 'Female', phone: '+91 65432 10987', condition: 'Post-Surgery Recovery', status: 'Active', lastVisit: '2026-03-09', notes: 'Appendectomy recovery. Wound healing well.' },
        { id: 'P005', name: 'Vikram Singh', age: 63, gender: 'Male', phone: '+91 54321 09876', condition: 'Type 2 Diabetes', status: 'Stable', lastVisit: '2026-03-08', notes: 'HbA1c at 7.2%. Adjusted metformin dose.' },
        { id: 'P006', name: 'Ananya Reddy', age: 24, gender: 'Female', phone: '+91 43210 98765', condition: 'Asthma Exacerbation', status: 'Active', lastVisit: '2026-03-11', notes: 'Prescribed inhaler. Follow-up in 1 week.' },
        { id: 'P007', name: 'Suresh Menon', age: 71, gender: 'Male', phone: '+91 32109 87654', condition: 'Hypertension', status: 'Stable', lastVisit: '2026-03-07', notes: 'BP controlled with current medication.' },
        { id: 'P008', name: 'Kavita Joshi', age: 38, gender: 'Female', phone: '+91 21098 76543', condition: 'Migraine', status: 'Active', lastVisit: '2026-03-12', notes: 'Recurring episodes. Started prophylactic treatment.' }
    ],
    appointments: [
        { id: 'A001', patientId: 'P001', patient: 'Rahul Sharma', time: '9:00', period: 'AM', type: 'Follow-up · Cardiac Checkup', status: 'confirmed' },
        { id: 'A002', patientId: 'P002', patient: 'Priya Patel', time: '10:30', period: 'AM', type: 'Video Consultation · Chest Pain', status: 'pending' },
        { id: 'A003', patientId: 'P003', patient: 'Amit Kumar', time: '11:45', period: 'AM', type: 'Emergency Triage · Head Injury', status: 'urgent' },
        { id: 'A004', patientId: 'P004', patient: 'Neha Gupta', time: '2:00', period: 'PM', type: 'Post-discharge Review · Surgery', status: 'confirmed' },
        { id: 'A005', patientId: 'P005', patient: 'Vikram Singh', time: '3:30', period: 'PM', type: 'Routine · Diabetes Management', status: 'confirmed' },
        { id: 'A006', patientId: 'P006', patient: 'Ananya Reddy', time: '4:15', period: 'PM', type: 'Follow-up · Asthma', status: 'pending' },
        { id: 'A007', patientId: 'P008', patient: 'Kavita Joshi', time: '5:00', period: 'PM', type: 'Urgent · Migraine Episode', status: 'urgent' },
        { id: 'A008', patientId: 'P007', patient: 'Suresh Menon', time: '5:45', period: 'PM', type: 'Routine · BP Check', status: 'confirmed' }
    ],
    notifications: [
        { id: 'N001', text: 'Emergency: Amit Kumar admitted with head injury', time: '15 min ago', type: 'danger', read: false },
        { id: 'N002', text: 'Kavita Joshi reported severe migraine episode', time: '32 min ago', type: 'warning', read: false },
        { id: 'N003', text: 'Lab results ready for Rahul Sharma', time: '1 hour ago', type: 'info', read: false },
        { id: 'N004', text: 'Priya Patel confirmed 10:30 AM appointment', time: '2 hours ago', type: 'success', read: true },
        { id: 'N005', text: 'Schedule updated: New slot added for tomorrow', time: '3 hours ago', type: 'info', read: true }
    ],
    schedule: {
        'Monday': [{ time: '9:00 AM - 12:00 PM', label: 'OPD', active: true }, { time: '2:00 PM - 5:00 PM', label: 'Consultations', active: true }],
        'Tuesday': [{ time: '9:00 AM - 1:00 PM', label: 'OPD', active: true }, { time: '3:00 PM - 6:00 PM', label: 'Surgery', active: false }],
        'Wednesday': [{ time: '10:00 AM - 1:00 PM', label: 'Video Consults', active: true }, { time: '2:00 PM - 5:00 PM', label: 'OPD', active: true }],
        'Thursday': [{ time: '9:00 AM - 12:00 PM', label: 'OPD', active: true }, { time: '1:00 PM - 4:00 PM', label: 'Rounds', active: true }],
        'Friday': [{ time: '10:00 AM - 1:00 PM', label: 'Consultations', active: true }, { time: '2:00 PM - 4:00 PM', label: 'Admin', active: false }],
        'Saturday': [{ time: '9:00 AM - 12:00 PM', label: 'Emergency Only', active: true }],
        'Sunday': []
    },
    records: [
        { id: 'R001', patientId: 'P001', patient: 'Rahul Sharma', date: '2026-03-10', type: 'Prescription', summary: 'Beta-blocker dosage adjusted. ECG normal.' },
        { id: 'R002', patientId: 'P003', patient: 'Amit Kumar', date: '2026-03-12', type: 'ER Report', summary: 'Head CT scan — No fracture. Mild concussion. 24h observation.' },
        { id: 'R003', patientId: 'P004', patient: 'Neha Gupta', date: '2026-03-09', type: 'Discharge Summary', summary: 'Appendectomy successful. Follow-up in 2 weeks.' },
        { id: 'R004', patientId: 'P005', patient: 'Vikram Singh', date: '2026-03-08', type: 'Lab Report', summary: 'HbA1c: 7.2%, Fasting glucose: 142 mg/dL.' },
        { id: 'R005', patientId: 'P002', patient: 'Priya Patel', date: '2026-03-11', type: 'Consultation Note', summary: 'Non-cardiac chest pain. Anxiety disorder suspected. Referral issued.' },
        { id: 'R006', patientId: 'P006', patient: 'Ananya Reddy', date: '2026-03-11', type: 'Prescription', summary: 'Salbutamol inhaler PRN. Budesonide 200mcg BD.' },
        { id: 'R007', patientId: 'P008', patient: 'Kavita Joshi', date: '2026-03-12', type: 'Consultation Note', summary: 'Migraine with aura. Started on Topiramate 25mg.' }
    ]
};

// ── State ──
let currentView = 'dashboard';
let notifOpen = false;
let consultationActive = false;
let consultationTimer = null;
let consultationSeconds = 0;

// ── Init ──
function initDashboard() {
    populateUserInfo();
    bindSidebarNav();
    bindNotifications();
    bindTopActions();
    showView('dashboard');
}

// ── User Info ──
function populateUserInfo() {
    const email = localStorage.getItem('userEmail') || 'doctor@emergix.com';
    const name = localStorage.getItem('userName') || email.split('@')[0];
    const role = localStorage.getItem('userRole');
    if (role && role !== 'doctor') { window.location.href = 'index.html'; return; }

    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const displayName = name.startsWith('Dr.') ? name : 'Dr. ' + name.charAt(0).toUpperCase() + name.slice(1);

    document.getElementById('greeting').textContent = `${greeting}, ${displayName}`;
    const now = new Date();
    document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const initials = displayName.replace('Dr. ', '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('user-avatar').textContent = initials || 'DR';
    document.getElementById('sidebar-name').textContent = displayName;
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
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Hide all views, show selected
    document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');
    const panel = document.getElementById('view-' + view);
    if (panel) { panel.style.display = 'block'; panel.style.animation = 'fadeInUp 0.4s ease forwards'; }

    // Render view content
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
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.className = 'toast', 3500);
}

// ── Notifications ──
function bindNotifications() {
    const btn = document.querySelector('.notification-btn');
    btn.addEventListener('click', () => {
        notifOpen = !notifOpen;
        document.getElementById('notif-panel').style.display = notifOpen ? 'block' : 'none';
        if (notifOpen) renderNotifications();
    });

    document.addEventListener('click', (e) => {
        if (notifOpen && !e.target.closest('.notification-btn') && !e.target.closest('#notif-panel')) {
            notifOpen = false;
            document.getElementById('notif-panel').style.display = 'none';
        }
    });
}

function renderNotifications() {
    const panel = document.getElementById('notif-panel');
    const unread = DB.notifications.filter(n => !n.read).length;
    const dot = document.querySelector('.notification-dot');
    dot.style.display = unread > 0 ? 'block' : 'none';

    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
            <strong style="font-size:15px;">Notifications ${unread > 0 ? `<span style="background:#ef4444;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:6px;">${unread}</span>` : ''}</strong>
            <button onclick="markAllRead()" style="background:none;border:none;color:#4f46e5;font-size:13px;cursor:pointer;font-weight:600;">Mark all read</button>
        </div>
        <div style="max-height:340px;overflow-y:auto;">
            ${DB.notifications.map(n => `
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
    document.getElementById('btn-start-consult').addEventListener('click', () => {
        showView('consultations');
    });
}

// ── Dashboard View ──
function renderDashboard() {
    const activeCount = DB.patients.filter(p => p.status === 'Active' || p.status === 'Critical').length;
    const todayAppts = DB.appointments.length;
    const pending = DB.appointments.filter(a => a.status === 'pending' || a.status === 'urgent').length;
    const emergencies = DB.appointments.filter(a => a.status === 'urgent').length;

    document.getElementById('stat-appointments').textContent = todayAppts;
    document.getElementById('stat-patients').textContent = activeCount;
    document.getElementById('stat-consultations').textContent = pending;
    document.getElementById('stat-alerts').textContent = emergencies;

    // Render appointments
    const list = document.getElementById('dashboard-appointments');
    list.innerHTML = DB.appointments.slice(0, 5).map(a => `
        <div class="appointment-item" style="cursor:pointer" onclick="viewAppointment('${a.id}')">
            <div class="appt-time"><div class="appt-time-value">${a.time}</div><div class="appt-time-period">${a.period}</div></div>
            <div class="appt-info"><div class="appt-patient">${a.patient}</div><div class="appt-type">${a.type}</div></div>
            <span class="appt-status ${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
        </div>`).join('');
}

function viewAppointment(id) {
    const a = DB.appointments.find(x => x.id === id);
    const p = DB.patients.find(x => x.id === a.patientId);
    if (!a) return;

    openModal(`
        <h3 style="margin-bottom:4px;">Appointment Details</h3>
        <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${a.time} ${a.period} · <span class="appt-status ${a.status}" style="font-size:11px;">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span></p>
        <div style="background:#faf9ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #ede9fe;">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px;">${a.patient}</div>
            <div style="color:#64748b;font-size:13px;">${a.type}</div>
            ${p ? `<div style="color:#64748b;font-size:13px;margin-top:4px;">${p.age} yrs · ${p.gender} · ${p.phone}</div>
            <div style="margin-top:8px;font-size:13px;color:#1e293b;"><strong>Notes:</strong> ${p.notes}</div>` : ''}
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
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">My Patients</h2>
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
                            <button onclick="viewPatient('${p.id}')" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-weight:600;color:#4f46e5;margin-right:6px;">View</button>
                            <button onclick="writeNote('${p.id}')" style="padding:6px 14px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-size:12px;cursor:pointer;font-weight:600;">+ Note</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
            ${filtered.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">No patients found.</div>' : ''}
        </div>`;
}

function viewPatient(id) {
    const p = DB.patients.find(x => x.id === id);
    const recs = DB.records.filter(r => r.patientId === id);
    if (!p) return;
    openModal(`
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
            <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">${p.name.split(' ').map(n => n[0]).join('')}</div>
            <div><div style="font-weight:700;font-size:18px;">${p.name}</div><div style="color:#64748b;font-size:13px;">${p.age} yrs · ${p.gender} · ${p.phone}</div></div>
        </div>
        <div style="background:#faf9ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #ede9fe;">
            <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Condition</div>
            <div style="font-weight:600;font-size:15px;">${p.condition}</div>
            <div style="font-size:13px;color:#64748b;margin-top:10px;margin-bottom:4px;">Status</div>
            <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${p.status === 'Critical' ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.1)'};color:${p.status === 'Critical' ? '#ef4444' : '#4f46e5'};">${p.status}</span>
            <div style="font-size:13px;color:#64748b;margin-top:10px;margin-bottom:4px;">Notes</div>
            <div style="font-size:14px;">${p.notes}</div>
        </div>
        ${recs.length > 0 ? `<div style="font-weight:600;font-size:14px;margin-bottom:10px;">Medical Records</div>
        ${recs.map(r => `<div style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span style="font-weight:600;font-size:13px;">${r.type}</span><span style="font-size:12px;color:#94a3b8;">${r.date}</span></div>
            <div style="font-size:13px;color:#475569;margin-top:4px;">${r.summary}</div>
        </div>`).join('')}` : ''}
    `);
}

function writeNote(id) {
    const p = DB.patients.find(x => x.id === id);
    if (!p) return;
    openModal(`
        <h3 style="margin-bottom:16px;">Add Note — ${p.name}</h3>
        <textarea id="note-input" rows="4" placeholder="Write clinical notes..." style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;resize:vertical;margin-bottom:16px;"></textarea>
        <button onclick="saveNote('${id}')" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:15px;">Save Note</button>
    `);
}

function saveNote(id) {
    const note = document.getElementById('note-input').value.trim();
    if (!note) { showToast('Please enter a note', 'warning'); return; }
    const p = DB.patients.find(x => x.id === id);
    if (p) p.notes = note + ' | ' + p.notes;
    DB.records.unshift({ id: 'R' + Date.now(), patientId: id, patient: p.name, date: new Date().toISOString().split('T')[0], type: 'Clinical Note', summary: note });
    closeModal();
    showToast('Note saved successfully', 'success');
}

function addPatientPrompt() {
    openModal(`
        <h3 style="margin-bottom:16px;">Add New Patient</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <input id="np-name" placeholder="Full Name" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <div style="display:flex;gap:10px;">
                <input id="np-age" type="number" placeholder="Age" style="flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
                <select id="np-gender" style="flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>
            </div>
            <input id="np-phone" placeholder="Phone Number" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <input id="np-condition" placeholder="Condition" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="saveNewPatient()" style="padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:15px;margin-top:4px;">Add Patient</button>
        </div>
    `);
}

function saveNewPatient() {
    const name = document.getElementById('np-name').value.trim();
    const age = parseInt(document.getElementById('np-age').value);
    const gender = document.getElementById('np-gender').value;
    const phone = document.getElementById('np-phone').value.trim();
    const condition = document.getElementById('np-condition').value.trim();
    if (!name || !age || !condition) { showToast('Please fill name, age, and condition', 'warning'); return; }
    DB.patients.push({ id: 'P' + Date.now(), name, age, gender, phone: phone || 'N/A', condition, status: 'Active', lastVisit: new Date().toISOString().split('T')[0], notes: 'New patient added.' });
    closeModal();
    showToast('Patient added successfully', 'success');
    renderPatients();
}

// ── Consultations View ──
function renderConsultations() {
    const panel = document.getElementById('view-consultations');
    const pending = DB.appointments.filter(a => a.status === 'pending' || a.status === 'urgent');

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Consultations</h2>
        <div id="consultation-area">
            ${consultationActive ? '' : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
                <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
                    <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Pending Consultations</h3>
                    ${pending.length === 0 ? '<p style="color:#94a3b8;font-size:14px;">No pending consultations.</p>' : pending.map(a => `
                        <div style="display:flex;align-items:center;gap:12px;padding:14px;background:#faf9ff;border-radius:10px;margin-bottom:10px;border:1px solid #ede9fe;">
                            <div style="flex:1;"><div style="font-weight:600;font-size:14px;">${a.patient}</div><div style="font-size:12px;color:#64748b;">${a.type}</div></div>
                            <span class="appt-status ${a.status}" style="font-size:11px;">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
                            <button onclick="startConsultation('${a.id}')" style="padding:8px 16px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Start</button>
                        </div>`).join('')}
                </div>
                <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
                    <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Quick Start</h3>
                    <p style="color:#64748b;font-size:14px;margin-bottom:16px;">Start a consultation with any patient</p>
                    <select id="consult-patient-select" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:12px;font-family:'Inter',sans-serif;">
                        ${DB.patients.map(p => `<option value="${p.id}">${p.name} — ${p.condition}</option>`).join('')}
                    </select>
                    <button onclick="startQuickConsult()" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:14px;">▶ Start Video Consultation</button>
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
    const pid = document.getElementById('consult-patient-select').value;
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
                <div><div style="font-size:13px;color:#a78bfa;font-weight:600;margin-bottom:4px;">LIVE CONSULTATION</div>
                    <div style="font-size:22px;font-weight:700;">${window._currentConsultPatient || 'Patient'}</div></div>
                <div style="text-align:center;"><div style="font-size:12px;color:#a78bfa;margin-bottom:4px;">Duration</div>
                    <div id="consult-timer" style="font-size:28px;font-weight:700;font-family:'Poppins',sans-serif;">${formatTime(consultationSeconds)}</div></div>
            </div>
            <div style="background:rgba(255,255,255,0.08);border-radius:12px;height:280px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <div style="text-align:center;"><div style="font-size:48px;margin-bottom:8px;">📹</div><div style="color:#a78bfa;font-size:14px;">Video feed active</div></div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button onclick="toggleMute(this)" style="padding:12px 24px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-weight:600;font-size:14px;">🎤 Mute</button>
                <button onclick="toggleVideo(this)" style="padding:12px 24px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-weight:600;font-size:14px;">📷 Camera</button>
                <button onclick="shareScreen()" style="padding:12px 24px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-weight:600;font-size:14px;">🖥 Share Screen</button>
                <button onclick="endConsultation()" style="padding:12px 24px;border:none;border-radius:10px;background:#ef4444;color:#fff;cursor:pointer;font-weight:700;font-size:14px;">✕ End Call</button>
            </div>
        </div>
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:24px;">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">Consultation Notes</h3>
            <textarea id="consult-notes" rows="4" placeholder="Type notes during the consultation..." style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;resize:vertical;margin-bottom:12px;"></textarea>
            <button onclick="saveConsultNotes()" style="padding:10px 24px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-weight:600;cursor:pointer;font-size:13px;">Save Notes</button>
        </div>`;
}

function toggleMute(btn) { btn.textContent = btn.textContent.includes('Mute') ? '🔇 Unmute' : '🎤 Mute'; showToast(btn.textContent.includes('Unmute') ? 'Microphone muted' : 'Microphone on', 'info'); }
function toggleVideo(btn) { btn.textContent = btn.textContent.includes('Camera') ? '📷 Camera Off' : '📷 Camera'; showToast(btn.textContent.includes('Off') ? 'Camera turned off' : 'Camera turned on', 'info'); }
function shareScreen() { showToast('Screen sharing started', 'info'); }

function endConsultation() {
    clearInterval(consultationTimer);
    consultationActive = false;
    if (window._currentConsultApptId) {
        const a = DB.appointments.find(x => x.id === window._currentConsultApptId);
        if (a) a.status = 'completed';
    }
    showToast(`Consultation ended (${formatTime(consultationSeconds)})`, 'success');
    consultationSeconds = 0;
    renderConsultations();
}

function saveConsultNotes() {
    const notes = document.getElementById('consult-notes').value.trim();
    if (!notes) { showToast('Please type some notes first', 'warning'); return; }
    showToast('Notes saved successfully', 'success');
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
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Weekly Schedule</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
            ${days.map(day => `
                <div style="background:#fff;border-radius:16px;border:1px solid ${day === today ? '#4f46e5' : '#e2e8f0'};padding:20px;${day === today ? 'box-shadow:0 0 0 2px rgba(79,70,229,0.15);' : ''}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <span style="font-weight:700;font-size:15px;${day === today ? 'color:#4f46e5;' : ''}">${day}${day === today ? ' (Today)' : ''}</span>
                        <button onclick="addSlot('${day}')" style="background:none;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;color:#4f46e5;font-weight:600;">+ Add</button>
                    </div>
                    ${DB.schedule[day].length === 0 ? '<div style="color:#94a3b8;font-size:13px;padding:10px 0;">Day off — No slots scheduled</div>' : DB.schedule[day].map((slot, i) => `
                        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${slot.active ? '#faf9ff' : '#f8fafc'};border-radius:8px;margin-bottom:8px;border:1px solid ${slot.active ? '#ede9fe' : '#e2e8f0'};">
                            <div style="flex:1;"><div style="font-size:13px;font-weight:600;color:${slot.active ? '#1e293b' : '#94a3b8'};">${slot.time}</div><div style="font-size:12px;color:#64748b;">${slot.label}</div></div>
                            <button onclick="toggleSlot('${day}',${i})" style="padding:4px 10px;border:none;border-radius:6px;background:${slot.active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'};color:${slot.active ? '#10b981' : '#ef4444'};font-size:11px;cursor:pointer;font-weight:600;">${slot.active ? 'Active' : 'Off'}</button>
                        </div>`).join('')}
                </div>`).join('')}
        </div>`;
}

function toggleSlot(day, index) {
    DB.schedule[day][index].active = !DB.schedule[day][index].active;
    showToast(`Slot ${DB.schedule[day][index].active ? 'activated' : 'deactivated'}`, 'info');
    renderSchedule();
}

function addSlot(day) {
    openModal(`
        <h3 style="margin-bottom:16px;">Add Slot — ${day}</h3>
        <input id="slot-time" placeholder="e.g. 9:00 AM - 12:00 PM" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:12px;font-family:'Inter',sans-serif;">
        <input id="slot-label" placeholder="e.g. OPD, Surgery, Consults" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:16px;font-family:'Inter',sans-serif;">
        <button onclick="saveSlot('${day}')" style="width:100%;padding:12px;border:none;border-radius:10px;background:#4f46e5;color:#fff;font-weight:600;cursor:pointer;">Add Slot</button>
    `);
}

function saveSlot(day) {
    const time = document.getElementById('slot-time').value.trim();
    const label = document.getElementById('slot-label').value.trim();
    if (!time || !label) { showToast('Fill both fields', 'warning'); return; }
    DB.schedule[day].push({ time, label, active: true });
    closeModal();
    showToast('Slot added', 'success');
    renderSchedule();
}

// ── Records View ──
function renderRecords(filter = '') {
    const panel = document.getElementById('view-records');
    const filtered = filter ? DB.records.filter(r => r.patient.toLowerCase().includes(filter.toLowerCase()) || r.type.toLowerCase().includes(filter.toLowerCase()) || r.summary.toLowerCase().includes(filter.toLowerCase())) : DB.records;

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Medical Records</h2>
        <input type="text" id="records-search" placeholder="Search records by patient, type, or content..." value="${filter}" oninput="renderRecords(this.value)"
            style="width:100%;padding:10px 16px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;margin-bottom:20px;font-family:'Inter',sans-serif;">
        <div style="display:flex;flex-direction:column;gap:12px;">
            ${filtered.map(r => `
                <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                        <div><span style="font-weight:700;font-size:15px;">${r.patient}</span><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(79,70,229,0.1);color:#4f46e5;margin-left:10px;">${r.type}</span></div>
                        <span style="font-size:12px;color:#94a3b8;">${r.date}</span>
                    </div>
                    <p style="font-size:14px;color:#475569;line-height:1.5;">${r.summary}</p>
                </div>`).join('')}
            ${filtered.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">No records found.</div>' : ''}
        </div>`;
}

// ── Settings View ──
function renderSettings() {
    const panel = document.getElementById('view-settings');
    const email = localStorage.getItem('userEmail') || '';
    const name = localStorage.getItem('userName') || '';
    const spec = localStorage.getItem('doctorSpecialization') || 'emergency-medicine';
    const license = localStorage.getItem('doctorLicense') || '';

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Settings</h2>
        <div style="max-width:600px;">
            <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;margin-bottom:20px;">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:20px;">Profile Information</h3>
                <div style="display:flex;flex-direction:column;gap:14px;">
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Full Name</label>
                        <input id="set-name" value="${name}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;"></div>
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Email Address</label>
                        <input id="set-email" value="${email}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;"></div>
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Specialization</label>
                        <select id="set-spec" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
                            <option value="emergency-medicine" ${spec === 'emergency-medicine' ? 'selected' : ''}>Emergency Medicine</option>
                            <option value="cardiology" ${spec === 'cardiology' ? 'selected' : ''}>Cardiology</option>
                            <option value="neurology" ${spec === 'neurology' ? 'selected' : ''}>Neurology</option>
                            <option value="orthopedics" ${spec === 'orthopedics' ? 'selected' : ''}>Orthopedics</option>
                            <option value="pediatrics" ${spec === 'pediatrics' ? 'selected' : ''}>Pediatrics</option>
                            <option value="general-surgery" ${spec === 'general-surgery' ? 'selected' : ''}>General Surgery</option>
                            <option value="internal-medicine" ${spec === 'internal-medicine' ? 'selected' : ''}>Internal Medicine</option>
                        </select></div>
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Medical License No.</label>
                        <input id="set-license" value="${license}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;"></div>
                    <button onclick="saveSettings()" style="padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:15px;margin-top:8px;">Save Changes</button>
                </div>
            </div>
            <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Account</h3>
                <button onclick="logout()" style="padding:12px 24px;border:1px solid #ef4444;border-radius:10px;background:#fff;color:#ef4444;font-weight:600;cursor:pointer;font-size:14px;">Sign Out</button>
            </div>
        </div>`;
}

function saveSettings() {
    localStorage.setItem('userName', document.getElementById('set-name').value);
    localStorage.setItem('userEmail', document.getElementById('set-email').value);
    localStorage.setItem('doctorSpecialization', document.getElementById('set-spec').value);
    localStorage.setItem('doctorLicense', document.getElementById('set-license').value);
    populateUserInfo();
    showToast('Settings saved successfully', 'success');
}

// ── Modal ──
function openModal(content) {
    const m = document.getElementById('dashboard-modal');
    document.getElementById('modal-body').innerHTML = content;
    m.style.display = 'flex';
    setTimeout(() => m.style.opacity = '1', 10);
}

function closeModal() {
    const m = document.getElementById('dashboard-modal');
    m.style.opacity = '0';
    setTimeout(() => m.style.display = 'none', 250);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('doctorSpecialization');
    localStorage.removeItem('doctorLicense');
    window.location.href = 'signin.html';
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', initDashboard);
