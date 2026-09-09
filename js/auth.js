// ============================================================
// AUTHENTICATION MODULE
// Equipment Borrowing & Return Monitoring System
// ============================================================

// ---- Toast Notification Helper ----
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Make showToast available globally
window.showToast = showToast;

// ---- Login Function ----
async function login(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    throw error;
  }

  return data;
}

// ---- Logout Function ----
async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error('Logout error:', error);
  }
  window.location.href = 'login.html';
}

// ---- Check Session (protect pages) ----
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  const path = window.location.pathname;
  const isLoginPage = path.endsWith('login.html') || path.endsWith('/login');

  if (!session) {
    // Not authenticated — redirect to login
    if (!isLoginPage) {
      window.location.href = 'login.html';
    }
    return null;
  }

  // Authenticated — redirect away from login page
  if (isLoginPage) {
    window.location.href = 'index.html';
    return session;
  }

  return session;
}

// ---- Get Current User ----
async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// ---- Initialize Login Page ----
function initLoginPage() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      errorEl.textContent = 'Please enter both email and password.';
      errorEl.classList.add('show');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
    errorEl.classList.remove('show');

    try {
      await login(email, password);
      window.location.href = 'index.html';
    } catch (error) {
      errorEl.textContent = error.message || 'Invalid email or password.';
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In';
    }
  });
}

// ---- Initialize Auth for Main App ----
async function initAuth() {
  const session = await checkSession();
  if (!session) return null;

  const user = session.user;

  // Update UI with user info
  const userInfoEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');

  if (userInfoEl && user) {
    userInfoEl.textContent = user.email;
  }
  if (avatarEl && user) {
    avatarEl.textContent = user.email.charAt(0).toUpperCase();
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  return user;
}
