/**
 * Banks Fresh Farms — Admin Pickup Tracker
 * Requires bff-config.js loaded first.
 */
(function () {
  'use strict';

  /* ─── Config check ─────────────────────────────────────────── */
  if (
    typeof BFF_SUPABASE_URL === 'undefined' ||
    BFF_SUPABASE_URL.indexOf('supabase.co') === -1
  ) {
    document.body.innerHTML =
      '<div style="font-family:sans-serif;padding:40px;text-align:center">' +
      '<h2>Supabase not configured</h2>' +
      '<p>Add your Project URL and anon key to js/bff-config.js first.</p>' +
      '</div>';
    return;
  }

  /* ─── State ────────────────────────────────────────────────── */
  var accessToken  = null;
  var refreshToken = null;
  var tokenTimer   = null;

  /* ─── Auth helpers ─────────────────────────────────────────── */
  function authHeaders() {
    return {
      'apikey':        BFF_SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type':  'application/json'
    };
  }

  function saveSession(data) {
    accessToken  = data.access_token;
    refreshToken = data.refresh_token;
    localStorage.setItem('bff_access',  accessToken);
    localStorage.setItem('bff_refresh', refreshToken);
    scheduleRefresh(data.expires_in || 3600);
  }

  function clearSession() {
    accessToken  = null;
    refreshToken = null;
    localStorage.removeItem('bff_access');
    localStorage.removeItem('bff_refresh');
    if (tokenTimer) clearTimeout(tokenTimer);
  }

  /* Silently refresh the access token 2 min before it expires */
  function scheduleRefresh(expiresIn) {
    if (tokenTimer) clearTimeout(tokenTimer);
    var delay = Math.max((expiresIn - 120) * 1000, 60000);
    tokenTimer = setTimeout(doRefresh, delay);
  }

  function doRefresh() {
    if (!refreshToken) return;
    fetch(BFF_SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method:  'POST',
      headers: { 'apikey': BFF_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh_token: refreshToken })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.access_token) saveSession(d); })
      .catch(function () { /* silently ignore — will re-login if 401 */ });
  }

  function login(email, password) {
    return fetch(BFF_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method:  'POST',
      headers: { 'apikey': BFF_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email, password: password })
    }).then(function (r) { return r.json(); });
  }

  function logout() {
    clearSession();
    showLogin();
  }

  /* ─── API calls ────────────────────────────────────────────── */
  function fetchSubscribers() {
    return fetch(
      BFF_SUPABASE_URL + '/rest/v1/subscriber_monthly_status?select=*',
      { headers: authHeaders() }
    ).then(function (r) {
      if (r.status === 401) { logout(); throw new Error('session expired'); }
      return r.json();
    });
  }

  function postPickup(subscriptionId) {
    return fetch(BFF_SUPABASE_URL + '/rest/v1/pickups', {
      method:  'POST',
      headers: Object.assign({}, authHeaders(), { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        subscription_id: subscriptionId,
        pickup_date:     new Date().toISOString().split('T')[0],
        dozens_taken:    1
      })
    });
  }

  /* ─── Screens ──────────────────────────────────────────────── */
  function showLogin() {
    document.getElementById('loginScreen').style.display = '';
    document.getElementById('dashboard').style.display   = 'none';
  }

  function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display   = '';
    loadAndRender();
  }

  /* ─── Render ───────────────────────────────────────────────── */
  function loadAndRender() {
    var list = document.getElementById('admList');
    list.innerHTML = '<div class="adm-loading">Loading…</div>';

    fetchSubscribers()
      .then(renderDashboard)
      .catch(function (err) {
        if (err.message !== 'session expired') {
          list.innerHTML = '<div class="adm-loading">Could not load data. Tap ↻ to retry.</div>';
        }
      });
  }

  function renderDashboard(subs) {
    subs = subs || [];

    /* Summary bar */
    var totalRemaining = subs.reduce(function (n, s) { return n + s.remaining; }, 0);
    var month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    var summary = document.getElementById('admSummary');
    summary.innerHTML =
      '<strong>' + subs.length + '</strong> active subscriber' + (subs.length !== 1 ? 's' : '') +
      ' &nbsp;·&nbsp; <strong>' + totalRemaining + '</strong> dozen still to collect &nbsp;·&nbsp; ' + month;

    /* Sort: pending first, then partial, then done */
    subs.sort(function (a, b) {
      var rank = function (s) {
        return s.remaining === s.entitled ? 0 : s.remaining > 0 ? 1 : 2;
      };
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

    var list = document.getElementById('admList');
    list.innerHTML = '';

    if (!subs.length) {
      list.innerHTML = '<div class="adm-empty">No active subscribers yet.<br>Mark orders as <em>active</em> in Supabase Studio to see them here.</div>';
      return;
    }

    subs.forEach(function (sub) {
      var isDone    = sub.remaining === 0;
      var isPartial = sub.remaining > 0 && sub.picked_up > 0;
      var isPending = sub.remaining === sub.entitled;

      var card = document.createElement('div');
      card.className = 'sub-card' + (isDone ? ' sub-card--done' : '');

      var iconClass = isDone ? 'icon--done' : isPartial ? 'icon--partial' : 'icon--pending';
      var icon      = isDone ? '✓' : isPartial ? '◑' : '○';

      var planLabel = { monthly: 'Monthly', '6-month': '6-Month', '12-month': '12-Month' }[sub.plan] || sub.plan;

      card.innerHTML =
        '<div class="sub-top">' +
          '<div class="sub-left">' +
            '<span class="sub-icon ' + iconClass + '">' + icon + '</span>' +
            '<div class="sub-info">' +
              '<div class="sub-name">' + escHtml(sub.name) + '</div>' +
              '<div class="sub-meta">' +
                (sub.phone ? '<a href="tel:' + escHtml(sub.phone) + '" class="sub-phone">' + escHtml(sub.phone) + '</a>' : '') +
                (sub.phone ? ' &nbsp;·&nbsp; ' : '') +
                '<span class="sub-plan">' + planLabel + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="sub-count' + (isDone ? ' sub-count--done' : '') + '">' +
            '<span class="count-picked">' + sub.picked_up + '</span>' +
            '<span class="count-sep">/</span>' +
            '<span class="count-total">' + sub.entitled + '</span>' +
            '<span class="count-unit">doz</span>' +
          '</div>' +
        '</div>' +
        (isDone
          ? '<div class="sub-done-msg">All dozens collected this month ✓</div>'
          : '<button class="pickup-btn" data-id="' + sub.id + '" data-name="' + escHtml(sub.name.split(' ')[0]) + '">' +
              '+ Record Pickup &nbsp;<span class="pickup-remaining">(' + sub.remaining + ' left)</span>' +
            '</button>');

      list.appendChild(card);
    });

    /* Bind pickup buttons */
    list.querySelectorAll('.pickup-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id   = btn.getAttribute('data-id');
        var name = btn.getAttribute('data-name');
        btn.disabled    = true;
        btn.textContent = 'Recording…';

        postPickup(id)
          .then(function (res) {
            if (res.status === 201) {
              toast(name + ' — pickup recorded ✓');
              loadAndRender();
            } else {
              btn.disabled    = false;
              btn.textContent = '+ Record Pickup';
              toast('Error recording pickup. Try again.');
            }
          })
          .catch(function () {
            btn.disabled    = false;
            btn.textContent = '+ Record Pickup';
            toast('Connection error. Check signal.');
          });
      });
    });
  }

  /* ─── Toast ────────────────────────────────────────────────── */
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('admToast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3000);
  }

  /* ─── Util ─────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ─── Event listeners ──────────────────────────────────────── */
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email    = document.getElementById('adminEmail').value.trim();
    var password = document.getElementById('adminPassword').value;
    var errEl    = document.getElementById('loginError');
    var btn      = document.getElementById('loginBtn');

    errEl.textContent  = '';
    btn.disabled       = true;
    btn.textContent    = 'Signing in…';

    login(email, password).then(function (data) {
      if (data.access_token) {
        saveSession(data);
        showDashboard();
      } else {
        errEl.textContent = data.error_description || 'Incorrect email or password.';
        btn.disabled      = false;
        btn.textContent   = 'Sign In';
      }
    }).catch(function () {
      errEl.textContent = 'Connection error. Check your signal and try again.';
      btn.disabled      = false;
      btn.textContent   = 'Sign In';
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('refreshBtn').addEventListener('click', loadAndRender);

  /* ─── Init ─────────────────────────────────────────────────── */
  accessToken  = localStorage.getItem('bff_access');
  refreshToken = localStorage.getItem('bff_refresh');

  if (accessToken) {
    doRefresh(); /* validate / silently refresh on load */
    showDashboard();
  } else {
    showLogin();
  }

})();
