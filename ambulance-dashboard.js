// =============================================
// EmergiX Ambulance Dashboard — Functional Logic
// =============================================

// ── Mock Data Store ──
const DB = {
    ambulances: [
        { id: 'AMB-001', plate: 'DL-01-AB-1234', type: 'Advanced Life Support', status: 'active', driverId: 'D001', location: 'Sector 18, Noida', lastPing: '2 min ago' },
        { id: 'AMB-002', plate: 'DL-02-CD-5678', type: 'Basic Life Support', status: 'en-route', driverId: 'D002', location: 'Connaught Place, Delhi', lastPing: '1 min ago' },
        { id: 'AMB-003', plate: 'DL-03-EF-9012', type: 'Advanced Life Support', status: 'active', driverId: 'D003', location: 'Dwarka Sec 21, Delhi', lastPing: '5 min ago' },
        { id: 'AMB-004', plate: 'UP-16-GH-3456', type: 'Patient Transport', status: 'off-duty', driverId: null, location: 'Base Station — Ghaziabad', lastPing: '45 min ago' },
        { id: 'AMB-005', plate: 'DL-04-IJ-7890', type: 'Advanced Life Support', status: 'en-route', driverId: 'D005', location: 'Lajpat Nagar, Delhi', lastPing: '30 sec ago' },
        { id: 'AMB-006', plate: 'HR-26-KL-2345', type: 'Basic Life Support', status: 'maintenance', driverId: null, location: 'Workshop — Gurgaon', lastPing: '2 hrs ago' },
        { id: 'AMB-007', plate: 'DL-05-MN-6789', type: 'Neonatal', status: 'active', driverId: 'D004', location: 'AIIMS, Delhi', lastPing: '3 min ago' },
        { id: 'AMB-008', plate: 'UP-14-OP-1122', type: 'Basic Life Support', status: 'active', driverId: 'D006', location: 'Vaishali, Ghaziabad', lastPing: '1 min ago' }
    ],
    dispatches: [
        { id: 'DSP-4021', ambulanceId: 'AMB-002', patient: 'Ravi Verma', pickup: '23, MG Road, CP, Delhi', hospital: 'Max Hospital, Saket', priority: 'critical', status: 'en-route', eta: '4 min', time: '1:45 PM' },
        { id: 'DSP-4022', ambulanceId: 'AMB-005', patient: 'Sunita Rao', pickup: '14-B, Lajpat Nagar II', hospital: 'Apollo Hospital, Jasola', priority: 'high', status: 'en-route', eta: '7 min', time: '1:38 PM' },
        { id: 'DSP-4023', ambulanceId: null, patient: 'Mohit Arora', pickup: '56, Sector 62, Noida', hospital: 'Fortis Hospital, Noida', priority: 'medium', status: 'pending', eta: '—', time: '1:52 PM' },
        { id: 'DSP-4024', ambulanceId: null, patient: 'Anita Sharma', pickup: '12, Greater Kailash I', hospital: 'AIIMS, Delhi', priority: 'critical', status: 'pending', eta: '—', time: '1:55 PM' },
        { id: 'DSP-4025', ambulanceId: 'AMB-001', patient: 'Karan Singh', pickup: '78, Rajouri Garden', hospital: 'BLK Max, Rajinder Nagar', priority: 'high', status: 'on-scene', eta: '—', time: '1:20 PM' },
        { id: 'DSP-4026', ambulanceId: 'AMB-003', patient: 'Priya Mehra', pickup: 'Dwarka Sec 7', hospital: 'Manipal Hospital, Dwarka', priority: 'medium', status: 'completed', eta: '—', time: '12:30 PM' },
        { id: 'DSP-4027', ambulanceId: 'AMB-007', patient: 'Baby Gupta (Neonate)', pickup: 'Safdarjung Hospital', hospital: 'AIIMS NICU', priority: 'critical', status: 'completed', eta: '—', time: '11:15 AM' },
        { id: 'DSP-4028', ambulanceId: 'AMB-008', patient: 'Rajesh Kumar', pickup: 'Vaishali Sec 4, Ghaziabad', hospital: 'Yatharth Hospital', priority: 'low', status: 'returning', eta: '—', time: '12:50 PM' }
    ],
    drivers: [
        { id: 'D001', name: 'Sunil Yadav', phone: '+91 98765 11111', license: 'DL-2019-0012345', status: 'on-duty', ambulanceId: 'AMB-001', experience: '6 years', rating: 4.8 },
        { id: 'D002', name: 'Manoj Tiwari', phone: '+91 98765 22222', license: 'DL-2020-0067890', status: 'on-duty', ambulanceId: 'AMB-002', experience: '4 years', rating: 4.6 },
        { id: 'D003', name: 'Raju Prasad', phone: '+91 98765 33333', license: 'DL-2018-0034567', status: 'on-duty', ambulanceId: 'AMB-003', experience: '8 years', rating: 4.9 },
        { id: 'D004', name: 'Vikash Singh', phone: '+91 98765 44444', license: 'DL-2021-0089012', status: 'on-duty', ambulanceId: 'AMB-007', experience: '3 years', rating: 4.5 },
        { id: 'D005', name: 'Amar Chauhan', phone: '+91 98765 55555', license: 'UP-2019-0045678', status: 'on-duty', ambulanceId: 'AMB-005', experience: '5 years', rating: 4.7 },
        { id: 'D006', name: 'Deepak Sharma', phone: '+91 98765 66666', license: 'UP-2020-0023456', status: 'on-duty', ambulanceId: 'AMB-008', experience: '4 years', rating: 4.4 },
        { id: 'D007', name: 'Pankaj Gupta', phone: '+91 98765 77777', license: 'HR-2017-0056789', status: 'off-duty', ambulanceId: null, experience: '9 years', rating: 4.9 },
        { id: 'D008', name: 'Naveen Kumar', phone: '+91 98765 88888', license: 'DL-2022-0098765', status: 'off-duty', ambulanceId: null, experience: '2 years', rating: 4.2 }
    ],
    notifications: [
        { id: 'N001', text: 'Critical dispatch: Cardiac arrest at MG Road, CP', time: '5 min ago', type: 'danger', read: false },
        { id: 'N002', text: 'AMB-006 scheduled for maintenance completed', time: '18 min ago', type: 'info', read: false },
        { id: 'N003', text: 'New dispatch request from Sector 62, Noida', time: '25 min ago', type: 'warning', read: false },
        { id: 'N004', text: 'Driver Sunil Yadav clocked in for shift', time: '1 hour ago', type: 'success', read: true },
        { id: 'N005', text: 'AMB-003 completed dispatch DSP-4026 successfully', time: '2 hours ago', type: 'success', read: true }
    ]
};

// ── State ──
let currentView = 'dashboard';
let notifOpen = false;

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
    const email = localStorage.getItem('userEmail') || 'admin@fleet.com';
    const name = localStorage.getItem('userName') || email.split('@')[0];
    const role = localStorage.getItem('userRole');
    if (role && role !== 'ambulance') { window.location.href = 'index.html'; return; }

    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    document.getElementById('greeting').textContent = `${greeting}, ${displayName}`;
    const now = new Date();
    document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('user-avatar').textContent = initials || 'AP';
    document.getElementById('sidebar-name').textContent = displayName;
}

// ── Sidebar Navigation ──
function bindSidebarNav() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showView(item.dataset.view);
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
        case 'fleet': renderFleet(); break;
        case 'dispatches': renderDispatches(); break;
        case 'drivers': renderDrivers(); break;
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
            <button onclick="markAllRead()" style="background:none;border:none;color:#ea580c;font-size:13px;cursor:pointer;font-weight:600;">Mark all read</button>
        </div>
        <div style="max-height:340px;overflow-y:auto;">
            ${DB.notifications.map(n => `
                <div onclick="markNotifRead('${n.id}')" style="padding:14px 20px;border-bottom:1px solid #f1f5f9;cursor:pointer;background:${n.read ? '#fff' : '#fff7ed'};transition:background 0.2s;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${n.type === 'danger' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : n.type === 'success' ? '#10b981' : '#ea580c'};flex-shrink:0;"></span>
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
    document.getElementById('btn-new-dispatch').addEventListener('click', () => {
        newDispatchPrompt();
    });
}

// ── Dashboard View ──
function renderDashboard() {
    const activeAmbs = DB.ambulances.filter(a => a.status === 'active' || a.status === 'en-route').length;
    const todayDispatches = DB.dispatches.length;
    const pending = DB.dispatches.filter(d => d.status === 'pending').length;

    document.getElementById('stat-active-ambulances').textContent = activeAmbs;
    document.getElementById('stat-today-dispatches').textContent = todayDispatches;
    document.getElementById('stat-avg-response').textContent = '6.2';
    document.getElementById('stat-pending').textContent = pending;

    const list = document.getElementById('dashboard-dispatches');
    const activeDispatches = DB.dispatches.filter(d => d.status !== 'completed' && d.status !== 'cancelled');
    list.innerHTML = activeDispatches.slice(0, 5).map(d => `
        <div class="dispatch-item" onclick="viewDispatch('${d.id}')">
            <div class="dispatch-id-badge">
                <div class="dispatch-id-value">${d.id.split('-')[1]}</div>
                <div class="dispatch-id-sub">${d.time}</div>
            </div>
            <div class="dispatch-info">
                <div class="dispatch-patient">${d.patient}</div>
                <div class="dispatch-location">📍 ${d.pickup}</div>
            </div>
            <span class="dispatch-status ${d.status}">${formatStatus(d.status)}</span>
        </div>`).join('');

    if (activeDispatches.length === 0) {
        list.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;">No active dispatches right now.</div>';
    }
}

function formatStatus(s) {
    const map = { 'en-route': 'En Route', 'on-scene': 'On Scene', 'pending': 'Pending', 'completed': 'Completed', 'returning': 'Returning', 'cancelled': 'Cancelled' };
    return map[s] || s;
}

function viewDispatch(id) {
    const d = DB.dispatches.find(x => x.id === id);
    if (!d) return;
    const amb = d.ambulanceId ? DB.ambulances.find(a => a.id === d.ambulanceId) : null;
    const driver = amb && amb.driverId ? DB.drivers.find(dr => dr.id === amb.driverId) : null;

    openModal(`
        <h3 style="margin-bottom:4px;">Dispatch ${d.id}</h3>
        <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${d.time} · <span class="dispatch-status ${d.status}" style="font-size:11px;">${formatStatus(d.status)}</span> · <span style="font-weight:600;color:${d.priority === 'critical' ? '#ef4444' : d.priority === 'high' ? '#f59e0b' : '#3b82f6'};">${d.priority.toUpperCase()}</span></p>
        <div style="background:#fff7ed;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px;">🏥 ${d.patient}</div>
            <div style="color:#64748b;font-size:13px;">📍 Pickup: ${d.pickup}</div>
            <div style="color:#64748b;font-size:13px;margin-top:4px;">🏨 Hospital: ${d.hospital}</div>
            ${d.eta !== '—' ? `<div style="color:#ea580c;font-size:13px;font-weight:600;margin-top:6px;">⏱ ETA: ${d.eta}</div>` : ''}
        </div>
        ${amb ? `<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid #e2e8f0;">
            <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Assigned Ambulance</div>
            <div style="font-weight:600;">${amb.id} · ${amb.plate}</div>
            <div style="font-size:12px;color:#64748b;">${amb.type}</div>
            ${driver ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">🧑 Driver: ${driver.name} · ${driver.phone}</div>` : ''}
        </div>` : '<div style="background:#fef2f2;border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid #fecaca;color:#ef4444;font-weight:600;font-size:13px;">⚠ No ambulance assigned yet</div>'}
        <div style="display:flex;gap:10px;">
            ${d.status === 'pending' ? `<button onclick="assignAmbulance('${d.id}')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#ea580c;color:#fff;font-weight:600;cursor:pointer;">🚑 Assign Ambulance</button>` : ''}
            ${d.status === 'en-route' ? `<button onclick="updateDispatchStatus('${d.id}','on-scene')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#f59e0b;color:#fff;font-weight:600;cursor:pointer;">📍 Mark On-Scene</button>` : ''}
            ${d.status === 'on-scene' ? `<button onclick="updateDispatchStatus('${d.id}','completed')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:600;cursor:pointer;">✓ Mark Complete</button>` : ''}
            ${d.status !== 'completed' && d.status !== 'cancelled' ? `<button onclick="updateDispatchStatus('${d.id}','cancelled')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#fee2e2;color:#ef4444;font-weight:600;cursor:pointer;">✕ Cancel</button>` : ''}
        </div>
    `);
}

function assignAmbulance(dispatchId) {
    const d = DB.dispatches.find(x => x.id === dispatchId);
    if (!d) return;
    const available = DB.ambulances.filter(a => a.status === 'active');
    if (available.length === 0) {
        showToast('No available ambulances!', 'error');
        return;
    }
    const amb = available[0];
    d.ambulanceId = amb.id;
    d.status = 'en-route';
    d.eta = Math.floor(Math.random() * 10 + 3) + ' min';
    amb.status = 'en-route';
    closeModal();
    showToast(`${amb.id} dispatched to ${d.patient}`, 'success');
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'dispatches') renderDispatches();
}

function updateDispatchStatus(id, status) {
    const d = DB.dispatches.find(x => x.id === id);
    if (d) {
        d.status = status;
        if (status === 'completed' || status === 'cancelled') {
            d.eta = '—';
            if (d.ambulanceId) {
                const amb = DB.ambulances.find(a => a.id === d.ambulanceId);
                if (amb) amb.status = 'active';
            }
        }
    }
    closeModal();
    showToast(`Dispatch ${id} — ${formatStatus(status)}`, 'success');
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'dispatches') renderDispatches();
}

function newDispatchPrompt() {
    openModal(`
        <h3 style="margin-bottom:16px;">Create New Dispatch</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <input id="nd-patient" placeholder="Patient Name" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <input id="nd-pickup" placeholder="Pickup Address" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <input id="nd-hospital" placeholder="Destination Hospital" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <select id="nd-priority" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium" selected>Medium</option>
                <option value="low">Low</option>
            </select>
            <button onclick="saveNewDispatch()" style="padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-weight:600;cursor:pointer;font-size:15px;margin-top:4px;">Create Dispatch</button>
        </div>
    `);
}

function saveNewDispatch() {
    const patient = document.getElementById('nd-patient').value.trim();
    const pickup = document.getElementById('nd-pickup').value.trim();
    const hospital = document.getElementById('nd-hospital').value.trim();
    const priority = document.getElementById('nd-priority').value;
    if (!patient || !pickup || !hospital) { showToast('Please fill all fields', 'warning'); return; }

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    DB.dispatches.unshift({
        id: 'DSP-' + (4028 + DB.dispatches.length),
        ambulanceId: null,
        patient,
        pickup,
        hospital,
        priority,
        status: 'pending',
        eta: '—',
        time
    });
    closeModal();
    showToast('Dispatch created successfully', 'success');
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'dispatches') renderDispatches();
}

// ── Fleet View ──
function renderFleet(filter = '') {
    const panel = document.getElementById('view-fleet');
    const filtered = filter
        ? DB.ambulances.filter(a => a.id.toLowerCase().includes(filter.toLowerCase()) || a.plate.toLowerCase().includes(filter.toLowerCase()) || a.type.toLowerCase().includes(filter.toLowerCase()))
        : DB.ambulances;

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Fleet Management</h2>
        <div style="display:flex;gap:12px;margin-bottom:24px;">
            <input type="text" id="fleet-search" placeholder="Search by ID, plate, or type..." value="${filter}" oninput="renderFleet(this.value)"
                style="flex:1;padding:10px 16px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="addAmbulancePrompt()" style="padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-weight:600;cursor:pointer;font-size:14px;">+ Add Ambulance</button>
        </div>
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="text-align:left;padding:14px 20px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Ambulance</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Type</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Status</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Location</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Driver</th>
                    <th style="text-align:center;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Actions</th>
                </tr></thead>
                <tbody>${filtered.map(a => {
                    const driver = a.driverId ? DB.drivers.find(d => d.id === a.driverId) : null;
                    return `
                    <tr style="border-top:1px solid #f1f5f9;transition:background 0.2s;" onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background='#fff'">
                        <td style="padding:14px 20px;"><div style="font-weight:600;font-size:14px;">${a.id}</div><div style="font-size:12px;color:#94a3b8;">${a.plate}</div></td>
                        <td style="padding:14px 16px;font-size:13px;color:#475569;">${a.type}</td>
                        <td style="padding:14px 16px;"><span class="fleet-status ${a.status}">${formatFleetStatus(a.status)}</span></td>
                        <td style="padding:14px 16px;font-size:13px;color:#64748b;">${a.location}<div style="font-size:11px;color:#94a3b8;">${a.lastPing}</div></td>
                        <td style="padding:14px 16px;font-size:13px;color:#475569;">${driver ? driver.name : '<span style="color:#94a3b8;">Unassigned</span>'}</td>
                        <td style="padding:14px 16px;text-align:center;">
                            <button onclick="viewAmbulance('${a.id}')" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-weight:600;color:#ea580c;">Details</button>
                        </td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
            ${filtered.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">No ambulances found.</div>' : ''}
        </div>`;
}

function formatFleetStatus(s) {
    const map = { 'active': 'Active', 'en-route': 'En Route', 'off-duty': 'Off Duty', 'maintenance': 'Maintenance' };
    return map[s] || s;
}

function viewAmbulance(id) {
    const a = DB.ambulances.find(x => x.id === id);
    if (!a) return;
    const driver = a.driverId ? DB.drivers.find(d => d.id === a.driverId) : null;
    const dispatches = DB.dispatches.filter(d => d.ambulanceId === id);

    openModal(`
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
            <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#ea580c,#f97316);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">🚑</div>
            <div><div style="font-weight:700;font-size:18px;">${a.id}</div><div style="color:#64748b;font-size:13px;">${a.plate} · ${a.type}</div></div>
        </div>
        <div style="background:#fff7ed;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
            <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Status</div>
            <span class="fleet-status ${a.status}">${formatFleetStatus(a.status)}</span>
            <div style="font-size:13px;color:#64748b;margin-top:10px;margin-bottom:4px;">Location</div>
            <div style="font-size:14px;">${a.location}</div>
            <div style="font-size:11px;color:#94a3b8;">Last ping: ${a.lastPing}</div>
            ${driver ? `<div style="font-size:13px;color:#64748b;margin-top:10px;margin-bottom:4px;">Driver</div>
            <div style="font-size:14px;">${driver.name} · ${driver.phone}</div>` : ''}
        </div>
        ${dispatches.length > 0 ? `<div style="font-weight:600;font-size:14px;margin-bottom:10px;">Recent Dispatches</div>
        ${dispatches.slice(0, 3).map(d => `<div style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span style="font-weight:600;font-size:13px;">${d.id} — ${d.patient}</span><span class="dispatch-status ${d.status}" style="font-size:11px;">${formatStatus(d.status)}</span></div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">📍 ${d.pickup}</div>
        </div>`).join('')}` : ''}
        <div style="display:flex;gap:10px;margin-top:16px;">
            ${a.status === 'active' ? `<button onclick="updateAmbStatus('${a.id}','off-duty')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#64748b;color:#fff;font-weight:600;cursor:pointer;">Set Off-Duty</button>` : ''}
            ${a.status === 'off-duty' ? `<button onclick="updateAmbStatus('${a.id}','active')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:600;cursor:pointer;">Set Active</button>` : ''}
            ${a.status === 'maintenance' ? `<button onclick="updateAmbStatus('${a.id}','active')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:600;cursor:pointer;">Mark Repaired</button>` : ''}
        </div>
    `);
}

function updateAmbStatus(id, status) {
    const a = DB.ambulances.find(x => x.id === id);
    if (a) a.status = status;
    closeModal();
    showToast(`${id} status → ${formatFleetStatus(status)}`, 'success');
    if (currentView === 'fleet') renderFleet();
    else if (currentView === 'dashboard') renderDashboard();
}

function addAmbulancePrompt() {
    openModal(`
        <h3 style="margin-bottom:16px;">Add New Ambulance</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <input id="na-plate" placeholder="License Plate (e.g. DL-01-AB-1234)" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <select id="na-type" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
                <option value="Advanced Life Support">Advanced Life Support</option>
                <option value="Basic Life Support">Basic Life Support</option>
                <option value="Patient Transport">Patient Transport</option>
                <option value="Neonatal">Neonatal</option>
            </select>
            <input id="na-location" placeholder="Base Station Location" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="saveNewAmbulance()" style="padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-weight:600;cursor:pointer;font-size:15px;margin-top:4px;">Add Ambulance</button>
        </div>
    `);
}

function saveNewAmbulance() {
    const plate = document.getElementById('na-plate').value.trim();
    const type = document.getElementById('na-type').value;
    const location = document.getElementById('na-location').value.trim();
    if (!plate || !location) { showToast('Please fill plate and location', 'warning'); return; }
    DB.ambulances.push({
        id: 'AMB-' + String(DB.ambulances.length + 1).padStart(3, '0'),
        plate,
        type,
        status: 'off-duty',
        driverId: null,
        location,
        lastPing: 'Just now'
    });
    closeModal();
    showToast('Ambulance added successfully', 'success');
    renderFleet();
}

// ── Dispatches View ──
function renderDispatches(filter = '') {
    const panel = document.getElementById('view-dispatches');
    const filtered = filter
        ? DB.dispatches.filter(d => d.patient.toLowerCase().includes(filter.toLowerCase()) || d.id.toLowerCase().includes(filter.toLowerCase()) || d.pickup.toLowerCase().includes(filter.toLowerCase()))
        : DB.dispatches;

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Dispatch Management</h2>
        <div style="display:flex;gap:12px;margin-bottom:24px;">
            <input type="text" id="dispatch-search" placeholder="Search by ID, patient, or location..." value="${filter}" oninput="renderDispatches(this.value)"
                style="flex:1;padding:10px 16px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="newDispatchPrompt()" style="padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-weight:600;cursor:pointer;font-size:14px;">+ New Dispatch</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
            ${filtered.map(d => `
                <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;transition:box-shadow 0.2s;cursor:pointer;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'" onclick="viewDispatch('${d.id}')">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                        <div><span style="font-weight:700;font-size:15px;">${d.id}</span><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${d.priority === 'critical' ? 'rgba(239,68,68,0.1)' : d.priority === 'high' ? 'rgba(245,158,11,0.1)' : d.priority === 'medium' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)'};color:${d.priority === 'critical' ? '#ef4444' : d.priority === 'high' ? '#f59e0b' : d.priority === 'medium' ? '#3b82f6' : '#10b981'};margin-left:10px;">${d.priority.toUpperCase()}</span></div>
                        <span class="dispatch-status ${d.status}" style="font-size:12px;">${formatStatus(d.status)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:14px;font-weight:600;color:#1e293b;">${d.patient}</div>
                            <div style="font-size:13px;color:#64748b;margin-top:2px;">📍 ${d.pickup} → 🏨 ${d.hospital}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:12px;color:#94a3b8;">${d.time}</div>
                            ${d.eta !== '—' ? `<div style="font-size:12px;font-weight:600;color:#ea580c;">ETA: ${d.eta}</div>` : ''}
                        </div>
                    </div>
                </div>`).join('')}
            ${filtered.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">No dispatches found.</div>' : ''}
        </div>`;
}

// ── Drivers View ──
function renderDrivers(filter = '') {
    const panel = document.getElementById('view-drivers');
    const filtered = filter
        ? DB.drivers.filter(d => d.name.toLowerCase().includes(filter.toLowerCase()) || d.phone.includes(filter))
        : DB.drivers;

    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Driver Management</h2>
        <div style="display:flex;gap:12px;margin-bottom:24px;">
            <input type="text" id="driver-search" placeholder="Search drivers by name or phone..." value="${filter}" oninput="renderDrivers(this.value)"
                style="flex:1;padding:10px 16px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="addDriverPrompt()" style="padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-weight:600;cursor:pointer;font-size:14px;">+ Add Driver</button>
        </div>
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="text-align:left;padding:14px 20px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Driver</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">License</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Status</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Ambulance</th>
                    <th style="text-align:left;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Rating</th>
                    <th style="text-align:center;padding:14px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Actions</th>
                </tr></thead>
                <tbody>${filtered.map(d => {
                    const amb = d.ambulanceId ? DB.ambulances.find(a => a.id === d.ambulanceId) : null;
                    return `
                    <tr style="border-top:1px solid #f1f5f9;transition:background 0.2s;" onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background='#fff'">
                        <td style="padding:14px 20px;"><div style="font-weight:600;font-size:14px;">${d.name}</div><div style="font-size:12px;color:#94a3b8;">${d.phone}</div></td>
                        <td style="padding:14px 16px;font-size:13px;color:#475569;">${d.license}</td>
                        <td style="padding:14px 16px;"><span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${d.status === 'on-duty' ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.15)'};color:${d.status === 'on-duty' ? '#059669' : '#64748b'};">${d.status === 'on-duty' ? 'On Duty' : 'Off Duty'}</span></td>
                        <td style="padding:14px 16px;font-size:13px;color:#475569;">${amb ? amb.id : '<span style="color:#94a3b8;">—</span>'}</td>
                        <td style="padding:14px 16px;font-size:13px;font-weight:600;color:#f59e0b;">★ ${d.rating}</td>
                        <td style="padding:14px 16px;text-align:center;">
                            <button onclick="viewDriver('${d.id}')" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-weight:600;color:#ea580c;margin-right:6px;">View</button>
                            <button onclick="toggleDriverStatus('${d.id}')" style="padding:6px 14px;border:none;border-radius:8px;background:${d.status === 'on-duty' ? '#64748b' : '#10b981'};color:#fff;font-size:12px;cursor:pointer;font-weight:600;">${d.status === 'on-duty' ? 'Set Off' : 'Set On'}</button>
                        </td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
            ${filtered.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">No drivers found.</div>' : ''}
        </div>`;
}

function viewDriver(id) {
    const d = DB.drivers.find(x => x.id === id);
    if (!d) return;
    const amb = d.ambulanceId ? DB.ambulances.find(a => a.id === d.ambulanceId) : null;

    openModal(`
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
            <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#ea580c,#f97316);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">${d.name.split(' ').map(n => n[0]).join('')}</div>
            <div><div style="font-weight:700;font-size:18px;">${d.name}</div><div style="color:#64748b;font-size:13px;">${d.phone}</div></div>
        </div>
        <div style="background:#fff7ed;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><div style="font-size:12px;color:#64748b;">License</div><div style="font-size:14px;font-weight:600;">${d.license}</div></div>
                <div><div style="font-size:12px;color:#64748b;">Experience</div><div style="font-size:14px;font-weight:600;">${d.experience}</div></div>
                <div><div style="font-size:12px;color:#64748b;">Status</div><div><span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${d.status === 'on-duty' ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.15)'};color:${d.status === 'on-duty' ? '#059669' : '#64748b'};">${d.status === 'on-duty' ? 'On Duty' : 'Off Duty'}</span></div></div>
                <div><div style="font-size:12px;color:#64748b;">Rating</div><div style="font-size:14px;font-weight:600;color:#f59e0b;">★ ${d.rating}</div></div>
            </div>
            ${amb ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #fed7aa;"><div style="font-size:12px;color:#64748b;margin-bottom:4px;">Assigned Ambulance</div><div style="font-size:14px;font-weight:600;">${amb.id} · ${amb.plate}</div><div style="font-size:12px;color:#64748b;">${amb.type}</div></div>` : ''}
        </div>
    `);
}

function toggleDriverStatus(id) {
    const d = DB.drivers.find(x => x.id === id);
    if (!d) return;
    if (d.status === 'on-duty') {
        d.status = 'off-duty';
        if (d.ambulanceId) {
            const amb = DB.ambulances.find(a => a.id === d.ambulanceId);
            if (amb) amb.driverId = null;
            d.ambulanceId = null;
        }
    } else {
        d.status = 'on-duty';
    }
    showToast(`${d.name} → ${d.status === 'on-duty' ? 'On Duty' : 'Off Duty'}`, 'success');
    renderDrivers();
}

function addDriverPrompt() {
    openModal(`
        <h3 style="margin-bottom:16px;">Add New Driver</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <input id="ndr-name" placeholder="Full Name" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <input id="ndr-phone" placeholder="Phone Number" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <input id="ndr-license" placeholder="License Number" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <input id="ndr-experience" placeholder="Experience (e.g. 3 years)" style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;">
            <button onclick="saveNewDriver()" style="padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-weight:600;cursor:pointer;font-size:15px;margin-top:4px;">Add Driver</button>
        </div>
    `);
}

function saveNewDriver() {
    const name = document.getElementById('ndr-name').value.trim();
    const phone = document.getElementById('ndr-phone').value.trim();
    const license = document.getElementById('ndr-license').value.trim();
    const experience = document.getElementById('ndr-experience').value.trim();
    if (!name || !phone || !license) { showToast('Please fill name, phone, and license', 'warning'); return; }
    DB.drivers.push({
        id: 'D' + String(DB.drivers.length + 1).padStart(3, '0'),
        name,
        phone,
        license,
        status: 'off-duty',
        ambulanceId: null,
        experience: experience || '—',
        rating: 0
    });
    closeModal();
    showToast('Driver added successfully', 'success');
    renderDrivers();
}

// ── Settings View ──
function renderSettings() {
    const panel = document.getElementById('view-settings');
    const email = localStorage.getItem('userEmail') || '';
    const name = localStorage.getItem('userName') || '';
    const fleetName = localStorage.getItem('ambulanceFleetName') || 'EmergiX Fleet Services';
    const fleetId = localStorage.getItem('ambulanceFleetId') || '';

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
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Fleet / Company Name</label>
                        <input id="set-fleet-name" value="${fleetName}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;"></div>
                    <div><label style="font-size:13px;font-weight:500;color:#64748b;display:block;margin-bottom:4px;">Fleet Registration ID</label>
                        <input id="set-fleet-id" value="${fleetId}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;"></div>
                    <button onclick="saveSettings()" style="padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-weight:600;cursor:pointer;font-size:15px;margin-top:8px;">Save Changes</button>
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
    localStorage.setItem('ambulanceFleetName', document.getElementById('set-fleet-name').value);
    localStorage.setItem('ambulanceFleetId', document.getElementById('set-fleet-id').value);
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
    localStorage.removeItem('ambulanceFleetName');
    localStorage.removeItem('ambulanceFleetId');
    window.location.href = 'signin.html';
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', initDashboard);
