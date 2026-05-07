// ===========================
// DASHBOARD APP
// ===========================
let charts = {};
let notifDropdownOpen = false;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = API.getUser();
  if (user) {
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = user.username || 'Admin');
    document.querySelectorAll('.user-display-email').forEach(el => el.textContent = user.email || '');
  }

  initSidebar();
  initNavigation();
  await loadInitialPage();
  loadNotifications();
  setInterval(loadNotifications, 30000);
});

// ===========================
// SIDEBAR
// ===========================
function initSidebar() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (menuBtn) {
    menuBtn.onclick = () => {
      sidebar?.classList.toggle('open');
      backdrop?.classList.toggle('open');
    };
  }
  if (backdrop) {
    backdrop.onclick = () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('open');
    };
  }
}

// ===========================
// NAVIGATION
// ===========================
function initNavigation() {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const page = el.dataset.page;
      navigateTo(page);
    });
  });
}

async function navigateTo(pageId) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // Close sidebar on mobile
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard',
    'create-panel': 'Create Panel',
    servers: 'Server Management',
    admins: 'Admin Management',
    analytics: 'Analytics',
    activity: 'Activity Logs',
  };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[pageId] || pageId;

  // Show page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Load data
  switch (pageId) {
    case 'dashboard': await loadDashboard(); break;
    case 'create-panel': initCreatePanel(); break;
    case 'servers': await loadServers(); break;
    case 'admins': await loadAdmins(); break;
    case 'analytics': await loadAnalytics(); break;
    case 'activity': await loadActivity(); break;
  }
}

async function loadInitialPage() {
  await navigateTo('dashboard');
}

// ===========================
// DASHBOARD
// ===========================
async function loadDashboard() {
  const [analyticsRes, statusRes, activityRes] = await Promise.all([
    API.get('/analytics'),
    API.get('/servers/status'),
    API.get('/activity?limit=8'),
  ]);

  if (analyticsRes.success) {
    const ov = analyticsRes.data.overview;
    setStatCard('stat-total-servers', ov.totalServers);
    setStatCard('stat-online-servers', ov.serversOnline);
    setStatCard('stat-admins', ov.totalAdmins);
    setStatCard('stat-uptime', ov.uptime);
    renderServerStatusList(statusRes?.data?.servers || []);
    renderDashboardChart(analyticsRes.data.chart || []);
  }

  if (activityRes.success) {
    renderActivityFeed(activityRes.data, 'activity-feed-dash');
  }
}

function setStatCard(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value ?? '—';
    el.style.animation = 'none';
    requestAnimationFrame(() => { el.style.animation = ''; });
  }
}

function renderServerStatusList(servers) {
  const el = document.getElementById('server-status-list');
  if (!el) return;
  if (!servers.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🖥️</div><div class="empty-state-title">No servers yet</div></div>';
    return;
  }
  el.innerHTML = servers.slice(0, 6).map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${s.status === 'running' ? 'var(--success)' : 'var(--danger)'};box-shadow:0 0 6px ${s.status === 'running' ? 'var(--success-glow)' : 'var(--danger-glow)'};"></div>
        <span style="font-size:14px;font-weight:500;">${Utils.truncate(s.name, 28)}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="mono" style="color:var(--text-muted);font-size:11px;">${Utils.formatRAM(s.ram)}</span>
        <span class="badge ${s.status === 'running' ? 'badge-online' : 'badge-offline'}" style="font-size:11px;">
          ${s.status === 'running' ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  `).join('');
}

function renderDashboardChart(chartData) {
  const ctx = document.getElementById('dashboard-chart');
  if (!ctx) return;

  if (charts.dashboard) charts.dashboard.destroy();

  const labels = chartData.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const values = chartData.map(d => d.serversCreated || 0);

  charts.dashboard = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Servers Created',
        data: values,
        fill: true,
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderColor: 'rgba(59,130,246,0.8)',
        borderWidth: 2,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141920',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#f0f4ff',
          bodyColor: '#8b95a8',
          padding: 12,
        },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }, ticks: { color: '#4a5568', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }, ticks: { color: '#4a5568', font: { size: 11 }, stepSize: 1 } },
      },
    },
  });
}

// ===========================
// CREATE PANEL
// ===========================
function initCreatePanel() {
  const form = document.getElementById('create-panel-form');
  if (!form || form._initialized) return;
  form._initialized = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    Utils.setLoading(btn);

    const data = {
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      ram: parseInt(form.ram.value),
      disk: parseInt(form.disk.value),
      cpu: parseInt(form.cpu.value),
      telegramId: form.telegramId?.value.trim() || null,
      serverName: form.serverName?.value.trim() || null,
      databases: parseInt(form.databases?.value || 1),
      backups: parseInt(form.backups?.value || 1),
    };

    const res = await API.post('/servers/create', data);
    Utils.setLoading(btn, false);

    if (res.success) {
      Toast.success('Panel Created!', `Server for ${data.username} is ready.`);
      form.reset();
    } else {
      Toast.error('Creation Failed', res.message);
    }
  });

  // RAM preset buttons
  document.querySelectorAll('[data-ram-preset]').forEach(btn => {
    btn.onclick = () => {
      const ramInput = document.getElementById('input-ram');
      if (ramInput) ramInput.value = btn.dataset.ramPreset;
      document.querySelectorAll('[data-ram-preset]').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
    };
  });
}

// ===========================
// SERVER MANAGEMENT
// ===========================
let serverPage = 1;
let serversData = [];
let serverSearch = '';

async function loadServers() {
  showTableSkeleton('servers-table-body', 5, 6);
  const res = await API.get(`/servers?page=${serverPage}`);
  if (!res.success) {
    Toast.error('Failed to load servers', res.message);
    return;
  }

  serversData = res.data?.data || [];
  renderServersTable(serversData);
  renderPagination(res.data?.meta?.pagination?.total_pages || 1, serverPage, 'server');
}

function renderServersTable(servers) {
  const tbody = document.getElementById('servers-table-body');
  if (!tbody) return;

  const filtered = serverSearch
    ? servers.filter(s => s.attributes?.name?.toLowerCase().includes(serverSearch) || s.attributes?.uuid?.toLowerCase().includes(serverSearch))
    : servers;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🖥️</div><div class="empty-state-title">No servers found</div><div class="empty-state-text">No servers match your search.</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const a = s.attributes || {};
    const isOnline = a.status === 'running';
    return `
      <tr>
        <td>
          <div style="font-weight:600;font-size:14px;">${Utils.truncate(a.name, 30)}</div>
          <div class="mono" style="color:var(--text-muted);font-size:11px;margin-top:2px;">${a.uuid?.slice(0,8)}...</div>
        </td>
        <td class="mono" style="color:var(--text-secondary);font-size:12px;">#${a.id}</td>
        <td><span class="badge ${isOnline ? 'badge-online' : 'badge-offline'}"><span class="badge-dot"></span>${isOnline ? 'Online' : 'Offline'}</span></td>
        <td style="color:var(--text-secondary);">${Utils.formatRAM(a.limits?.memory)}</td>
        <td style="color:var(--text-secondary);">${Utils.formatDisk(a.limits?.disk)}</td>
        <td style="color:var(--text-secondary);">${a.limits?.cpu || 0}%</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteServer(${a.id}, '${a.name}')">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteServer(id, name) {
  const confirmed = await Modal.confirm('Delete Server', `Are you sure you want to delete "${name}"? This action cannot be undone.`);
  if (!confirmed) return;

  const res = await API.delete(`/servers/${id}`);
  if (res.success) {
    Toast.success('Server Deleted', `"${name}" has been removed.`);
    await loadServers();
  } else {
    Toast.error('Delete Failed', res.message);
  }
}

// ===========================
// ADMIN MANAGEMENT
// ===========================
async function loadAdmins() {
  const res = await API.get('/admins');
  if (!res.success) {
    Toast.error('Failed to load admins', res.message);
    return;
  }
  renderAdminsTable(res.data || []);

  const form = document.getElementById('create-admin-form');
  if (form && !form._initialized) {
    form._initialized = true;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      Utils.setLoading(btn);
      const data = {
        username: form.adminUsername.value.trim(),
        email: form.adminEmail.value.trim(),
        firstName: form.adminFirstName?.value.trim() || 'Malzz',
        lastName: form.adminLastName?.value.trim() || 'Admin',
      };
      const res = await API.post('/admins/create', data);
      Utils.setLoading(btn, false);
      if (res.success) {
        Toast.success('Admin Created!', `${data.username} has been added.`);
        form.reset();
        await loadAdmins();
      } else {
        Toast.error('Failed', res.message);
      }
    });
  }
}

function renderAdminsTable(admins) {
  const tbody = document.getElementById('admins-table-body');
  if (!tbody) return;

  if (!admins.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-title">No admins yet</div><div class="empty-state-text">Create your first admin above.</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = admins.map(a => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--purple));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${(a.username || '?')[0].toUpperCase()}</div>
          <div>
            <div style="font-weight:600;font-size:14px;">${a.username}</div>
            <div style="font-size:12px;color:var(--text-muted);">@${a.username}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary);font-size:13px;">${a.email}</td>
      <td><span class="badge badge-info">Admin</span></td>
      <td style="color:var(--text-muted);font-size:12px;">${Utils.timeAgo(a.createdAt)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteAdmin('${a.id}', '${a.username}')">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Remove
        </button>
      </td>
    </tr>
  `).join('');
}

async function deleteAdmin(id, username) {
  const confirmed = await Modal.confirm('Remove Admin', `Remove admin "${username}"?`);
  if (!confirmed) return;

  const res = await API.delete(`/admins/${id}`);
  if (res.success) {
    Toast.success('Admin Removed', `${username} has been removed.`);
    await loadAdmins();
  } else {
    Toast.error('Failed', res.message);
  }
}

// ===========================
// ANALYTICS
// ===========================
async function loadAnalytics() {
  const res = await API.get('/analytics');
  if (!res.success) return;

  const ov = res.data.overview;
  ['total-servers-ana', 'online-servers-ana', 'total-admins-ana'].forEach((id, i) => {
    const vals = [ov.totalServers, ov.serversOnline, ov.totalAdmins];
    const el = document.getElementById(id);
    if (el) el.textContent = vals[i] ?? '—';
  });

  renderAnalyticsChart(res.data.chart || []);
  renderResourceChart();
}

function renderAnalyticsChart(data) {
  const ctx = document.getElementById('analytics-chart');
  if (!ctx) return;
  if (charts.analytics) charts.analytics.destroy();

  const labels = data.map(d => d.date);
  const created = data.map(d => d.serversCreated || 0);
  const logins = data.map(d => d.logins || 0);

  charts.analytics = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Servers Created', data: created, backgroundColor: 'rgba(59,130,246,0.5)', borderColor: '#3b82f6', borderWidth: 2, borderRadius: 4 },
        { label: 'Logins', data: logins, backgroundColor: 'rgba(139,92,246,0.5)', borderColor: '#8b5cf6', borderWidth: 2, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8b95a8', font: { size: 12, family: 'Outfit' } } },
        tooltip: { backgroundColor: '#141920', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#f0f4ff', bodyColor: '#8b95a8', padding: 12 },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { size: 11 } } },
      },
    },
  });
}

function renderResourceChart() {
  const ctx = document.getElementById('resource-chart');
  if (!ctx) return;
  if (charts.resource) charts.resource.destroy();

  charts.resource = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Used RAM', 'Free RAM', 'Used Disk', 'Free Disk'],
      datasets: [{
        data: [65, 35, 45, 55],
        backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(59,130,246,0.1)', 'rgba(139,92,246,0.7)', 'rgba(139,92,246,0.1)'],
        borderColor: ['#3b82f6', 'rgba(59,130,246,0.3)', '#8b5cf6', 'rgba(139,92,246,0.3)'],
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8b95a8', font: { size: 12, family: 'Outfit' }, padding: 16 } },
        tooltip: { backgroundColor: '#141920', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#f0f4ff', bodyColor: '#8b95a8', padding: 12 },
      },
      cutout: '65%',
    },
  });
}

// ===========================
// ACTIVITY LOG
// ===========================
async function loadActivity() {
  const res = await API.get('/activity?limit=50');
  if (!res.success) return;
  renderActivityFeed(res.data, 'activity-feed-full');
}

function renderActivityFeed(activities, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!activities.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">No activity yet</div></div>';
    return;
  }

  const icons = {
    login: { icon: '🔑', bg: 'rgba(59,130,246,0.12)' },
    logout: { icon: '🚪', bg: 'rgba(107,114,128,0.12)' },
    server_created: { icon: '🖥️', bg: 'rgba(16,185,129,0.12)' },
    server_deleted: { icon: '🗑️', bg: 'rgba(239,68,68,0.12)' },
    admin_created: { icon: '👤', bg: 'rgba(139,92,246,0.12)' },
    admin_deleted: { icon: '❌', bg: 'rgba(239,68,68,0.12)' },
    bulk_delete_users: { icon: '🗑️', bg: 'rgba(239,68,68,0.12)' },
    bulk_delete_servers: { icon: '🗑️', bg: 'rgba(239,68,68,0.12)' },
  };

  const labels = {
    login: 'Admin Login',
    logout: 'Admin Logout',
    server_created: 'Server Created',
    server_deleted: 'Server Deleted',
    admin_created: 'Admin Created',
    admin_deleted: 'Admin Deleted',
    bulk_delete_users: 'Bulk Delete Users',
    bulk_delete_servers: 'Bulk Delete Servers',
  };

  el.innerHTML = activities.map(a => {
    const ic = icons[a.type] || { icon: '📝', bg: 'rgba(255,255,255,0.08)' };
    const detail = a.data?.username || a.data?.name || a.data?.email || (a.data?.count ? `${a.data.count} items` : '');
    return `
      <div class="activity-item">
        <div class="activity-icon" style="background:${ic.bg};">${ic.icon}</div>
        <div class="activity-content">
          <div class="activity-text">${labels[a.type] || a.type}${detail ? ` — <span style="color:var(--text-secondary)">${detail}</span>` : ''}</div>
          <div class="activity-time">${Utils.timeAgo(a.createdAt)} ${a.userId && a.userId !== 'system' ? `· by ${a.userId}` : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===========================
// NOTIFICATIONS
// ===========================
async function loadNotifications() {
  const res = await API.get('/notifications');
  if (!res.success) return;

  const notifications = res.data || [];
  const unread = notifications.filter(n => !n.read).length;

  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }

  const list = document.getElementById('notif-list');
  if (list) {
    if (!notifications.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications</div>';
    } else {
      list.innerHTML = notifications.slice(0, 10).map(n => {
        const typeColors = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--accent)' };
        return `
          <div class="notif-item">
            <div class="notif-item-title" style="color:${typeColors[n.type] || 'var(--text-primary)'};">${n.title}</div>
            <div class="notif-item-msg">${n.message}</div>
            <div class="notif-item-time">${Utils.timeAgo(n.createdAt)}</div>
          </div>
        `;
      }).join('');
    }
  }
}

function toggleNotifications() {
  notifDropdownOpen = !notifDropdownOpen;
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) dropdown.classList.toggle('open', notifDropdownOpen);
}

document.addEventListener('click', (e) => {
  const notifBtn = document.getElementById('notif-btn');
  const dropdown = document.getElementById('notif-dropdown');
  if (notifDropdownOpen && !notifBtn?.contains(e.target) && !dropdown?.contains(e.target)) {
    notifDropdownOpen = false;
    dropdown?.classList.remove('open');
  }
});

// ===========================
// PAGINATION
// ===========================
function renderPagination(totalPages, currentPage, type) {
  const el = document.getElementById(`${type}-pagination`);
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);
  el.innerHTML = `
    <button class="page-btn" onclick="changePage('${type}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>
    ${pages.map(p => `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="changePage('${type}', ${p})">${p}</button>`).join('')}
    <button class="page-btn" onclick="changePage('${type}', ${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>
  `;
}

function changePage(type, page) {
  if (type === 'server') {
    serverPage = page;
    loadServers();
  }
}

// ===========================
// SEARCH
// ===========================
const handleServerSearch = Utils.debounce((val) => {
  serverSearch = val.toLowerCase();
  renderServersTable(serversData);
}, 250);

// ===========================
// SKELETON LOADER
// ===========================
function showTableSkeleton(tbodyId, rows, cols) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: rows }, () => `
    <tr>${Array.from({ length: cols }, () => `<td><div class="skeleton" style="height:18px;border-radius:6px;"></div></td>`).join('')}</tr>
  `).join('');
}

// ===========================
// LOGOUT
// ===========================
async function logout() {
  await API.post('/auth/logout', {});
  API.clearToken();
  window.location.href = '/login.html';
}
