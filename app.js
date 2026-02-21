'use strict';

/* ============================================================
   EmergiX — Interactive JavaScript
   ============================================================ */

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

// Emergency buttons → Emergency modal
['btnHeroEmergency', 'btnBannerEmergency'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => openModal('modalEmergency'));
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
   MAP CANVAS — City grid tracking visualization
   ============================================================ */
let mapAnimationId;
let ambProgress = 0;
let isDispatchActive = false;

function initMap() {
    drawMapFrame();
    if (isDispatchActive && !mapAnimationId) {
        animateMap();
    }
}

function drawMapFrame() {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Setup high-res canvas scaling if not done
    const scale = window.devicePixelRatio;
    if (canvas.width !== canvas.offsetWidth * scale) {
        canvas.width = canvas.offsetWidth * scale;
        canvas.height = 300 * scale;
        canvas.style.height = '300px';
    }

    ctx.save();
    ctx.scale(scale, scale);
    const w = canvas.offsetWidth, h = 300;

    // Background
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#EEF6FF');
    bg.addColorStop(1, '#F0FAF9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Grid roads
    ctx.strokeStyle = 'rgba(43,127,255,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Main roads (highlighted)
    [[0, h * 0.35, w, h * 0.35], [0, h * 0.68, w, h * 0.68], [w * 0.22, 0, w * 0.22, h], [w * 0.6, 0, w * 0.6, h]].forEach(([x1, y1, x2, y2]) => {
        ctx.strokeStyle = 'rgba(43,127,255,0.18)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });

    // Define Waypoints
    const waypoints = [
        { x: w * 0.15, y: h * 0.72 }, // Patient
        { x: w * 0.22, y: h * 0.72 },
        { x: w * 0.22, y: h * 0.35 },
        { x: w * 0.6, y: h * 0.35 },
        { x: w * 0.6, y: h * 0.2 } // Hospital
    ];

    // Route (dashed teal)
    ctx.strokeStyle = '#2EC4B6';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
        ctx.lineTo(waypoints[i].x, waypoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate total path length for ambulance interpolation
    let totalDist = 0;
    const dists = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
        let d = Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
        dists.push(d);
        totalDist += d;
    }

    // Determine current ambulance position based on ambProgress
    let currentDist = ambProgress * totalDist;
    let ambX = waypoints[0].x;
    let ambY = waypoints[0].y;

    if (isDispatchActive) {
        for (let i = 0; i < waypoints.length - 1; i++) {
            if (currentDist <= dists[i]) {
                const p = currentDist / dists[i];
                ambX = waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * p;
                ambY = waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * p;
                break;
            }
            currentDist -= dists[i];
        }
        // Snap to end if finished
        if (ambProgress >= 1) {
            ambX = waypoints[waypoints.length - 1].x;
            ambY = waypoints[waypoints.length - 1].y;
        }
    } else {
        // Idle state: sitting somewhere on path
        ambX = w * 0.22;
        ambY = h * 0.35;
    }

    // Hospital marker
    drawPin(ctx, waypoints[waypoints.length - 1].x, waypoints[waypoints.length - 1].y, '#2B7FFF', 'H');

    // Patient marker
    if (isDispatchActive) {
        // Pulsing patient marker
        const pulse = (Date.now() % 1000) / 1000;
        ctx.beginPath();
        ctx.arc(waypoints[0].x, waypoints[0].y, 14 + (pulse * 10), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 77, 79, ${1 - pulse})`;
        ctx.fill();
    }
    drawPin(ctx, waypoints[0].x, waypoints[0].y, '#FF4D4F', '!');

    // Ambulance
    drawAmb(ctx, ambX, ambY);

    if (!isDispatchActive || ambProgress < 1) {
        // Range circle around ambulance
        ctx.strokeStyle = 'rgba(46,196,182,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ambX, ambY, 36, 0, Math.PI * 2); ctx.stroke();
    }

    // Labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Your Location', w * 0.05, h * 0.82);
    ctx.fillStyle = '#2B7FFF';
    ctx.fillText('Apollo Hospital', w * 0.62, h * 0.18);

    if (isDispatchActive) {
        ctx.fillStyle = '#2EC4B6';
        let mins = Math.max(0, Math.ceil((1 - ambProgress) * 4));
        ctx.fillText(mins > 0 ? `ETA ${mins} min` : 'Arrived', ambX + 10, ambY - 20);
    } else {
        ctx.fillStyle = '#2EC4B6';
        ctx.fillText('ETA 4 min', w * 0.27, h * 0.32);
    }

    ctx.restore();
}

function animateMap() {
    if (!isDispatchActive) return;

    ambProgress += 0.0015; // Animation speed
    if (ambProgress > 1) {
        ambProgress = 1;
        drawMapFrame();
        // Finished
        setTimeout(() => showToast('✅ Ambulance has arrived at the hospital!', 'success'), 500);
        return;
    }

    drawMapFrame();
    mapAnimationId = requestAnimationFrame(animateMap);
}

function startLiveTracking() {
    isDispatchActive = true;
    ambProgress = 0;

    if (mapAnimationId) cancelAnimationFrame(mapAnimationId);
    animateMap();

    // Update live chips UI
    const chipAmb = document.querySelector('.chip-amb .chip-sub');
    if (chipAmb) chipAmb.textContent = 'En route · ETA 4 min';

    // Scroll to tracking section
    const trackingSection = document.getElementById('hospitals');
    if (trackingSection) {
        trackingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function drawPin(ctx, x, y, color, label) {
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = color + '80';
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    ctx.restore();
}

function drawAmb(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#2EC4B6';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(46,196,182,0.6)';
    ctx.beginPath(); ctx.roundRect(x - 14, y - 10, 28, 20, 5); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚑', x, y);
    ctx.restore();
}

// Init map on load + resize
window.addEventListener('load', initMap);
window.addEventListener('resize', initMap);

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
