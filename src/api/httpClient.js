// src/api/httpClient.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

let token = localStorage.getItem('token') || null;

export function setToken(t) {
  token = t;
  if (t) {
    localStorage.setItem('token', t);
  } else {
    localStorage.removeItem('token');
  }
}

export function getToken() {
  return token;
}

/**
 * Normal JSON request
 */
async function request(method, path, body = null, opts = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = { ...(opts.headers || {}) };
  if (!(opts.noJson === true)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && opts.auth !== false) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body && opts.noJson !== true ? JSON.stringify(body) : body,
    credentials: 'include',
  });

  if (res.status === 401 || res.status === 403) {
    setToken(null);
    window.dispatchEvent(new Event('auth-logout'));
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const errMsg = (data && (data.error || data.message)) || res.statusText || 'Request failed';
    const err = new Error(errMsg);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

/**
 * NEW: File upload request (multipart/form-data)
 * Works for:
 * - Eden AI
 * - /api/infer
 * - any file upload route
 */
async function upload(path, formData, opts = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = { ...(opts.headers || {}) };

  // IMPORTANT: DO NOT SET "Content-Type" → browser sets correct multipart boundary
  if (token && opts.auth !== false) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (res.status === 401 || res.status === 403) {
    setToken(null);
    window.dispatchEvent(new Event('auth-logout'));
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const errMsg = (data && (data.error || data.message)) || res.statusText || 'Request failed';
    const err = new Error(errMsg);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export const httpClient = {
  get: (p, opts) => request('GET', p, null, opts),
  post: (p, b, opts) => request('POST', p, b, opts),
  put: (p, b, opts) => request('PUT', p, b, opts),
  delete: (p, b, opts) => request('DELETE', p, b, opts),

  // 🔥 NEW
  upload,
};

export default httpClient;
