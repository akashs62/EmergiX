/**
 * EmergiX — Centralized Frontend Configuration
 * This file handles setting the API Base URL based on the environment.
 */

const EmergiXConfig = (() => {
    // Determine the base URL. Forces localhost:3000 as requested.
    const API_BASE_URL = 'http://localhost:3000';

    return {
        API_BASE_URL,
        isDevelopment: true
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
