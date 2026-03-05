/**
 * api.js — Central API service layer for MicroFluence
 * All calls go to the Django backend at /api/
 * Token is read from localStorage and injected into every authenticated request.
 */

const BASE = 'http://localhost:8000/api';

// ─── Helper ──────────────────────────────────────────────────────────────────
async function request(method, path, body = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = localStorage.getItem('access_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // If 401 and there's a refresh token, attempt silent refresh
    if (res.status === 401 && auth) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry the original request with new token
            headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
            const retry = await fetch(`${BASE}${path}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!retry.ok) throw await retry.json().catch(() => ({ detail: 'Request failed' }));
            return retry.json();
        }
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Network error' }));
        throw err;
    }

    if (res.status === 204) return null;
    return res.json();
}

async function tryRefreshToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;
    try {
        const res = await fetch(`${BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });
        if (!res.ok) { clearTokens(); return false; }
        const data = await res.json();
        localStorage.setItem('access_token', data.access);
        return true;
    } catch {
        clearTokens();
        return false;
    }
}

export function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}

export function saveTokens(access, refresh) {
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
    login: (email, password) => request('POST', '/auth/login/', { email, password }, false),
    register: (data) => request('POST', '/auth/register/', data, false),
    logout: (refresh) => request('POST', '/auth/logout/', { refresh }),
    me: () => request('GET', '/auth/me/'),
    updateProfile: (data) => request('PATCH', '/auth/me/', data),
};

// ─── Discovery ───────────────────────────────────────────────────────────────
export const influencerApi = {
    list: (params = '') => request('GET', `/influencers/${params ? '?' + params : ''}`),
    detail: (id) => request('GET', `/influencers/${id}/`),
};

export const campaignApi = {
    list: (params = '') => request('GET', `/campaigns/${params ? '?' + params : ''}`),
    detail: (id) => request('GET', `/campaigns/${id}/`),
    create: (data) => request('POST', '/campaigns/', data),
};

// ─── Messaging ────────────────────────────────────────────────────────────────
export const conversationApi = {
    list: () => request('GET', '/conversations/'),
    detail: (id) => request('GET', `/conversations/${id}/`),
    create: (data) => request('POST', '/conversations/', data),
    sendMsg: (id, content) => request('POST', `/conversations/${id}/messages/`, { content }),
    markRead: (id) => request('POST', `/conversations/${id}/read/`),
};

// ─── Contracts ────────────────────────────────────────────────────────────────
export const contractApi = {
    list: () => request('GET', '/contracts/'),
    detail: (id) => request('GET', `/contracts/${id}/`),
    create: (data) => request('POST', '/contracts/', data),
    updateStatus: (id, status) => request('PATCH', `/contracts/${id}/status/`, { status }),
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentApi = {
    createOrder: (contractId) => request('POST', `/contracts/${contractId}/payment/create/`, {}),
    verifyPayment: (contractId, payload) => request('POST', `/contracts/${contractId}/payment/verify/`, payload),
};

// ─── Instagram ────────────────────────────────────────────────────────────────
export const instagramApi = {
    getAuthUrl: () => request('GET', '/instagram/auth-url/'),
    callback: (code) => request('POST', '/instagram/callback/', { code }),
};
