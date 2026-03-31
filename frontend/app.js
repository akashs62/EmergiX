'use strict';

/* ============================================================
   EmergiX — Interactive JavaScript
   ============================================================ */

const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : '';

/* ---- AUTH STATE CHECK ---- */
document.addEventListener('DOMContentLoaded', () => {
    const authHeaderContainer = document.getElementById('auth-header-container');
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');
    const username = localStorage.getItem('username');

    if (token && userEmail && authHeaderContainer) {
        const displayName = localStorage.getItem('userName') || userEmail.split('@')[0];
        const displayUsername = username ? `<br><small style="color: #64748b; font-size: 11px;">ID: ${username}</small>` : '';

        authHeaderContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #2B7FFF; font-weight: 600; font-size: 14px; line-height: 1.2;">
                    Hi, <strong style="color: #2B7FFF;">${displayName.split(' ')[0]}</strong>
                    ${displayUsername}
                </span>
                <button onclick="logout()" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #EF4444; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; transition: all 0.2s;"
                onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#DC2626'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#EF4444'">
                    Logout
                </button>
            </div>
        `;
    }
});

window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    window.location.reload();
};

/* ---- NAVBAR SCROLL ---- */
const navbar = document.getElementById('navbar');
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 60);
    if (scrollTopBtn) scrollTopBtn.classList.toggle('show', window.scrollY > 400);
}, { passive: true });

if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ---- HAMBURGER ---- */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('mob-open');
        hamburger.setAttribute('aria-expanded', isOpen);
        hamburger.classList.toggle('is-open', isOpen);
    });
}

// Close mobile nav on link click
if (navLinks && hamburger) {
    navLinks.querySelectorAll('.nav-link').forEach(l =>
        l.addEventListener('click', () => {
            navLinks.classList.remove('mob-open');
            hamburger.classList.remove('is-open');
            hamburger.setAttribute('aria-expanded', 'false');
        })
    );
}

// Mobile nav inject styles once
(function injectMobileNav() {
    const s = document.createElement('style');
    s.textContent = `
    @media (max-width: 900px) {
      .nav-links.mob-open {
        display: flex !important; flex-direction: column;
        position: fixed; top: 70px; left: 0; right: 0;
        background: #fff; border-top: 1px solid #E2E8F0;
        padding: 16px 24px 24px; gap: 4px; z-index: 999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.09);
        animation: navSlide .22s ease;
      }
      @keyframes navSlide {
        from { opacity:0; transform:translateY(-8px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .hamburger.is-open span:nth-child(1){ transform:translateY(7px) rotate(45deg); }
      .hamburger.is-open span:nth-child(2){ opacity:0; }
      .hamburger.is-open span:nth-child(3){ transform:translateY(-7px) rotate(-45deg); }
    }
  `;
    document.head.appendChild(s);
}());

/* ---- ACTIVE NAV HIGHLIGHT ---- */
const sections = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-link');
const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            navLinkEls.forEach(l => {
                const active = l.getAttribute('href') === `#${e.target.id}`;
                l.classList.toggle('active', active);
            });
        }
    });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => navObserver.observe(s));

/* ---- SMOOTH ANCHOR SCROLL ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

/* ============================================================
   MODAL SYSTEM
   ============================================================ */
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus first focusable element
    const first = el.querySelector('button, input, [tabindex]');
    if (first) setTimeout(() => first.focus(), 80);
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
}
window.closeModal = closeModal;

// Close on backdrop click
document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => {
        if (e.target === ov) closeModal(ov.id);
    });
});

// Escape to close
document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
        document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
});

// Emergency buttons → Emergency modal / Redirection
['btnHeroEmergency', 'btnBannerEmergency'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => { window.location.href = 'ambulance-dispatch.html'; });
});

// Sign In button → Sign In modal
const btnSignin = document.getElementById('btnSignin');
if (btnSignin) btnSignin.addEventListener('click', () => openModal('modalSignin'));

// Emergency type selection
document.querySelectorAll('.etype-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.etype-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});

// Confirm emergency dispatch
const btnConfirm = document.getElementById('btnConfirmEmergency');
if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
        const sel = document.querySelector('.etype-btn.selected');
        const type = sel ? sel.textContent.trim() : 'Emergency';
        closeModal('modalEmergency');
        showToast(`🚨 ${type} alert dispatched! An ambulance is en route.`, 'success');

        // Start live tracking animation
        setTimeout(() => {
            startLiveTracking();
        }, 800);
    });
}

// Sign In submit
window.handleSignin = function (e) {
    e.preventDefault();
    closeModal('modalSignin');
    showToast('✅ Signed in successfully! Welcome back.', 'success');
};

/* ============================================================
   LIVE DATA FETCHING (STATS & REVIEWS)
   ============================================================ */
async function fetchStats() {
    try {
        const response = await fetch(`${API_Base}/api/stats`);
        const result = await response.json();
        if (result.status === 'success') {
            const d = result.data;
            // Update big numbers
            updateStat('s-lives', d.doctors);
            updateStat('s-amb', d.ambulances);
            updateStat('s-rating', d.avgRating, 1);
            updateStat('s-cities', d.cities);

            // Update hero float cards
            const heroLives = document.getElementById('heroLives');
            if (heroLives) animateCounter(heroLives, d.cases, '');

            const heroRating = document.querySelector('.card-hosp .hfc-num');
            if (heroRating) animateCounter(heroRating, d.doctors, '');
        }
    } catch (err) {
        console.error('Stats fetch failed:', err);
    }
}

function updateStat(id, value, decimals = 0) {
    const el = document.getElementById(id);
    if (el) {
        // Update data-count for the observer to pick it up if it hasn't run yet
        const card = el.closest('.stat-card');
        if (card) {
            card.dataset.count = value;
            card.dataset.decimals = decimals;
        }
        // If already visible, just update it
        animateCounter(el, value, '', 1500, decimals);
    }
}

async function fetchReviews() {
    const container = document.getElementById('reviews-list-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_Base}/api/reviews`);
        const result = await response.json();
        if (result.status === 'success' && result.data.length > 0) {
            container.innerHTML = result.data.map(rev => `
                <div class="testi-card anim-up in">
                    <div style="color: #F59E0B; margin-bottom: 0.75rem; font-size: 1.1rem;">
                        ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
                    </div>
                    <p style="font-style: italic; color: #475569; margin-bottom: 1.25rem;">"${rev.message}"</p>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: #EEF6FF; color: #2B7FFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                            ${rev.name.charAt(0)}
                        </div>
                        <span style="font-weight: 700; color: #1E293B; font-size: 0.95rem;">${rev.name}</span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="text-align:center; color:#64748B; padding:2rem; width:100%;">No reviews yet. Be the first to leave one!</div>';
        }
    } catch (err) {
        console.error('Reviews fetch failed:', err);
        container.innerHTML = '<div style="text-align:center; color:#EF4444; padding:2rem; width:100%;">Failed to load reviews.</div>';
    }
}

// Update review form submission
document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.querySelector('.review-form');
    if (reviewForm) {
        reviewForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = reviewForm.querySelector('button[type=submit]');
            const originalText = btn.innerText;

            const name = document.getElementById('revName').value;
            const rating = document.getElementById('revRating').value;
            const message = document.getElementById('revMsg').value;

            try {
                btn.innerText = 'Submitting...';
                btn.disabled = true;

                const token = localStorage.getItem('token');
                const response = await fetch(`${API_Base}/api/reviews`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, rating, message })
                });

                const data = await response.json();
                if (response.ok) {
                    showToast('✅ Thank you! Your review has been submitted successfully.', 'success');
                    reviewForm.reset();
                    fetchReviews(); // Refresh list
                } else {
                    showToast('❌ ' + (data.error || 'Failed to submit review'), 'error');
                }
            } catch (err) {
                showToast('❌ Network error. Please try again.', 'error');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };
    }

    // Initial load
    fetchStats();
    fetchReviews();
});

/* ---- LIVE MAP button ---- */
const btnLiveMap = document.getElementById('btnLiveMap');
if (btnLiveMap) {
    btnLiveMap.addEventListener('click', () => {
        showToast('🗺️ Entering live tracking mode.', 'info');
        startLiveTracking();
    });
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(msg, type = 'info') {
    document.querySelectorAll('.ex-toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'ex-toast';
    t.setAttribute('role', 'alert');
    const bg = type === 'success'
        ? 'linear-gradient(135deg, #2EC4B6, #2B7FFF)'
        : type === 'error'
            ? '#FF4D4F'
            : 'linear-gradient(135deg, #2B7FFF, #7C3AED)';
    t.style.cssText = `
    position:fixed; bottom:32px; right:32px; z-index:9999;
    background:${bg}; color:#fff;
    padding:14px 22px; border-radius:14px; font-weight:600;
    font-size:14px; font-family:Inter,Poppins,sans-serif;
    box-shadow:0 8px 28px rgba(0,0,0,0.18); max-width:320px;
    opacity:0; transform:translateY(16px);
    transition: opacity .35s ease, transform .35s ease;
    cursor:pointer; line-height:1.5;
  `;
    t.textContent = msg;
    t.addEventListener('click', () => dismissToast(t));
    document.body.appendChild(t);
    requestAnimationFrame(() => {
        t.style.opacity = '1';
        t.style.transform = 'translateY(0)';
    });
    setTimeout(() => dismissToast(t), 5000);
}
function dismissToast(t) {
    t.style.opacity = '0';
    t.style.transform = 'translateY(16px)';
    setTimeout(() => t.remove(), 350);
}

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
function animateCounter(el, target, suffix, duration = 2000, decimals = 0) {
    const start = performance.now();
    const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out-cubic
        const rawValue = ease * target;
        const value = decimals > 0
            ? rawValue.toFixed(decimals)
            : Math.floor(rawValue).toLocaleString('en-IN');
        el.textContent = value + suffix;
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        document.querySelectorAll('.stat-card').forEach(card => {
            const numEl = card.querySelector('.stat-number');
            if (!numEl) return;
            const count = parseFloat(card.dataset.count || '0');
            const suffix = card.dataset.suffix || '';
            const decimals = parseInt(card.dataset.decimals || '0', 10);
            animateCounter(numEl, count, suffix, 2400, decimals);
        });
        statsObserver.disconnect();
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) statsObserver.observe(statsSection);

/* ============================================================
   SCROLL FADE-IN ANIMATION
   ============================================================ */
const animEls = document.querySelectorAll(
    '.service-card, .testi-card, .step-item, .stat-card, .faq-item, .tracking-info, .tracking-canvas-wrap'
);

// Stagger sibling cards
document.querySelectorAll('.services-grid, .testimonials-grid, .stats-grid, .steps-row').forEach(grid => {
    [...grid.children].forEach((child, i) => {
        child.dataset.delay = String(i * 90);
    });
});

animEls.forEach(el => el.classList.add('anim-up'));

const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        // Mark as will-animate-in (hidden → visible)
        entry.target.classList.add('will-anim');
        const delay = parseInt(entry.target.dataset.delay || '0');
        setTimeout(() => {
            entry.target.classList.add('in');
            entry.target.classList.remove('will-anim');
        }, delay + 60);
        animObserver.unobserve(entry.target);
    });
}, { threshold: 0.08 });

animEls.forEach(el => animObserver.observe(el));

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
window.toggleFaq = function (id) {
    const item = document.getElementById(id);
    if (!item) return;
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(f => {
        f.classList.remove('open');
        const btn = f.querySelector('.faq-q');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    // Open clicked (if it was closed)
    if (!isOpen) {
        item.classList.add('open');
        const btn = item.querySelector('.faq-q');
        if (btn) btn.setAttribute('aria-expanded', 'true');
    }
};

/* ============================================================
   LEAFLET MAP — Live Tracking & Nearby Hospitals
   ============================================================ */
let map;
let ambMarker;
let isDispatchActive = false;
let ambRoute = [];
let ambProgress = 0;
let routeLine;
let userLatLng = [22.57286, 88.36401]; // Default: Kolkata [lat, lng]

/* ── Fetch real nearby hospitals from OpenStreetMap Overpass API ── */
async function fetchNearbyHospitals(lat, lng, radiusMeters = 5000) {
    const query = `
        [out:json][timeout:10];
        (
          node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
          way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        );
        out center 15;
    `;
    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query)
        });
        if (!res.ok) throw new Error('Overpass server error: ' + res.status);
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Overpass returned non-JSON response');
        }

        const data = await res.json();
        if (!data || !data.elements) return null;

        return data.elements.map(el => ({
            name: el.tags?.name || 'Hospital',
            lat: el.lat || el.center?.lat,
            lng: el.lon || el.center?.lon
        })).filter(h => h.lat && h.lng).slice(0, 10);
    } catch (e) {
        console.warn('Overpass API failed, using fallback hospitals.', e.message);
        return null;
    }
}

/* ── Init ── */
async function initMap() {
    if (map) return;

    // Request user location
    if ('geolocation' in navigator) {
        try {
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 8000, maximumAge: 0
                })
            );
            userLatLng = [pos.coords.latitude, pos.coords.longitude];
        } catch (e) {
            console.warn('Location access denied or timed out, using default.', e);
        }
    }

    setupMap(userLatLng);
}

/* ── Build the Leaflet map ── */
async function setupMap(center) {
    if (map) return;

    map = L.map('mapCanvas').setView(center, 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // ── User marker (pulsing red dot) ──
    const userIcon = L.divIcon({
        className: 'emergi-marker',
        html: `<div style="position:relative;">
            <div style="background:#FF4D4F; width:18px; height:18px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 12px rgba(255,77,79,0.6);"></div>
            <div style="position:absolute; top:-6px; left:-6px; width:30px; height:30px; border-radius:50%; border:2px solid #FF4D4F; opacity:0.4; animation:pulseRing 2s infinite;"></div>
        </div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
    L.marker(center, { icon: userIcon, zIndexOffset: 900 })
        .addTo(map)
        .bindPopup('<strong>📍 Your Location</strong>');

    // ── Nearby hospitals (real data from Overpass, with fallback) ──
    let hospitals = await fetchNearbyHospitals(center[0], center[1]);

    if (!hospitals || hospitals.length === 0) {
        hospitals = [
            { name: 'Apollo Hospital', lat: center[0] + 0.012, lng: center[1] + 0.011 },
            { name: 'City Trust General', lat: center[0] - 0.009, lng: center[1] - 0.008 },
            { name: 'Metro Heart Institute', lat: center[0] + 0.005, lng: center[1] - 0.014 }
        ];
    }

    const hospIcon = L.divIcon({
        className: 'emergi-marker',
        html: `<div style="background:#2B7FFF; color:#fff; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; border:2px solid #fff; box-shadow:0 4px 12px rgba(43,127,255,0.4); cursor:pointer;">🏥</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    hospitals.forEach(h => {
        L.marker([h.lat, h.lng], { icon: hospIcon })
            .addTo(map)
            .bindPopup(`<strong>${h.name}</strong>`);
    });

    // ── Ambulance route (from nearby point toward user) ──
    const ambStart = [center[0] - 0.013, center[1] - 0.009];
    ambRoute = [
        ambStart,
        [center[0] - 0.007, center[1] - 0.005],
        [center[0] - 0.003, center[1] - 0.002],
        center
    ];

    routeLine = L.polyline(ambRoute, {
        color: '#2EC4B6',
        weight: 4,
        dashArray: '10, 10',
        opacity: 0.7
    }).addTo(map);

    const ambIcon = L.divIcon({
        className: 'emergi-marker',
        html: `<div style="background:#2EC4B6; color:#fff; width:40px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:17px; border:2px solid #fff; box-shadow:0 4px 14px rgba(46,196,182,0.55);">🚑</div>`,
        iconSize: [40, 28],
        iconAnchor: [20, 14]
    });

    ambMarker = L.marker(ambStart, { icon: ambIcon, zIndexOffset: 1000 }).addTo(map);
}

/* ── Live tracking trigger ── */
function startLiveTracking() {
    if (!map || isDispatchActive) return;
    isDispatchActive = true;
    ambProgress = 0;

    const trackingSection = document.getElementById('hospitals');
    if (trackingSection) trackingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (map) map.invalidateSize();

    const chipAmb = document.querySelector('.chip-amb .chip-sub');
    if (chipAmb) chipAmb.textContent = 'En route · ETA 4 min';

    animateAmbulance();
}

/* ── Smooth ambulance animation ── */
function animateAmbulance() {
    if (!isDispatchActive) return;

    if (ambProgress < ambRoute.length - 1) {
        ambProgress += 0.008;
        const index = Math.floor(ambProgress);

        if (index >= ambRoute.length - 1) {
            ambMarker.setLatLng(ambRoute[ambRoute.length - 1]);
            showToast('✅ Ambulance has arrived!', 'success');
            isDispatchActive = false;
            return;
        }

        const currentP = ambRoute[index];
        const nextP = ambRoute[index + 1];
        const t = ambProgress - index;

        const lat = currentP[0] + (nextP[0] - currentP[0]) * t;
        const lng = currentP[1] + (nextP[1] - currentP[1]) * t;

        ambMarker.setLatLng([lat, lng]);

        requestAnimationFrame(animateAmbulance);
    }
}

// Init map on load
window.addEventListener('load', initMap);


/* ============================================================
   SERVICE CARD TILT ON HOVER
   ============================================================ */
document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        card.style.transform = `translateY(-5px) rotateX(${-dy * 4}deg) rotateY(${dx * 4}deg)`;
        card.style.transition = 'transform 0.08s';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)';
    });
});

console.log('🚑 EmergiX ready — every second counts.');
