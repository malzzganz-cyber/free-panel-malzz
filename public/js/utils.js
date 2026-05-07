// ===========================
// API CLIENT
// ===========================
const API = {
  base: '/api',
  
  getToken() {
    return localStorage.getItem('malzz_token');
  },

  setToken(token) {
    localStorage.setItem('malzz_token', token);
  },

  clearToken() {
    localStorage.removeItem('malzz_token');
    localStorage.removeItem('malzz_user');
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('malzz_user')); } catch { return null; }
  },

  setUser(user) {
    localStorage.setItem('malzz_user', JSON.stringify(user));
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    try {
      const res = await fetch(`${this.base}${endpoint}`, config);
      const data = await res.json();

      if (res.status === 401) {
        this.clearToken();
        if (window.location.pathname !== '/login.html') {
          window.location.href = '/login.html';
        }
        return data;
      }

      return data;
    } catch (err) {
      console.error('[API] Request failed:', err);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  get: (endpoint) => API.request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => API.request(endpoint, { method: 'POST', body }),
  delete: (endpoint) => API.request(endpoint, { method: 'DELETE' }),
};

// ===========================
// TOAST NOTIFICATIONS
// ===========================
const Toast = {
  container: null,

  init() {
    if (!document.getElementById('toast-container')) {
      const el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
    }
    this.container = document.getElementById('toast-container');
  },

  show(title, message = '', type = 'info', duration = 4000) {
    if (!this.container) this.init();

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px 4px;border-radius:4px;font-size:16px;line-height:1">×</button>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success: (t, m) => Toast.show(t, m, 'success'),
  error: (t, m) => Toast.show(t, m, 'error'),
  warning: (t, m) => Toast.show(t, m, 'warning'),
  info: (t, m) => Toast.show(t, m, 'info'),
};

// ===========================
// MODAL
// ===========================
const Modal = {
  confirm(title, message, danger = true) {
    return new Promise((resolve) => {
      const existing = document.getElementById('confirm-modal-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'confirm-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
            <div style="width:44px;height:44px;border-radius:12px;background:${danger ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)'};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
              ${danger ? '🗑️' : '❓'}
            </div>
            <div>
              <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${title}</div>
              <div style="font-size:13px;color:var(--text-secondary);">${message}</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
            <button id="modal-cancel" class="btn btn-ghost btn-sm">Cancel</button>
            <button id="modal-confirm" class="btn btn-sm" style="background:${danger ? 'var(--danger)' : 'var(--accent)'};color:#fff;">
              ${danger ? 'Delete' : 'Confirm'}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('open'));

      const close = (val) => {
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 300);
        resolve(val);
      };

      overlay.querySelector('#modal-cancel').onclick = () => close(false);
      overlay.querySelector('#modal-confirm').onclick = () => close(true);
      overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
  },
};

// ===========================
// HELPERS
// ===========================
const Utils = {
  formatDate(date) {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  formatRAM(mb) {
    if (!mb) return 'N/A';
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  },

  formatDisk(mb) {
    if (!mb) return 'N/A';
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  },

  timeAgo(date) {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  },

  truncate(str, len = 24) {
    return str?.length > len ? str.slice(0, len) + '…' : str;
  },

  debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  },

  setLoading(btn, loading = true) {
    if (loading) {
      btn._origText = btn.innerHTML;
      btn.innerHTML = '<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin 0.7s linear infinite;"></span> Loading...';
      btn.disabled = true;
    } else {
      btn.innerHTML = btn._origText || 'Submit';
      btn.disabled = false;
    }
  },
};

// ===========================
// AUTH GUARD
// ===========================
function requireAuth() {
  const token = API.getToken();
  const user = API.getUser();
  if (!token || !user) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Initialize toast
document.addEventListener('DOMContentLoaded', () => Toast.init());
