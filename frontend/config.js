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

    // Define public HTML pages that do not require login
    const publicPages = [
        '/', '/index.html', 
        '/signin.html', '/signin', 
        '/signup.html', '/signup'
    ];
    
    // Check if the current path is one of the public pages
    const currentPath = window.location.pathname.toLowerCase();
    const isPublic = publicPages.some(page => currentPath.endsWith(page));

    // If the page is protected and the user lacks a token...
    if (!isPublic && !localStorage.getItem('token')) {
        console.warn('Authentication required. Redirecting to sign in...');
        
        // Save the requested URL to redirect the user back after successful login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Redirect to sign in page
        window.location.replace('/signin.html');
    }
})();
