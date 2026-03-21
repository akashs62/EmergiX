/**
 * EmergiX — Centralized Frontend Configuration
 * This file handles setting the API Base URL based on the environment.
 */

const EmergiXConfig = (() => {
    // Detect if running on localhost
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // By default, use same-origin API in production, and localhost in local dev.
    const PRODUCTION_API_URL = '';
    const LOCAL_API_URL = 'http://localhost:3000';
    const API_BASE_URL = (typeof window !== 'undefined' && window.__EMERGIX_API_BASE_URL)
        ? String(window.__EMERGIX_API_BASE_URL).trim()
        : (isLocal ? LOCAL_API_URL : PRODUCTION_API_URL);

    return {
        API_BASE_URL,
        isDevelopment: isLocal
    };
})();

// Export to window for easy access in scripts
window.EmergiXConfig = EmergiXConfig;
