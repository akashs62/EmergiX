// EmergiX Ambulance Dashboard — Functional Logic (Live Data)
// =============================================

const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : '';

// ── Data Store ──
const DB = {
    ambulances: [],
    dispatches: [],
    drivers: [],
    notifications: [
        { id: 'N0', text: 'Fleet management system live.', time: 'Just now', type: 'info', read: false }
    ]
};

// ── State ──
let currentView = 'dashboard';
let notifOpen = false;

// ── Init ──
async function initDashboard() {
    populateUserInfo();
    bindSidebarNav();
    bindNotifications();
    bindTopActions();
    
    // Fetch live data
    await fetchLiveFleet();
    await fetchLiveDispatches();
    
    showView('dashboard');
}

// ── Fetch Logic ──
async function fetchLiveFleet() {
    const token = localStorage.getItem('token');
    try {
        const ambRes = await fetch(`${API_Base}/api/fleet/ambulances`, { headers: { 'Authorization': `Bearer ${token}` } });
        const ambResult = await ambRes.json();
        if (ambResult.status === 'success') DB.ambulances = ambResult.data;

        const drvRes = await fetch(`${API_Base}/api/fleet/drivers`, { headers: { 'Authorization': `Bearer ${token}` } });
        const drvResult = await drvRes.json();
        if (drvResult.status === 'success') DB.drivers = drvResult.data;
    } catch (err) {
        console.error('Failed to fetch fleet:', err);
    }
}

async function fetchLiveDispatches() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_Base}/api/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.status === 'success') {
            DB.dispatches = result.data.map(d => ({
                id: d.booking_id,
                ambulanceId: d.vehicle_id,
                patient: d.patient_name,
                phone: d.contact,
                pickup: d.location,
                hospital: 'Auto-assigned',
                priority: d.severity || 'high',
                status: d.status,
                eta: d.status === 'dispatched' ? '4 min' : '—',
                time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            
            if (currentView === 'dashboard') renderDashboard();
            if (currentView === 'dispatches') renderDispatches();
        }
    } catch (err) {
        console.error('Failed to fetch dispatches:', err);
    }
}

// ── User Info ──
function populateUserInfo() {
    const email = localStorage.getItem('userEmail') || 'fleet@emergix.com';
    const name = localStorage.getItem('userName') || email.split('@')[0];

    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    document.getElementById('greeting').textContent = `${greeting}, ${displayName}`;
    const now = new Date();
    document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('user-avatar').textContent = initials || 'AF';
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

// ── Dashboard View ──
function renderDashboard() {
    const activeAmbs = DB.ambulances.filter(a => a.status === 'active').length;
    const todayDispatches = DB.dispatches.length;
    const pending = DB.dispatches.filter(d => d.status === 'dispatched').length;

    document.getElementById('stat-active-ambulances').textContent = activeAmbs;
    document.getElementById('stat-today-dispatches').textContent = todayDispatches;
    document.getElementById('stat-avg-response').textContent = '5.8';
    document.getElementById('stat-pending').textContent = pending;

    const list = document.getElementById('dashboard-dispatches');
    if (DB.dispatches.length === 0) {
        list.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;">No active dispatches found.</div>';
        return;
    }

    list.innerHTML = DB.dispatches.slice(0, 5).map(d => `
        <div class="dispatch-item" onclick="viewDispatch('${d.id}')" style="cursor:pointer">
            <div class="dispatch-id-badge">
                <div class="dispatch-id-value">${d.id.split('-')[1] || '---'}</div>
                <div class="dispatch-id-sub">${d.time}</div>
            </div>
            <div class="dispatch-info">
                <div class="dispatch-patient">${d.patient}</div>
                <div class="dispatch-location">📍 ${d.pickup}</div>
            </div>
            <span class="dispatch-status ${d.status}">${d.status}</span>
        </div>`).join('');
}

function viewDispatch(id) {
    const d = DB.dispatches.find(x => x.id === id);
    if (!d) return;
    openModal(`
        <h3>Dispatch ${d.id}</h3>
        <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${d.time} · <span class="dispatch-status ${d.status}">${d.status}</span></p>
        <div style="background:#fff7ed;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px;">Patient: ${d.patient}</div>
            <div style="color:#64748b;font-size:13px;">📍 ${d.pickup}</div>
            <div style="color:#ea580c;font-size:13px;font-weight:600;margin-top:6px;">🚑 Assigned: ${d.ambulanceId}</div>
        </div>
        <button onclick="closeModal()" style="width:100%;padding:10px;border-radius:8px;background:#ea580c;color:#fff;font-weight:600;border:none;cursor:pointer;">Close</button>
    `);
}

// ── Fleet View ──
function renderFleet() {
    const panel = document.getElementById('view-fleet');
    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Fleet Monitoring</h2>
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="text-align:left;padding:14px 20px;">Unit</th>
                    <th style="text-align:left;padding:14px 16px;">Type</th>
                    <th style="text-align:left;padding:14px 16px;">Status</th>
                    <th style="text-align:left;padding:14px 16px;">Location</th>
                </tr></thead>
                <tbody>${DB.ambulances.map(a => `
                    <tr style="border-top:1px solid #f1f5f9;">
                        <td style="padding:14px 20px;"><strong>${a.id}</strong><div style="font-size:11px;color:#94a3b8;">${a.plate}</div></td>
                        <td style="padding:14px 16px;font-size:13px;">${a.type}</td>
                        <td style="padding:14px 16px;"><span class="fleet-status ${a.status}">${a.status}</span></td>
                        <td style="padding:14px 16px;font-size:13px;color:#64748b;">${a.location}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

// ── Dispatches View ──
function renderDispatches() {
    const panel = document.getElementById('view-dispatches');
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin:0;">Global Dispatches</h2>
            <button onclick="fetchLiveDispatches()" style="padding:8px 16px;border-radius:8px;background:#fff;border:1px solid #e2e8f0;font-size:13px;cursor:pointer;">🔄 Refresh</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
            ${DB.dispatches.map(d => `
                <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-weight:700;font-size:15px;">${d.id} — ${d.patient}</div>
                        <div style="font-size:12px;color:#ea580c;font-weight:600;margin-top:4px;">🚑 ${d.ambulanceId}</div>
                        <div style="font-size:13px;color:#64748b;margin-top:2px;">📍 ${d.pickup}</div>
                    </div>
                    <div style="text-align:right;">
                        <span class="dispatch-status ${d.status}">${d.status}</span>
                        <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${d.time}</div>
                    </div>
                </div>`).join('')}
            ${DB.dispatches.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">No live dispatch records.</div>' : ''}
        </div>`;
}

// ── Drivers View ──
function renderDrivers() {
    const panel = document.getElementById('view-drivers');
    if (!panel) return;
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin:0;">Personnel Roster</h2>
            <button onclick="openAddDriverModal()" style="padding:10px 20px;border-radius:10px;background:linear-gradient(135deg, #ea580c, #f97316);color:#fff;border:none;font-weight:600;cursor:pointer;box-shadow: 0 4px 12px rgba(234, 88, 12, 0.2);">+ Add Driver</button>
        </div>
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <table style="width:100%;border-collapse:collapse;text-align:left;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                        <th style="padding:16px 20px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;">Driver Unit</th>
                        <th style="padding:16px 20px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;">Contact & ID</th>
                        <th style="padding:16px 20px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;">Ambulance</th>
                        <th style="padding:16px 20px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;background:#fff7ed;">Helper Details (Separate Column)</th>
                    </tr>
                </thead>
                <tbody>
                    ${DB.drivers.map(d => `
                        <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.2s;" onmouseover="this.style.background='#fffaf5'" onmouseout="this.style.background='white'">
                            <td style="padding:16px 20px;">
                                <div style="display:flex;align-items:center;gap:12px;">
                                    <div style="width:40px;height:40px;border-radius:50%;background:rgba(234, 88, 12, 0.1);color:#ea580c;display:flex;align-items:center;justify-content:center;font-weight:700;">${d.name.charAt(0)}</div>
                                    <div>
                                        <div style="font-weight:700;color:#1e293b;">${d.name}</div>
                                        <div style="font-size:12px;color:#94a3b8;">${d.age || '--'} years • ${d.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td style="padding:16px 20px;">
                                <div style="font-size:13px;color:#475569;margin-bottom:4px;">📞 ${d.phone}</div>
                                <div style="font-size:11px;color:#94a3b8;">${d.drivingLicensePic ? '📄 License Uploaded' : '❌ No License Pic'}</div>
                            </td>
                            <td style="padding:16px 20px;">
                                <div style="font-weight:600;font-size:13px;color:#ea580c;">🚑 ${d.ambulanceNumber || 'Not Assigned'}</div>
                                <div style="font-size:11px;color:#94a3b8;">${d.ambulancePic ? '📸 Amb Pic Attached' : '—'}</div>
                            </td>
                            <td style="padding:16px 20px;background:rgba(255, 247, 237, 0.3);">
                                ${d.helperName ? `
                                    <div style="font-weight:600;font-size:13px;color:#1e293b;">${d.helperName} <span style="font-weight:400;color:#64748b;">(${d.helperAge || '--'} yrs)</span></div>
                                    <div style="font-size:12px;color:#64748b;margin-top:2px;">📞 ${d.helperPhone || 'N/A'}</div>
                                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">🪪 License: ${d.helperLicense || 'N/A'}</div>
                                ` : '<span style="font-size:12px;color:#cbd5e1;font-style:italic;">No helper listed</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function openAddDriverModal() {
    openModal(`
        <h3 style="font-family:'Poppins',sans-serif;margin-bottom:20px;">Register New Personnel</h3>
        <div style="display:flex;flex-direction:column;gap:15px;max-height:65vh;overflow-y:auto;padding-right:10px;">
            <h4 style="margin:0;font-size:14px;color:#ea580c;border-bottom:1px solid #fed7aa;padding-bottom:5px;">Driver Info <small style="color:#64748b;font-weight:400;font-size:11px;">(Required *)</small></h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Name <span style="color:red;">*</span></label>
                    <input type="text" id="new-drv-name" placeholder="Full name" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div id="err-drv-name" style="color:red;font-size:10px;margin-top:2px;display:none;"></div>
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Age <span style="color:red;">*</span></label>
                    <input type="number" id="new-drv-age" placeholder="Age" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div id="err-drv-age" style="color:red;font-size:10px;margin-top:2px;display:none;"></div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Phone <span style="color:red;">*</span></label>
                    <input type="tel" id="new-drv-phone" placeholder="Primary phone" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div id="err-drv-phone" style="color:red;font-size:10px;margin-top:2px;display:none;"></div>
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Alt Phone</label>
                    <input type="tel" id="new-drv-alt" placeholder="Optional" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                </div>
            </div>
            <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">License Photo <span style="color:red;">*</span></label>
                <input type="file" id="new-drv-lic" accept="image/*" style="width:100%;font-size:12px;">
                <div id="err-drv-lic" style="color:red;font-size:10px;margin-top:2px;display:none;"></div>
            </div>

            <h4 style="margin:10px 0 0 0;font-size:14px;color:#ea580c;border-bottom:1px solid #fed7aa;padding-bottom:5px;">Vehicle Details</h4>
            <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:10px;">
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Ambulance Plate No. <span style="color:red;">*</span></label>
                    <input type="text" id="new-drv-amb-no" placeholder="e.g. DL-01-AX-101" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div id="err-drv-amb-no" style="color:red;font-size:10px;margin-top:2px;display:none;"></div>
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Ambulance Pic <span style="color:red;">*</span></label>
                    <input type="file" id="new-drv-amb-pic" accept="image/*" style="width:100%;font-size:12px;">
                    <div id="err-drv-amb-pic" style="color:red;font-size:10px;margin-top:2px;display:none;"></div>
                </div>
            </div>

            <h4 style="margin:10px 0 0 0;font-size:14px;color:#ea580c;border-bottom:1px solid #fed7aa;padding-bottom:5px;">Helper Details (Optional)</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Helper Name</label>
                    <input type="text" id="new-hlp-name" placeholder="Helper full name" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Helper Age</label>
                    <input type="number" id="new-hlp-age" placeholder="Age" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Helper Phone</label>
                    <input type="tel" id="new-hlp-phone" placeholder="Phone" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#64748b;">Helper License Info</label>
                    <input type="text" id="new-hlp-lic" placeholder="License no" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                </div>
            </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:10px;">
            <button onclick="closeModal()" style="flex:1;padding:12px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-weight:600;cursor:pointer;">Cancel</button>
            <button onclick="submitNewDriver()" style="flex:2;padding:12px;border-radius:8px;border:none;background:linear-gradient(135deg, #ea580c, #f97316);color:#fff;font-weight:600;cursor:pointer;">Register Personnel</button>
        </div>
    `);
}

async function submitNewDriver() {
    const drvName = document.getElementById('new-drv-name').value;
    const drvAge = document.getElementById('new-drv-age').value;
    const drvPhone = document.getElementById('new-drv-phone').value;
    const drvAmbNo = document.getElementById('new-drv-amb-no').value;
    const drvLicFile = document.getElementById('new-drv-lic').files[0];
    const drvAmbFile = document.getElementById('new-drv-amb-pic').files[0];

    // Reset errors
    const errIds = ['err-drv-name', 'err-drv-age', 'err-drv-phone', 'err-drv-amb-no', 'err-drv-lic', 'err-drv-amb-pic'];
    errIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    });

    let hasError = false;

    // Individual checks
    if (!drvName) { document.getElementById('err-drv-name').textContent = 'Name is required'; document.getElementById('err-drv-name').style.display = 'block'; hasError = true; }
    if (!drvAge) { document.getElementById('err-drv-age').textContent = 'Age is required'; document.getElementById('err-drv-age').style.display = 'block'; hasError = true; }
    if (!drvPhone) { document.getElementById('err-drv-phone').textContent = 'Phone is required'; document.getElementById('err-drv-phone').style.display = 'block'; hasError = true; }
    if (!drvAmbNo) { document.getElementById('err-drv-amb-no').textContent = 'Plate number is required'; document.getElementById('err-drv-amb-no').style.display = 'block'; hasError = true; }
    if (!drvLicFile) { document.getElementById('err-drv-lic').textContent = 'License photo is required'; document.getElementById('err-drv-lic').style.display = 'block'; hasError = true; }
    if (!drvAmbFile) { document.getElementById('err-drv-amb-pic').textContent = 'Ambulance photo is required'; document.getElementById('err-drv-amb-pic').style.display = 'block'; hasError = true; }

    if (hasError) {
        showToast('Please correct the highlighted errors.', 'error');
        return;
    }

    const payload = {
        name: drvName,
        age: drvAge,
        phone: drvPhone,
        altPhone: document.getElementById('new-drv-alt').value,
        address: 'New Entry',
        ambulanceNumber: drvAmbNo,
        drivingLicensePic: 'mock-license.png',
        ambulancePic: 'mock-amb.png',
        helperName: document.getElementById('new-hlp-name').value,
        helperAge: document.getElementById('new-hlp-age').value,
        helperPhone: document.getElementById('new-hlp-phone').value,
        helperLicense: document.getElementById('new-hlp-lic').value
    };

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_Base}/api/fleet/drivers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.status === 'success') {
            showToast('Personnel added successfully.', 'success');
            closeModal();
            await fetchLiveFleet();
            renderDrivers();
        } else {
            showToast(result.error || 'Failed to add personnel.', 'error');
        }
    } catch (err) {
        console.error('Submit error:', err);
        showToast('Server connection error.', 'error');
    }
}

// ── Settings View ──
function renderSettings() {
    const panel = document.getElementById('view-settings');
    const email = localStorage.getItem('userEmail') || '';
    panel.innerHTML = `
        <h2 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:20px;">Settings</h2>
        <div style="max-width:600px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:28px;">
            <p style="color:#64748b;margin-bottom:20px;">Fleet management portal settings for <strong>${email}</strong></p>
            <button onclick="logout()" style="width:100%;padding:12px;border:1px solid #ef4444;border-radius:10px;color:#ef4444;background:#fff;font-weight:600;cursor:pointer;">Sign Out</button>
        </div>`;
}

// ── Shared Utils ──


function bindNotifications() {
    const btn = document.querySelector('.notification-btn');
    if(btn) btn.addEventListener('click', () => {
        notifOpen = !notifOpen;
        document.getElementById('notif-panel').style.display = notifOpen ? 'block' : 'none';
        if (notifOpen) renderNotifications();
    });
}

function renderNotifications() {
    const panel = document.getElementById('notif-panel');
    if(!panel) return;
    panel.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No new alerts</div>`;
}

function bindTopActions() {
    const btn = document.getElementById('btn-new-dispatch');
    if(btn) btn.addEventListener('click', () => { showToast('Manual dispatch is restricted to authorized dispatcher terminals.', 'warning'); });
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => { if(t) t.className = 'toast'; }, 3500);
}

function openModal(content) {
    const m = document.getElementById('dashboard-modal');
    const b = document.getElementById('modal-body');
    if(m && b) { b.innerHTML = content; m.style.display = 'flex'; setTimeout(() => m.style.opacity = '1', 10); }
}

function closeModal() {
    const m = document.getElementById('dashboard-modal');
    if(m) { m.style.opacity = '0'; setTimeout(() => m.style.display = 'none', 250); }
}

function logout() { localStorage.clear(); window.location.href = 'signin.html'; }

document.addEventListener('DOMContentLoaded', initDashboard);
