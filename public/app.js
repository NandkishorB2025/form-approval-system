const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const SUBMISSIONS_TABLE = 'applications';
const DEMO_STORAGE_KEY = 'formApprovalSubmissions';

const SUPABASE_CONFIGURED =
  !SUPABASE_URL.includes('YOUR_PROJECT_REF') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

if (!SUPABASE_CONFIGURED) {
  document.getElementById('status-box').textContent =
    'Demo mode enabled. Login as Applicant, Scrutiny, or Admin to run the full workflow locally.';
}

const DEMO_USERS = {
  nandkishor2026: { role: 'applicant', password: 'Pass@123', email: 'Nandkishor2026' },
  scrutiny2026: { role: 'scrutiny', password: 'Pass@123', email: 'Scrutiny2026' },
  admin2026: { role: 'admin', password: 'Pass@123', email: 'Admin2026' },
  foradmin2026: { role: 'admin', password: 'Pass@123', email: 'forAdmin2026' }
};

const USERNAME_EMAIL_MAP = {
  applicant: 'applicant@example.com',
  scrutiny: 'scrutiny@example.com',
  admin: 'admin@example.com'
};

const client = SUPABASE_CONFIGURED ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const ui = {
  authCard: document.getElementById('auth-card'),
  appShell: document.getElementById('app-shell'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  logoutBtn: document.getElementById('logout-btn'),
  userEmail: document.getElementById('user-email'),
  userRole: document.getElementById('user-role'),
  status: document.getElementById('status-box'),
  panelTabs: document.getElementById('panel-tabs'),

  applicantPanel: document.getElementById('applicant-panel'),
  submissionForm: document.getElementById('submission-form'),
  applicantName: document.getElementById('applicant-name'),
  applicantEmail: document.getElementById('applicant-email'),
  applicantFeedback: document.getElementById('applicant-feedback'),
  applicantMessage: document.getElementById('applicant-message'),

  scrutinyPanel: document.getElementById('scrutiny-panel'),
  scrutinyList: document.getElementById('scrutiny-list'),

  adminPanel: document.getElementById('admin-panel'),
  adminTable: document.getElementById('admin-table'),
  statTotal: document.getElementById('stat-total'),
  statPending: document.getElementById('stat-pending'),
  statApproved: document.getElementById('stat-approved'),
  statRejected: document.getElementById('stat-rejected'),
  chartCanvas: document.getElementById('status-chart')
};

let statusChart;
let currentUser = null;

function setStatus(text) {
  ui.status.textContent = text;
}

function getDemoSubmissions() {
  try {
    const value = window.localStorage.getItem(DEMO_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDemoSubmissions(items) {
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(items));
}

function getAllowedPanels(role) {
  if (!role) return [];
  if (role === 'applicant') return ['applicant'];
  if (role === 'scrutiny') return ['scrutiny'];
  if (role === 'admin') return ['admin'];
  return [];
}

function applyRoleVisibility(role) {
  const allowedPanels = getAllowedPanels(role);
  ui.panelTabs.querySelectorAll('button[data-panel]').forEach((button) => {
    button.classList.toggle('hidden', !allowedPanels.includes(button.dataset.panel));
  });
}

function setVisiblePanel(panelKey) {
  ui.applicantPanel.classList.add('hidden');
  ui.scrutinyPanel.classList.add('hidden');
  ui.adminPanel.classList.add('hidden');

  ui.panelTabs.querySelectorAll('button[data-panel]').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelKey);
  });

  if (panelKey === 'applicant') ui.applicantPanel.classList.remove('hidden');
  if (panelKey === 'scrutiny') ui.scrutinyPanel.classList.remove('hidden');
  if (panelKey === 'admin') ui.adminPanel.classList.remove('hidden');
}

async function getProfileRole(userId) {
  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data?.role;
}

async function loadScrutinyList() {
  if (!currentUser || currentUser.role !== 'scrutiny') {
    ui.scrutinyList.innerHTML = '<div class="item">Only scrutiny users can review submissions.</div>';
    return;
  }

  if (!SUPABASE_CONFIGURED) {
    const demoRows = getDemoSubmissions();
    if (!demoRows.length) {
      ui.scrutinyList.innerHTML = '<div class="item">No submissions yet.</div>';
      return;
    }

    ui.scrutinyList.innerHTML = demoRows
      .map(
        (row) => `
      <article class="item">
        <div class="row">
          <strong>${row.name}</strong>
          <span class="tag ${row.status}">${row.status}</span>
        </div>
        <div>${row.email}</div>
        <p>${row.feedback}</p>
        <small>${new Date(row.created_at).toLocaleString()}</small>
        <div class="actions">
          <button class="ok" data-id="${row.id}" data-status="approved">Approve</button>
          <button class="bad" data-id="${row.id}" data-status="rejected">Reject</button>
        </div>
      </article>
    `
      )
      .join('');
    return;
  }

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    setStatus(`Could not load scrutiny list from "${SUBMISSIONS_TABLE}": ${error.message}`);
    return;
  }

  if (!data.length) {
    ui.scrutinyList.innerHTML = '<div class="item">No submissions yet.</div>';
    return;
  }

  ui.scrutinyList.innerHTML = data
    .map(
      (row) => `
      <article class="item">
        <div class="row">
          <strong>${row.name}</strong>
          <span class="tag ${row.status}">${row.status}</span>
        </div>
        <div>${row.email}</div>
        <p>${row.feedback}</p>
        <small>${new Date(row.created_at).toLocaleString()}</small>
        <div class="actions">
          <button class="ok" data-id="${row.id}" data-status="approved">Approve</button>
          <button class="bad" data-id="${row.id}" data-status="rejected">Reject</button>
        </div>
      </article>
    `
    )
    .join('');
}

async function updateSubmissionStatus(id, status) {
  if (!currentUser || currentUser.role !== 'scrutiny') {
    setStatus('Only scrutiny users can update status.');
    return;
  }

  if (!SUPABASE_CONFIGURED) {
    const items = getDemoSubmissions();
    const idx = items.findIndex((item) => item.id === id);

    if (idx === -1) {
      setStatus('Submission not found.');
      return;
    }

    items[idx].status = status;
    items[idx].updated_at = new Date().toISOString();
    saveDemoSubmissions(items);
    setStatus(`Submission ${status} successfully.`);
    await Promise.all([loadScrutinyList(), loadAdminReport()]);
    return;
  }

  const { error } = await client
    .from(SUBMISSIONS_TABLE)
    .update({ status })
    .eq('id', id);

  if (error) {
    setStatus(`Unable to update status in "${SUBMISSIONS_TABLE}": ${error.message}`);
    return;
  }

  setStatus(`Submission ${status} successfully.`);
  await Promise.all([loadScrutinyList(), loadAdminReport()]);
}

function renderChart(stats) {
  if (statusChart) {
    statusChart.destroy();
  }

  statusChart = new Chart(ui.chartCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Approved', 'Rejected'],
      datasets: [
        {
          data: [stats.pending, stats.approved, stats.rejected],
          backgroundColor: ['#d97706', '#16a34a', '#dc2626']
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

async function loadAdminReport() {
  if (!currentUser || currentUser.role !== 'admin') {
    ui.adminTable.innerHTML = '<div class="item">Only admins can monitor reports.</div>';
    return;
  }

  if (!SUPABASE_CONFIGURED) {
    const data = getDemoSubmissions();
    const stats = data.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );

    ui.statTotal.textContent = stats.total;
    ui.statPending.textContent = stats.pending;
    ui.statApproved.textContent = stats.approved;
    ui.statRejected.textContent = stats.rejected;

    renderChart(stats);

    ui.adminTable.innerHTML = data.length
      ? data
          .map(
            (row) => `
      <article class="item">
        <div class="row">
          <strong>${row.name}</strong>
          <span class="tag ${row.status}">${row.status}</span>
        </div>
        <div>${row.email}</div>
        <p>${row.feedback}</p>
        <small>${new Date(row.created_at).toLocaleString()}</small>
      </article>
    `
          )
          .join('')
      : '<div class="item">No submissions yet.</div>';

    return;
  }

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    setStatus(`Could not load admin report from "${SUBMISSIONS_TABLE}": ${error.message}`);
    return;
  }

  const stats = data.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.status] += 1;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 }
  );

  ui.statTotal.textContent = stats.total;
  ui.statPending.textContent = stats.pending;
  ui.statApproved.textContent = stats.approved;
  ui.statRejected.textContent = stats.rejected;

  renderChart(stats);

  ui.adminTable.innerHTML = data.length
    ? data
        .map(
          (row) => `
      <article class="item">
        <div class="row">
          <strong>${row.name}</strong>
          <span class="tag ${row.status}">${row.status}</span>
        </div>
        <div>${row.email}</div>
        <p>${row.feedback}</p>
        <small>${new Date(row.created_at).toLocaleString()}</small>
      </article>
    `
        )
        .join('')
    : '<div class="item">No submissions yet.</div>';
}

function applySession(user) {
  currentUser = user;

  if (!user) {
    ui.authCard.classList.remove('hidden');
    ui.appShell.classList.add('hidden');
    ui.userEmail.textContent = 'Guest';
    ui.userRole.textContent = 'landing';
    ui.logoutBtn.classList.add('hidden');
    applyRoleVisibility(null);
    return;
  }

  ui.userEmail.textContent = user.email;
  ui.userRole.textContent = user.role;
  ui.logoutBtn.classList.remove('hidden');
  ui.authCard.classList.add('hidden');
  ui.appShell.classList.remove('hidden');
  applyRoleVisibility(user.role);
  setVisiblePanel(user.role);
}

function resolveLoginIdentifier(rawInput) {
  if (rawInput.includes('@')) return rawInput;

  if (!SUPABASE_CONFIGURED) return rawInput;

  const mapped = USERNAME_EMAIL_MAP[rawInput];
  return mapped || rawInput;
}

async function boot() {
  if (!SUPABASE_CONFIGURED) {
    const demoSession = window.sessionStorage.getItem('demoSession');
    applySession(demoSession ? JSON.parse(demoSession) : null);
    return;
  }

  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session) {
    applySession(null);
    return;
  }

  const {
    data: { user }
  } = await client.auth.getUser();

  let role = 'applicant';
  try {
    role = await getProfileRole(user.id);
  } catch (error) {
    setStatus(`Role lookup failed: ${error.message}`);
  }

  applySession({ email: user.email, role, id: user.id });
}

ui.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Signing in...');

  const username = ui.loginEmail.value.trim().toLowerCase();
  const password = ui.loginPassword.value;

  if (!SUPABASE_CONFIGURED) {
    const demoUser = DEMO_USERS[username];
    if (!demoUser || demoUser.password !== password) {
      setStatus('Login failed: Invalid credentials.');
      return;
    }

    const session = { email: demoUser.email, role: demoUser.role };
    window.sessionStorage.setItem('demoSession', JSON.stringify(session));
    applySession(session);
    setStatus('Logged in successfully.');

    if (demoUser.role === 'scrutiny') await loadScrutinyList();
    if (demoUser.role === 'admin') await loadAdminReport();
    return;
  }

  const loginIdentifier = resolveLoginIdentifier(username);
  const { error } = await client.auth.signInWithPassword({ email: loginIdentifier, password });

  if (error) {
    setStatus(
      `Login failed: ${error.message}. If you used a username, map it in USERNAME_EMAIL_MAP in public/app.js.`
    );
    return;
  }

  setStatus('Logged in successfully.');
  await boot();
});

ui.logoutBtn.addEventListener('click', async () => {
  if (!SUPABASE_CONFIGURED) {
    window.sessionStorage.removeItem('demoSession');
    setStatus('Logged out.');
    applySession(null);
    return;
  }

  const { error } = await client.auth.signOut();
  if (error) {
    setStatus(`Logout failed: ${error.message}`);
    return;
  }

  setStatus('Logged out.');
  await boot();
});

ui.panelTabs.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-panel]');
  if (!button || !currentUser) return;

  const panel = button.dataset.panel;
  if (!getAllowedPanels(currentUser.role).includes(panel)) {
    setStatus(`Access denied for ${panel} panel.`);
    return;
  }

  setVisiblePanel(panel);

  if (panel === 'scrutiny') {
    await loadScrutinyList();
  }

  if (panel === 'admin') {
    await loadAdminReport();
  }
});

ui.submissionForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser || currentUser.role !== 'applicant') {
    ui.applicantMessage.textContent = 'Only applicants can submit forms.';
    return;
  }

  const payload = {
    name: ui.applicantName.value.trim(),
    email: ui.applicantEmail.value.trim(),
    feedback: ui.applicantFeedback.value.trim()
  };

  if (!payload.name || !payload.email || !payload.feedback) {
    ui.applicantMessage.textContent = 'Please fill all fields.';
    return;
  }

  if (!SUPABASE_CONFIGURED) {
    const items = getDemoSubmissions();
    items.unshift({
      id: crypto.randomUUID(),
      applicant_id: currentUser.email,
      ...payload,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    saveDemoSubmissions(items);
    ui.submissionForm.reset();
    ui.applicantMessage.textContent = 'Form submitted successfully.';
    setStatus('Applicant submission saved. Scrutiny can now review it.');
    return;
  }

  const { error } = await client.from(SUBMISSIONS_TABLE).insert(payload);

  if (error) {
    ui.applicantMessage.textContent = `Submission failed for "${SUBMISSIONS_TABLE}": ${error.message}`;
    return;
  }

  ui.submissionForm.reset();
  ui.applicantMessage.textContent = 'Form submitted successfully.';
});

ui.scrutinyList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;

  await updateSubmissionStatus(button.dataset.id, button.dataset.status);
});

if (SUPABASE_CONFIGURED) {
  client.auth.onAuthStateChange(async () => {
    await boot();
  });
}

boot();
