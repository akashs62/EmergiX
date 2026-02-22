'use strict';

/* ============================================================
   EmergiX — Interactive JavaScript
   ============================================================ */

/* ---- AUTH STATE CHECK ---- */
document.addEventListener('DOMContentLoaded', () => {
    const authHeaderContainer = document.getElementById('auth-header-container');
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    if (token && userEmail && authHeaderContainer) {
        // Strip the email for username, or just show the email
        const username = userEmail.split('@')[0];

        authHeaderContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #fff; font-weight: 500; font-size: 14px; opacity: 0.9;">
                    Hi, <strong style="color: #27AE60;">${username}</strong>
                </span>
                <button onclick="logout()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 13px; transition: all 0.2s;"
                onmouseover="this.style.background='rgba(231, 76, 60, 0.8)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                    Logout
                </button>
            </div>
        `;
    }
});

window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    window.location.reload();
};

/* ---- NAVBAR SCROLL ---- */
const navbar = document.getElementById('navbar');
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    scrollTopBtn.classList.toggle('show', window.scrollY > 400);
}, { passive: true });

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---- HAMBURGER ---- */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('mob-open');
    hamburger.setAttribute('aria-expanded', isOpen);
    hamburger.classList.toggle('is-open', isOpen);
});

// Close mobile nav on link click
navLinks.querySelectorAll('.nav-link').forEach(l =>
    l.addEventListener('click', () => {
        navLinks.classList.remove('mob-open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
    })
);

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
function animateCounter(el, target, suffix, duration = 2000) {
    const start = performance.now();
    const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out-cubic
        el.textContent = Math.floor(ease * target).toLocaleString('en-IN') + suffix;
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
            const count = parseInt(card.dataset.count || '0');
            const suffix = card.dataset.suffix || '';
            animateCounter(numEl, count, suffix, 2400);
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
   LEAFLET MAP — Live Tracking Visualization
   ============================================================ */
let map;
let ambMarker;
let isDispatchActive = false;
let ambRoute = [];
let ambProgress = 0;
let routeLine;

function initMap() {
    if (map) return; // already initialized

    // Default center (e.g., New Delhi as placeholder)
    const patientLatLng = [28.6139, 77.2090];
    const hospitalLatLng = [28.6250, 77.1900];

    map = L.map('mapCanvas').setView(patientLatLng, 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Initial markers
    const patientIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background:#FF4D4F; color:#fff; width:24px; height:24px; border-radius:50%; text-align:center; line-height:24px; font-weight:bold; box-shadow:0 0 10px rgba(255,77,79,0.5);">!</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const hospitalIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background:#2B7FFF; color:#fff; width:28px; height:28px; border-radius:50%; text-align:center; line-height:28px; font-weight:bold; box-shadow:0 0 10px rgba(43,127,255,0.5);">H</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    L.marker(patientLatLng, { icon: patientIcon }).addTo(map).bindPopup('Your Location');
    L.marker(hospitalLatLng, { icon: hospitalIcon }).addTo(map).bindPopup('Apollo Hospital');

    // Generating a dummy route between patient and hospital
    ambRoute = [
        patientLatLng,
        [28.6150, 77.2050],
        [28.6180, 77.2000],
        [28.6220, 77.1950],
        hospitalLatLng
    ];

    routeLine = L.polyline(ambRoute, {
        color: '#2EC4B6',
        weight: 4,
        dashArray: '10, 10',
        opacity: 0.7
    }).addTo(map);

    const ambIcon = L.divIcon({
        className: 'custom-amb-pin',
        html: `<div style="background:#2EC4B6; color:#fff; width:36px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 0 12px rgba(46,196,182,0.6);">🚑</div>`,
        iconSize: [36, 26],
        iconAnchor: [18, 13]
    });

    // Start ambulance at patient loc
    ambMarker = L.marker(patientLatLng, { icon: ambIcon, zIndexOffset: 1000 }).addTo(map);
}

function startLiveTracking() {
    isDispatchActive = true;
    ambProgress = 0;

    // Scroll to tracking section
    const trackingSection = document.getElementById('hospitals');
    if (trackingSection) {
        trackingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Invalidate size to ensure rendering if hidden earlier
    if (map) map.invalidateSize();

    // Update live chips UI
    const chipAmb = document.querySelector('.chip-amb .chip-sub');
    if (chipAmb) chipAmb.textContent = 'En route · ETA 4 min';

    animateAmbulance();
}

function animateAmbulance() {
    if (!isDispatchActive) return;

    if (ambProgress < ambRoute.length - 1) {
        ambProgress += 0.05; // Animation speed
        const index = Math.floor(ambProgress);

        if (index >= ambRoute.length - 1) {
            ambMarker.setLatLng(ambRoute[ambRoute.length - 1]);
            showToast('✅ Ambulance has arrived at the hospital!', 'success');
            return;
        }

        const currentP = ambRoute[index];
        const nextP = ambRoute[index + 1];
        const t = ambProgress - index;

        const lat = currentP[0] + (nextP[0] - currentP[0]) * t;
        const lng = currentP[1] + (nextP[1] - currentP[1]) * t;

        ambMarker.setLatLng([lat, lng]);

        requestAnimationFrame(() => setTimeout(animateAmbulance, 60));
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
