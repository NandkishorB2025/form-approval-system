const SUPABASE_URL = window.SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const SUPABASE_CONFIGURED =
  !SUPABASE_URL.includes('YOUR_PROJECT_REF') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

if (!SUPABASE_CONFIGURED) {
  document.getElementById('status-box').textContent =
    'Supabase is not configured. Demo login works, but live database entry capture requires valid Supabase URL and ANON key.';
}

const DEMO_USERS = {
  nandkishor2026: { role: 'applicant', password: 'Pass@123', email: 'Nandkishor2026' },
  scrutiny2026: { role: 'scrutiny', password: 'Pass@123', email: 'Scrutiny2026' },
  admin2026: { role: 'admin', password: 'Pass@123', email: 'Admin2026' },
  foradmin2026: { role: 'admin', password: 'Pass@123', email: 'forAdmin2026' }
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
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).single();

  if (error) throw error;
  return data?.role;
}

async function loadScrutinyList() {
  if (!SUPABASE_CONFIGURED) {
    ui.scrutinyList.innerHTML = '<div class="item">Demo mode: connect Supabase to load submissions.</div>';
    return;
  }

  const { data, error } = await client.from('form_submissions').select('*').order('created_at', { ascending: false });

  if (error) {
    setStatus(`Could not load scrutiny list: ${error.message}`);
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
  if (!SUPABASE_CONFIGURED) {
    setStatus('Demo mode: connect Supabase to update statuses.');
    return;
  }

  const { error } = await client.from('form_submissions').update({ status }).eq('id', id);

  if (error) {
    setStatus(`Unable to update status: ${error.message}`);
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
          backgroundColor: ['#b45309', '#15803d', '#b91c1c']
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
  if (!SUPABASE_CONFIGURED) {
    ui.statTotal.textContent = '0';
    ui.statPending.textContent = '0';
    ui.statApproved.textContent = '0';
    ui.statRejected.textContent = '0';
    ui.adminTable.innerHTML = '<div class="item">Demo mode: connect Supabase to view admin reports.</div>';
    renderChart({ pending: 0, approved: 0, rejected: 0 });
    return;
  }

  const { data, error } = await client.from('form_submissions').select('*').order('created_at', { ascending: false });

  if (error) {
    setStatus(`Could not load admin report: ${error.message}`);
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

  ui.adminTable.innerHTML = data
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
    .join('');
}

function applySession(user) {
  currentUser = user;

  if (!user) {
    ui.authCard.classList.remove('hidden');
    ui.appShell.classList.add('hidden');
    return;
  }

  ui.userEmail.textContent = user.email;
  ui.userRole.textContent = user.role;
  ui.authCard.classList.add('hidden');
  ui.appShell.classList.remove('hidden');
  setVisiblePanel(user.role);
}

function setupRealtimeSync() {
  if (!SUPABASE_CONFIGURED) return;

  client
    .channel('form_submissions_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'form_submissions'
      },
      async () => {
        if (!currentUser) return;
        if (currentUser.role === 'scrutiny') await loadScrutinyList();
        if (currentUser.role === 'admin') await loadAdminReport();
      }
    )
    .subscribe();
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

  if (role === 'scrutiny') await loadScrutinyList();
  if (role === 'admin') await loadAdminReport();
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

  const { error } = await client.auth.signInWithPassword({ email: username, password });

  if (error) {
    setStatus(`Login failed: ${error.message}`);
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

  const payload = {
    name: ui.applicantName.value.trim(),
    email: ui.applicantEmail.value.trim(),
    feedback: ui.applicantFeedback.value.trim()
  };

  if (!payload.name || !payload.email || !payload.feedback) {
    ui.applicantMessage.textContent = 'All fields are required.';
    return;
  }

  if (!SUPABASE_CONFIGURED) {
    ui.submissionForm.reset();
    ui.applicantMessage.textContent = 'Demo mode: form captured locally only (Supabase not connected).';
    return;
  }

  const { error } = await client.from('form_submissions').insert(payload);

  if (error) {
    ui.applicantMessage.textContent = `Submission failed: ${error.message}`;
    return;
  }

  ui.submissionForm.reset();
  ui.applicantMessage.textContent = 'Form submitted successfully and stored in live database.';
  setStatus('Submission captured in Supabase.');
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
  setupRealtimeSync();
}

boot();
