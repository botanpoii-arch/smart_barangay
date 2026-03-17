// api.ts

/**
 * 1. Single Source of Truth (Root URL)
 * We add a fallback to localhost:8000 just in case your .env isn't loading.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;

/**
 * 2. Auth & User Management
 */
export const LOGIN_API = `${API_BASE_URL}/login`;
export const ACCOUNTS_API = `${API_BASE_URL}/rbac/accounts`;

/**
 * 3. Core Modules (Management)
 */
export const RESIDENTS_API = `${API_BASE_URL}/residents`;
export const HOUSEHOLDS_API = `${API_BASE_URL}/households`;
export const OFFICIALS_API = `${API_BASE_URL}/officials`;

/**
 * 4. Public & Request Services
 */
export const ANNOUNCEMENT_API = `${API_BASE_URL}/announcements`;
export const DOCUMENTS_API = `${API_BASE_URL}/documents`;
export const BLOTTER_API = `${API_BASE_URL}/blotter`;

/**
 * 5. System Logs & Maintenance
 */
export const AUDIT_API = `${API_BASE_URL}/audit`;

/**
 * 6. Global Handshake Helper
 * Standardizes headers across the entire app.
 */
export const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role') || 'admin'; // Defaulting to admin for testing
    
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-user-role': role
    };
};