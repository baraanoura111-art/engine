/* Oasis Outreach app — connects the screens to the Apps Script engine and handles login.
 * The screens call google.script.run.<action>(...) exactly like the sheet sidebar;
 * here those calls go to the engine's web address (config.js) with your login token. */
(function () {
  var TOKEN = 'oasisToken', USER = 'oasisUser', mem = {};
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k) || mem[k] || ''; if (v === null) { localStorage.removeItem(k); delete mem[k]; } else { localStorage.setItem(k, v); mem[k] = v; } } catch (e) { if (v === undefined) return mem[k] || ''; if (v === null) delete mem[k]; else mem[k] = v; } }

  // Read-only actions are retried if the phone drops the connection (e.g. the app was switched away).
  var READS = { getAll: 1, botTicket: 1, getValuationData: 1 }, listFailed = false;
  function netErr(e) { return e && !e.auth && /load failed|failed to fetch|networkerror|network connection|did not respond/i.test(String(e.message || e)); }
  function call(action, args, tries) {
    tries = tries || 0;
    return call1(action, args).catch(function (e) {
      if (READS[action] && netErr(e) && tries < 2) {
        return new Promise(function (r) { setTimeout(r, 1500 * (tries + 1)); }).then(function () { return call(action, args, tries + 1); });
      }
      if (netErr(e)) e = new Error('Connection dropped. Keep the app open while it loads, then tap Refresh.');
      throw e;
    });
  }
  function call1(action, args) {
    if (!window.API_URL || /PASTE/.test(window.API_URL)) return Promise.reject(new Error('The engine address is not set yet (config.js).'));
    return fetch(window.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },     // simple request: no CORS preflight
      body: JSON.stringify({ action: action, args: args || [], token: store(TOKEN) }),
    }).then(function (r) {
      if (!r.ok) throw new Error('The engine did not respond (' + r.status + ').');
      return r.json();
    }).then(function (j) {
      if (!j.ok) { var e = new Error(j.error || 'Something went wrong'); e.auth = !!j.auth; throw e; }
      return j.result;
    });
  }

  // google.script.run look-alike: .withSuccessHandler(f).withFailureHandler(g).anyAction(args…)
  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (f) { return runner(f, fail); };
        if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
        return function () {
          var args = [].slice.call(arguments);
          call(name, args).then(function (r) { if (name === 'getAll') listFailed = false; if (ok) ok(r); }).catch(function (e) {
            if (name === 'getAll') listFailed = true;
            if (e.auth) showLogin(e.message);
            if (fail) fail(e);
          });
        };
      },
    });
  }
  window.google = { script: { run: runner(null, null) } };

  /* ---------- Login ---------- */
  var USERS = ['Engine'], chosen = 'Engine';
  function $(id) { return document.getElementById(id); }
  function showLogin(msg) {
    var box = $('login'); if (!box) return;
    store(TOKEN, null);
    box.style.display = 'flex';
    $('loginUsers').innerHTML = USERS.map(function (u) {
      return '<button type="button" class="chip2' + (u === chosen ? ' on' : '') + '" onclick="appPickUser(\'' + u + '\')">' + u + '</button>';
    }).join('');
    $('loginMsg').textContent = msg && !/log in\.?$/i.test(msg) ? msg : '';
    setTimeout(function () { try { $('loginPin').focus(); } catch (e) {} }, 50);
  }
  window.appPickUser = function (u) { chosen = u; showLogin($('loginMsg').textContent); };
  window.appLogin = function (ev) {
    if (ev) ev.preventDefault();
    var pin = $('loginPin').value.trim(), btn = $('loginBtn');
    if (!pin) { $('loginMsg').textContent = 'Enter your PIN.'; return false; }
    btn.disabled = true; btn.textContent = 'Checking…'; $('loginMsg').textContent = '';
    fetchLogin(chosen, pin).then(function (r) {
      store(TOKEN, r.token); store(USER, r.user);
      $('loginPin').value = ''; $('login').style.display = 'none';
      setWho(); if (window.loadAll) window.loadAll(false);
    }).catch(function (e) {
      $('loginMsg').textContent = e.message || 'Could not log in.';
    }).then(function () { btn.disabled = false; btn.textContent = 'Log In'; });
    return false;
  };
  function fetchLogin(user, pin) {
    if (!window.API_URL || /PASTE/.test(window.API_URL)) return Promise.reject(new Error('The engine address is not set yet (config.js).'));
    return fetch(window.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', user: user, pin: pin }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Could not log in.'); return j.result; });
  }
  window.appLogout = function () { store(TOKEN, null); location.reload(); };
  function setWho() {
    var el = $('who'); if (el) el.innerHTML = 'Signed in as <b>' + (store(USER) || '') + '</b> · <a onclick="appLogout()">Log out</a>';
  }

  /* ---------- Start ---------- */
  window.appStart = function () {
    if (store(TOKEN)) { setWho(); window.loadAll(false); }
    else showLogin('');
  };

  // Coming back to the app after a dropped load: load the list again by itself.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && listFailed && store(TOKEN) && window.loadAll) { listFailed = false; window.loadAll(false); }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
