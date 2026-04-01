const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

if (SUPABASE_URL.includes('YOUR_PROJECT_REF') || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
  document.getElementById('status-box').textContent =
    'Update SUPABASE_URL and SUPABASE_ANON_KEY in public/app.js before using the app.';
}

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

function setStatus(text) {
  ui.status.textContent = text;
}

function setVisiblePanel(role) {
  ui.applicantPanel.classList.add('hidden');
  ui.scrutinyPanel.classList.add('hidden');
  ui.adminPanel.classList.add('hidden');

  if (role === 'applicant') ui.applicantPanel.classList.remove('hidden');
  if (role === 'scrutiny') ui.scrutinyPanel.classList.remove('hidden');
  if (role === 'admin') ui.adminPanel.classList.remove('hidden');
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
  const { data, error } = await client
    .from('form_submissions')
    .select('*')
    .order('created_at', { ascending: false });

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
  const { error } = await client
    .from('form_submissions')
    .update({ status })
    .eq('id', id);

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
  const { data, error } = await client
    .from('form_submissions')
    .select('*')
    .order('created_at', { ascending: false });

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

async function boot() {
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session) {
    ui.authCard.classList.remove('hidden');
    ui.appShell.classList.add('hidden');
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

  ui.userEmail.textContent = user.email;
  ui.userRole.textContent = role;
  ui.authCard.classList.add('hidden');
  ui.appShell.classList.remove('hidden');

  setVisiblePanel(role);

  if (role === 'scrutiny') {
    await loadScrutinyList();
  }
  if (role === 'admin') {
    await loadAdminReport();
  }
}

ui.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Signing in...');

  const email = ui.loginEmail.value;
  const password = ui.loginPassword.value;

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    setStatus(`Login failed: ${error.message}`);
    return;
  }

  setStatus('Logged in successfully.');
  await boot();
});

ui.logoutBtn.addEventListener('click', async () => {
  const { error } = await client.auth.signOut();
  if (error) {
    setStatus(`Logout failed: ${error.message}`);
    return;
  }

  setStatus('Logged out.');
  await boot();
});

ui.submissionForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: ui.applicantName.value.trim(),
    email: ui.applicantEmail.value.trim(),
    feedback: ui.applicantFeedback.value.trim()
  };

  const { error } = await client.from('form_submissions').insert(payload);

  if (error) {
    ui.applicantMessage.textContent = `Submission failed: ${error.message}`;
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

client.auth.onAuthStateChange(async () => {
  await boot();
});

boot();
