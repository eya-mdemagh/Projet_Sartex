// Utilisateur en localStorage : { email, passwordHash }
function hash(str) { return btoa(unescape(encodeURIComponent(str))); }

function saveUser(email, password) {
  localStorage.setItem('user_' + email, JSON.stringify({ email, passwordHash: hash(password) }));
}
function getUser(email) {
  const u = localStorage.getItem('user_' + email);
  return u ? JSON.parse(u) : null;
}
function setSession(email) {
  localStorage.setItem('session_user', email);
}
function getSession() {
  return localStorage.getItem('session_user');
}
function clearSession() {
  localStorage.removeItem('session_user');
}

// Redirige si déjà connecté
if (getSession()) {
  window.location.href = 'index.html';
}

document.getElementById('tab-login').onclick = function() {
  this.classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
  document.getElementById('form-login').style.display = '';
  document.getElementById('form-register').style.display = 'none';
};
document.getElementById('tab-register').onclick = function() {
  this.classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('form-register').style.display = '';
};

document.getElementById('login-btn').onclick = function() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const error = document.getElementById('login-error');
  error.textContent = '';
  if (!email || !password) {
    error.textContent = 'Veuillez remplir tous les champs.';
    return;
  }
  const user = getUser(email);
  if (!user || user.passwordHash !== hash(password)) {
    error.textContent = 'Email ou mot de passe incorrect.';
    return;
  }
  setSession(email);
  window.location.href = 'index.html';
};

document.getElementById('register-btn').onclick = function() {
  const email = document.getElementById('register-email').value.trim().toLowerCase();
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;
  const error = document.getElementById('register-error');
  const success = document.getElementById('register-success');
  error.textContent = '';
  success.textContent = '';
  if (!email || !password || !password2) {
    error.textContent = 'Veuillez remplir tous les champs.';
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    error.textContent = 'Email invalide.';
    return;
  }
  if (password.length < 9) {
    error.textContent = 'Le mot de passe doit contenir au moins 9 caractères.';
    return;
  }
  if (password !== password2) {
    error.textContent = 'Les mots de passe ne correspondent pas.';
    return;
  }
  if (getUser(email)) {
    error.textContent = 'Cet email est déjà utilisé.';
    return;
  }
  saveUser(email, password);
  success.textContent = 'Inscription réussie ! Vous pouvez vous connecter.';
}; 