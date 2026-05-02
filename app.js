// ═══════════════════════════════════════════════════════════
//  app.js  —  All logic for Heat Conduction Virtual Lab
//  Uses localStorage so everything works on GitHub Pages
// ═══════════════════════════════════════════════════════════

// ── localStorage helpers ────────────────────────────────────
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function load(key)       { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }

// ── Current student ─────────────────────────────────────────
function getStudent()    { return load('hc_student'); }
function isLoggedIn()    { return !!getStudent(); }

// ── Page router ─────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) {
    pg.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Update active nav button
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === id);
  });
}

// Guard: if not logged in, go to login
function guardedShow(id) {
  if (!isLoggedIn()) { showPage('page-login'); return; }
  showPage(id);
  // Refresh header name
  setHeaderName();
  // Refresh dashboard if going there
  if (id === 'page-dashboard') refreshDashboard();
}

function setHeaderName() {
  const s = getStudent();
  document.querySelectorAll('.welcome-name').forEach(el => {
    el.textContent = s ? `Welcome, ${s.name}` : 'Welcome, Student';
  });
}

// ── REGISTER ────────────────────────────────────────────────
function doRegister() {
  const name    = v('reg-name');
  const roll    = v('reg-roll');
  const pass    = v('reg-pass');
  const confirm = v('reg-confirm');

  if (!name || !roll || !pass || !confirm)
    return msg('reg-msg', 'All fields are required.', 'error');
  if (pass.length < 4)
    return msg('reg-msg', 'Password must be at least 4 characters.', 'error');
  if (pass !== confirm)
    return msg('reg-msg', 'Passwords do not match.', 'error');

  // Check if roll already exists
  const existing = load('hc_user_' + roll);
  if (existing)
    return msg('reg-msg', 'Roll number already registered. Please login.', 'error');

  // Save user account
  save('hc_user_' + roll, { name, roll, pass });

  msg('reg-msg', 'Registration successful! Redirecting to login...', 'success');
  setTimeout(() => showPage('page-login'), 1200);
}

// ── LOGIN ───────────────────────────────────────────────────
function doLogin() {
  const roll = v('login-roll');
  const pass = v('login-pass');

  if (!roll || !pass)
    return msg('login-msg', 'Please enter roll number and password.', 'error');

  const user = load('hc_user_' + roll);
  if (!user || user.pass !== pass)
    return msg('login-msg', 'Invalid roll number or password.', 'error');

  // Store session
  save('hc_student', { name: user.name, roll: user.roll });

  msg('login-msg', 'Login successful!', 'success');
  setTimeout(() => {
    setHeaderName();
    refreshDashboard();
    showPage('page-dashboard');
  }, 600);
}

// ── LOGOUT ──────────────────────────────────────────────────
function doLogout() {
  localStorage.removeItem('hc_student');
  showPage('page-login');
}

// ── DASHBOARD ───────────────────────────────────────────────
function refreshDashboard() {
  const s = getStudent();
  if (!s) return;

  const results  = load('hc_results_' + s.roll) || {};
  const feedback = load('hc_feedback_' + s.roll);

  set('db-name',    s.name);
  set('db-roll',    s.roll);
  set('db-pretest', results.pretest  !== undefined ? `${results.pretest} / 5`  : 'Not attempted');
  set('db-posttest',results.posttest !== undefined ? `${results.posttest} / 5` : 'Not attempted');
  set('db-sim',     results.sim      || 'Not completed');
  set('db-fb',      feedback ? `✔ Submitted (${feedback.rating}★)` : 'Not submitted');
}

// ── PRETEST ─────────────────────────────────────────────────
const PRETEST_ANS = { pt1:'b', pt2:'a', pt3:'a', pt4:'c', pt5:'c' };

function submitPretest() {
  let score = 0, allDone = true;

  for (const [q, correct] of Object.entries(PRETEST_ANS)) {
    const sel = document.querySelector(`input[name="${q}"]:checked`);
    if (!sel) { allDone = false; break; }

    // Colour feedback
    const opts = document.querySelectorAll(`input[name="${q}"]`);
    opts.forEach(o => {
      const lbl = o.closest('.mcq-option');
      if (o.value === correct) lbl.classList.add('correct-ans');
      else if (o.checked)      lbl.classList.add('wrong-ans');
      o.disabled = true;
    });

    if (sel.value === correct) score++;
  }

  if (!allDone) return msg('pre-msg', 'Please answer all 5 questions.', 'error');

  // Save
  const s = getStudent();
  const results = load('hc_results_' + s.roll) || {};
  results.pretest = score;
  save('hc_results_' + s.roll, results);

  // Show result
  const box = document.getElementById('pre-result');
  box.style.display = 'block';
  set('pre-score', `Your Score: ${score} / 5`);
  set('pre-sub', score===5 ? '🏆 Perfect score!' : score>=3 ? '👍 Good effort! Review theory before simulation.' : '📚 Study the theory carefully before proceeding.');
  document.getElementById('pre-submit-btn').disabled = true;
  msg('pre-msg', 'Pretest marks saved to your profile!', 'success');
}

// ── POSTTEST ─────────────────────────────────────────────────
const POSTTEST_ANS = { po1:'b', po2:'c', po3:'b', po4:'c', po5:'c' };

function submitPosttest() {
  let score = 0, allDone = true;

  for (const [q, correct] of Object.entries(POSTTEST_ANS)) {
    const sel = document.querySelector(`input[name="${q}"]:checked`);
    if (!sel) { allDone = false; break; }

    const opts = document.querySelectorAll(`input[name="${q}"]`);
    opts.forEach(o => {
      const lbl = o.closest('.mcq-option');
      if (o.value === correct) lbl.classList.add('correct-ans');
      else if (o.checked)      lbl.classList.add('wrong-ans');
      o.disabled = true;
    });

    if (sel.value === correct) score++;
  }

  if (!allDone) return msg('post-msg', 'Please answer all 5 questions.', 'error');

  const s = getStudent();
  const results = load('hc_results_' + s.roll) || {};
  results.posttest = score;
  save('hc_results_' + s.roll, results);

  const box = document.getElementById('post-result');
  box.style.display = 'block';
  set('post-score', `Your Score: ${score} / 5`);
  set('post-sub', score===5 ? '🏆 Excellent! You mastered the concepts!' : score>=3 ? '👍 Good job! Keep learning.' : '📚 Review the theory and try again.');
  document.getElementById('post-submit-btn').disabled = true;
  msg('post-msg', 'Posttest marks saved to your profile!', 'success');
}

// ── SIMULATION ───────────────────────────────────────────────

const challenges = {
  heatFlux: {
    title: 'Heat Flux Challenge',
    desc:  'Given k, T₁, T₂, L — calculate heat flux q (W/m²)',
    fields: [
      { id:'k',  label:'Thermal Conductivity k (W/m·K)' },
      { id:'t1', label:'Hot End Temperature T₁ (°C)' },
      { id:'t2', label:'Cold End Temperature T₂ (°C)' },
      { id:'L',  label:'Thickness L (m)' },
    ],
    calc: v => (v.k * (v.t1 - v.t2)) / v.L,
    hint: 'Formula: q = k × (T₁ − T₂) / L',
    unit: 'W/m²',
  },
  heatRate: {
    title: 'Rate of Heat Flow Challenge',
    desc:  'Given k, A, T₁, T₂, L — calculate Q (W)',
    fields: [
      { id:'k',  label:'Thermal Conductivity k (W/m·K)' },
      { id:'A',  label:'Cross-sectional Area A (m²)' },
      { id:'t1', label:'Hot End Temperature T₁ (°C)' },
      { id:'t2', label:'Cold End Temperature T₂ (°C)' },
      { id:'L',  label:'Thickness L (m)' },
    ],
    calc: v => (v.k * v.A * (v.t1 - v.t2)) / v.L,
    hint: 'Formula: Q = k × A × (T₁ − T₂) / L',
    unit: 'W',
  },
  conductivity: {
    title: 'Thermal Conductivity Challenge',
    desc:  'Given Q, A, T₁, T₂, L — find k (W/m·K)',
    fields: [
      { id:'Q',  label:'Heat Flow Rate Q (W)' },
      { id:'A',  label:'Cross-sectional Area A (m²)' },
      { id:'t1', label:'Hot End Temperature T₁ (°C)' },
      { id:'t2', label:'Cold End Temperature T₂ (°C)' },
      { id:'L',  label:'Thickness L (m)' },
    ],
    calc: v => (v.Q * v.L) / (v.A * (v.t1 - v.t2)),
    hint: 'Formula: k = Q × L / (A × (T₁ − T₂))',
    unit: 'W/m·K',
  },
  tempPoint: {
    title: 'Temperature at a Point Challenge',
    desc:  'Given T₁, T₂, x, L — find T(x) in °C',
    fields: [
      { id:'t1', label:'Hot End Temperature T₁ (°C)' },
      { id:'t2', label:'Cold End Temperature T₂ (°C)' },
      { id:'x',  label:'Position x from hot end (m)' },
      { id:'L',  label:'Total Length L (m)' },
    ],
    calc: v => v.t1 - ((v.t1 - v.t2) * v.x / v.L),
    hint: 'Formula: T(x) = T₁ − (T₁ − T₂) × x / L',
    unit: '°C',
  },
};

let simCurrent   = null;
let simCorrectAns = 0;
let simScore     = 0;
let simDone      = [];

function openChallenge(type) {
  simCurrent = type;
  const cfg  = challenges[type];

  set('sim-modal-title', cfg.title);
  set('sim-modal-desc',  cfg.desc);
  set('sim-cur-name',    cfg.title.replace(' Challenge',''));

  // Build input fields
  let html = '';
  cfg.fields.forEach(f => {
    html += `
      <div class="form-group">
        <label>${f.label}</label>
        <input type="number" id="sf_${f.id}" placeholder="Enter value" step="any"/>
      </div>`;
  });
  document.getElementById('sim-modal-inputs').innerHTML = html;

  // Reset answer modal
  document.getElementById('sim-ans-input').value = '';
  document.getElementById('sim-ans-msg').style.display = 'none';
  document.getElementById('sim-hint-box').style.display = 'none';

  openModal('sim-input-modal');
}

function simGoToAnswer() {
  const cfg = challenges[simCurrent];
  const vals = {};
  let ok = true;

  cfg.fields.forEach(f => {
    const val = parseFloat(document.getElementById(`sf_${f.id}`).value);
    if (isNaN(val)) ok = false;
    vals[f.id] = val;
  });

  if (!ok) { alert('Please fill in all fields with numbers.'); return; }

  simCorrectAns = cfg.calc(vals);
  closeModal('sim-input-modal');

  set('sim-ans-label', `Your Answer (${cfg.unit})`);
  openModal('sim-answer-modal');
}

function simCheckAnswer() {
  const val = parseFloat(document.getElementById('sim-ans-input').value);
  if (isNaN(val)) {
    return msg('sim-ans-msg', 'Please enter a numeric answer.', 'error');
  }

  const tol = Math.max(Math.abs(simCorrectAns) * 0.02, 0.05);
  const ok  = Math.abs(val - simCorrectAns) <= tol;

  if (ok) {
    msg('sim-ans-msg',
      `✔ Correct! Answer = ${simCorrectAns.toFixed(3)} ${challenges[simCurrent].unit}`,
      'success');

    if (!simDone.includes(simCurrent)) {
      simDone.push(simCurrent);
      simScore += 10;
      updateSimBoard();

      // Mark card as done
      const card = document.getElementById('card-' + simCurrent);
      if (card) card.classList.add('done');

      // Save to profile when all done
      if (simDone.length === 4) {
        const s = getStudent();
        const results = load('hc_results_' + s.roll) || {};
        results.sim = `All 4 challenges completed. Score: ${simScore}/40`;
        save('hc_results_' + s.roll, results);

        setTimeout(() => {
          closeModal('sim-answer-modal');
          alert('🎉 All 4 challenges completed! Your result is saved. Now take the Posttest.');
        }, 1000);
      } else {
        setTimeout(() => closeModal('sim-answer-modal'), 1400);
      }
    } else {
      setTimeout(() => closeModal('sim-answer-modal'), 1400);
    }
  } else {
    msg('sim-ans-msg',
      `✗ Incorrect. Expected ≈ ${simCorrectAns.toFixed(3)} ${challenges[simCurrent].unit}. Try again!`,
      'error');
  }
}

function simShowHint() {
  const hintEl = document.getElementById('sim-hint-box');
  hintEl.textContent = challenges[simCurrent].hint;
  hintEl.style.display = 'block';
}

function updateSimBoard() {
  set('sim-score-val',  simScore);
  set('sim-done-val',   `${simDone.length}/4`);
  document.getElementById('sim-progress').style.width =
    `${(simDone.length / 4) * 100}%`;
}

// ── FEEDBACK ─────────────────────────────────────────────────
let fbRating = 0;

function initStars() {
  const stars = document.querySelectorAll('#fb-stars .fa-star');
  stars.forEach(star => {
    star.addEventListener('click', function() {
      fbRating = parseInt(this.dataset.v);
      stars.forEach((s, i) => s.classList.toggle('lit', i < fbRating));
      set('fb-rating-label', ['','Poor','Fair','Good','Very Good','Excellent'][fbRating]);
    });
    star.addEventListener('mouseover', function() {
      const v = parseInt(this.dataset.v);
      stars.forEach((s, i) => s.classList.toggle('lit', i < v));
    });
    star.addEventListener('mouseout', function() {
      stars.forEach((s, i) => s.classList.toggle('lit', i < fbRating));
    });
  });
}

function submitFeedback() {
  if (!fbRating) return msg('fb-msg', 'Please select a star rating.', 'error');

  const simRating = document.getElementById('fb-sim-rating').value;
  const comments  = document.getElementById('fb-comments').value.trim();

  const s = getStudent();
  save('hc_feedback_' + s.roll, {
    rating: fbRating, simRating, comments,
    date: new Date().toLocaleDateString()
  });

  document.getElementById('fb-form-area').style.display  = 'none';
  document.getElementById('fb-success').style.display = 'block';
}

// ── Modal helpers ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── DOM helpers ──────────────────────────────────────────────
function v(id)            { return document.getElementById(id)?.value.trim() || ''; }
function set(id, text)    { const el = document.getElementById(id); if (el) el.textContent = text; }

function msg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `alert alert-${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4500);
}

// ── Keyboard: Enter to submit ────────────────────────────────
function onKey(e, fn) { if (e.key === 'Enter') fn(); }

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initStars();

  // Wire nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => guardedShow(btn.dataset.page));
  });

  // Start on login or dashboard
  if (isLoggedIn()) {
    setHeaderName();
    refreshDashboard();
    showPage('page-dashboard');
  } else {
    showPage('page-login');
  }
});
