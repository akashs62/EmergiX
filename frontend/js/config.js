/**
 * EmergiX — Centralized Frontend Configuration
 * This file handles setting the API Base URL based on the environment.
 */

const EmergiXConfig = (() => {
    // Detect if running on localhost or via file protocol
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';

    // By default, use same-origin API in production, and localhost in local dev.
    const PRODUCTION_API_URL = ''; // Relative path works since frontend/backend share the domain
    const LOCAL_API_URL = 'http://localhost:3000';
    
    // Determine the base URL. If we are local, use the local URL. 
    // If we are in production but don't have a URL set, it defaults to same-origin.
    const API_BASE_URL = (typeof window !== 'undefined' && window.__EMERGIX_API_BASE_URL)
        ? String(window.__EMERGIX_API_BASE_URL).trim()
        : (isLocal ? LOCAL_API_URL : (PRODUCTION_API_URL || window.location.origin));

    return {
        API_BASE_URL,
        isDevelopment: isLocal
    };
})();

// Export to window for easy access in scripts
window.EmergiXConfig = EmergiXConfig;

// Global Authentication Guard
(function enforceAuthentication() {
    if (typeof window === 'undefined') return;

    const publicPages = ['/', '/index.html', '/signin.html', '/signin', '/signup.html', '/signup'];
    const currentPath = window.location.pathname.toLowerCase();
    const isPublic = publicPages.some(page => currentPath.endsWith(page));

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');

    // Block unauthenticated access to protected routes
    if (!isPublic && !token) {
        console.warn('Authentication required. Redirecting to sign in...');
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.replace('signin.html');
        return;
    }

    // Role-based route definitions for facilities
    const roleGuards = {
        '/doctor-dashboard': 'doctor',
        '/doctor-dashboard.html': 'doctor',
        '/ambulance-dashboard': 'ambulance',
        '/ambulance-dashboard.html': 'ambulance'
    };

    // Check if the current route requires a specific role
    for (const [route, requiredRole] of Object.entries(roleGuards)) {
        if (currentPath.endsWith(route)) {
            if (role !== requiredRole) {
                console.warn(`Access denied. Route requires ${requiredRole} role.`);
                window.location.replace('index.html');
                return;
            }
        }
    }
})();
