/* =========================================================================
   Spotify Playlist Creator — Application Logic
   PKCE OAuth · Spotify Web API · Song Parser · UI Controller
   ========================================================================= */

(function () {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────
  const DEFAULT_CLIENT_ID = '1a891534bc86445c8fcd2af762247701';
  const SCOPES = 'playlist-modify-public playlist-modify-private user-read-private';
  const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
  const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
  const SPOTIFY_API = 'https://api.spotify.com/v1';

  // Redirect URI — for local dev reuse the callback already registered in the
  // Spotify Dashboard; for production (GitHub Pages, etc.) use the page URL.
  function getRedirectUri() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://127.0.0.1:${window.location.port}/callback`;
    }
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  // ── State ────────────────────────────────────────────────────────────
  let accessToken = null;
  let userId = null;
  let abortController = null;

  // ── DOM References ───────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── PKCE Helpers ─────────────────────────────────────────────────────
  function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, (v) => possible[v % possible.length]).join('');
  }

  async function sha256(plain) {
    const encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(plain));
  }

  function base64urlEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async function generateCodeChallenge(verifier) {
    const hashed = await sha256(verifier);
    return base64urlEncode(hashed);
  }

  // ── Client ID Management ─────────────────────────────────────────────
  function getClientId() {
    const custom = localStorage.getItem('spotify_client_id');
    return custom || DEFAULT_CLIENT_ID;
  }

  function setCustomClientId(id) {
    if (id && id.trim() && id.trim() !== DEFAULT_CLIENT_ID) {
      localStorage.setItem('spotify_client_id', id.trim());
    } else {
      localStorage.removeItem('spotify_client_id');
    }
  }

  // ── OAuth Flow ───────────────────────────────────────────────────────
  async function startLogin() {
    // Spotify rejects file:// redirect URIs — the app must be served over HTTP.
    if (window.location.protocol === 'file:') {
      alert(
        'Esta app no puede abrirse directamente como archivo (file://).\n\n' +
        'Ejecuta "iniciar.bat" (o "python -m http.server 8888" en esta carpeta) ' +
        'y abre http://127.0.0.1:8888/ en el navegador.'
      );
      return;
    }

    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: getClientId(),
      scope: SCOPES,
      redirect_uri: getRedirectUri(),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
  }

  async function exchangeCodeForToken(code) {
    const codeVerifier = sessionStorage.getItem('code_verifier');
    if (!codeVerifier) throw new Error('Missing code verifier — try logging in again.');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: getClientId(),
      code_verifier: codeVerifier,
    });

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description || `Token exchange failed (${res.status})`);
    }

    const data = await res.json();
    accessToken = data.access_token;
    const expiresAt = Date.now() + data.expires_in * 1000;

    sessionStorage.setItem('access_token', accessToken);
    sessionStorage.setItem('token_expires_at', expiresAt.toString());
    if (data.refresh_token) {
      sessionStorage.setItem('refresh_token', data.refresh_token);
    }
    sessionStorage.removeItem('code_verifier');
  }

  async function refreshAccessToken() {
    const refreshToken = sessionStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available.');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: getClientId(),
    });

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) throw new Error('Token refresh failed. Please log in again.');

    const data = await res.json();
    accessToken = data.access_token;
    const expiresAt = Date.now() + data.expires_in * 1000;

    sessionStorage.setItem('access_token', accessToken);
    sessionStorage.setItem('token_expires_at', expiresAt.toString());
    if (data.refresh_token) {
      sessionStorage.setItem('refresh_token', data.refresh_token);
    }
  }

  function isTokenValid() {
    const expiresAt = parseInt(sessionStorage.getItem('token_expires_at') || '0', 10);
    // Consider token invalid 60 seconds before actual expiry
    return accessToken && Date.now() < expiresAt - 60000;
  }

  async function ensureValidToken() {
    if (isTokenValid()) return;
    try {
      await refreshAccessToken();
    } catch {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
  }

  function logout() {
    accessToken = null;
    userId = null;
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('token_expires_at');
    sessionStorage.removeItem('code_verifier');
    showView('login');
  }

  // ── Spotify API ──────────────────────────────────────────────────────
  async function apiGet(endpoint, params = {}) {
    await ensureValidToken();
    const url = new URL(`${SPOTIFY_API}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      await refreshAccessToken();
      const retry = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!retry.ok) throw new Error(`API error: ${retry.status}`);
      return retry.json();
    }

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async function apiPost(endpoint, body) {
    await ensureValidToken();

    async function doPost() {
      const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return res;
    }

    let res = await doPost();

    if (res.status === 401) {
      await refreshAccessToken();
      res = await doPost();
    }

    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json();
        detail = errBody.error?.message || JSON.stringify(errBody);
      } catch { /* ignore parse errors */ }
      throw new Error(`API error ${res.status}: ${detail}`);
    }

    // Some endpoints (e.g. add tracks) may return empty body on success
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  async function fetchUserProfile() {
    const me = await apiGet('/me');
    userId = me.id;
    return me;
  }

  // ── Song Parser ──────────────────────────────────────────────────────
  function parseSongLines(text) {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('='));
  }

  function buildQuery(line) {
    if (line.includes(' - ')) {
      const [artist, title] = line.split(' - ', 2);
      return `track:"${title.trim()}" artist:"${artist.trim()}"`;
    }
    return line;
  }

  async function searchTrack(line) {
    // Try structured query first, then fall back to free-text
    const queries = [buildQuery(line)];
    if (line.includes(' - ')) queries.push(line);

    for (const q of queries) {
      try {
        const data = await apiGet('/search', { q, type: 'track', limit: '1' });
        const items = data?.tracks?.items;
        if (items && items.length > 0) return items[0];
      } catch (e) {
        console.warn(`Search error for "${line}":`, e);
      }
      // Small delay for rate limiting politeness
      await sleep(100);
    }
    return null;
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── UI Controller ────────────────────────────────────────────────────
  function showView(view) {
    // Views: login, main, progress, result
    $$('[data-view]').forEach((el) => {
      el.classList.toggle('hidden', el.dataset.view !== view);
    });
  }

  function showUserBar(profile) {
    const bar = $('#user-bar');
    const img = bar.querySelector('img');
    const name = bar.querySelector('.user-name');

    if (profile.images && profile.images.length > 0) {
      img.src = profile.images[0].url;
      img.alt = profile.display_name;
    } else {
      img.src = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23333" width="40" height="40" rx="20"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18">' +
        (profile.display_name?.[0] || '?') + '</text></svg>'
      );
    }
    name.textContent = profile.display_name || profile.id;
    bar.classList.remove('hidden');
  }

  function hideUserBar() {
    $('#user-bar').classList.add('hidden');
  }

  function addLogEntry(idx, status, text) {
    const container = $('#log-container');
    const entry = document.createElement('div');
    entry.className = `log-entry ${status}`;

    const icons = { ok: '✓', 'not-found': '✗', duplicate: '⊘' };
    entry.innerHTML = `
      <span class="log-idx">${idx}.</span>
      <span class="log-status">${icons[status] || '·'}</span>
      <span class="log-text">${escapeHtml(text)}</span>
    `;

    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateProgress(current, total, found, notFound, duplicates) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    $('#progress-bar').style.width = `${pct}%`;
    $('#stat-found').textContent = found;
    $('#stat-not-found').textContent = notFound;
    $('#stat-duplicates').textContent = duplicates;
    $('#stat-total').textContent = `${current}/${total}`;
  }

  function showResult(playlistUrl, trackCount, notFoundList) {
    $('#result-link').href = playlistUrl;
    $('#result-count').textContent = `${trackCount} songs added to your playlist.`;

    const notFoundSection = $('#not-found-section');
    if (notFoundList.length > 0) {
      const list = $('#not-found-list');
      list.innerHTML = '';
      notFoundList.forEach((song) => {
        const li = document.createElement('li');
        li.textContent = song;
        list.appendChild(li);
      });
      notFoundSection.classList.remove('hidden');
    } else {
      notFoundSection.classList.add('hidden');
    }

    showView('result');
  }

  // ── Main Playlist Creation Flow ──────────────────────────────────────
  async function createPlaylist() {
    const text = $('#song-input').value;
    const playlistName = $('#playlist-name').value.trim() || 'Playlist importada';

    const lines = parseSongLines(text);
    if (lines.length === 0) {
      alert('Please paste at least one song in the text area.');
      return;
    }

    // Switch to progress view
    $('#log-container').innerHTML = '';
    updateProgress(0, lines.length, 0, 0, 0);
    showView('progress');

    const uris = [];
    const notFoundList = [];
    const seen = new Set();
    let found = 0;
    let notFound = 0;
    let duplicates = 0;

    abortController = new AbortController();

    for (let i = 0; i < lines.length; i++) {
      if (abortController.signal.aborted) {
        addLogEntry(i + 1, 'not-found', '⏹ Cancelled');
        break;
      }

      const line = lines[i];
      let track;
      try {
        track = await searchTrack(line);
      } catch (e) {
        addLogEntry(i + 1, 'not-found', `ERROR: ${line} — ${e.message}`);
        notFound++;
        notFoundList.push(line);
        updateProgress(i + 1, lines.length, found, notFound, duplicates);
        continue;
      }

      if (!track) {
        notFound++;
        notFoundList.push(line);
        addLogEntry(i + 1, 'not-found', `NOT FOUND — ${line}`);
      } else if (seen.has(track.uri)) {
        duplicates++;
        const artists = track.artists.map((a) => a.name).join(', ');
        addLogEntry(i + 1, 'duplicate', `DUPLICATE — ${artists} – ${track.name}`);
      } else {
        seen.add(track.uri);
        uris.push(track.uri);
        found++;
        const artists = track.artists.map((a) => a.name).join(', ');
        addLogEntry(i + 1, 'ok', `${artists} – ${track.name}`);
      }

      updateProgress(i + 1, lines.length, found, notFound, duplicates);
      await sleep(120); // Rate limit courtesy
    }

    if (uris.length === 0) {
      alert('No songs were found. Please check your input and try again.');
      showView('main');
      return;
    }

    // Create playlist
    addLogEntry('→', 'ok', `Creating playlist "${playlistName}"…`);
    let playlist;
    try {
      playlist = await apiPost('/me/playlists', {
        name: playlistName,
        public: false,
        description: 'Created with Spotify Playlist Creator',
      });
    } catch (e) {
      alert(`Failed to create playlist: ${e.message}`);
      showView('main');
      return;
    }

    // Add tracks in batches of 100
    let addedCount = 0;
    for (let j = 0; j < uris.length; j += 100) {
      const batch = uris.slice(j, j + 100);
      try {
        addLogEntry('→', 'ok', `Adding tracks ${j + 1}–${Math.min(j + batch.length, uris.length)}…`);
        await apiPost(`/playlists/${playlist.id}/items`, { uris: batch });
        addedCount += batch.length;
      } catch (e) {
        addLogEntry('✗', 'not-found', `ERROR adding tracks: ${e.message}`);
        console.error('Error adding tracks batch:', e, 'URIs:', batch);
      }
    }

    if (addedCount === 0) {
      addLogEntry('✗', 'not-found', 'No tracks could be added. Check the browser console for details.');
      alert(`Playlist created but failed to add tracks. Error details are in the browser console (F12).`);
    }

    showResult(playlist.external_urls.spotify, addedCount, notFoundList);
  }

  // ── Settings Panel ───────────────────────────────────────────────────
  function initSettings() {
    const toggle = $('#settings-toggle');
    const panel = $('#settings-panel');
    const input = $('#client-id-input');
    const saveBtn = $('#save-client-id');

    // Load saved client ID
    const saved = localStorage.getItem('spotify_client_id');
    if (saved) input.value = saved;

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      panel.classList.toggle('open');
    });

    saveBtn.addEventListener('click', () => {
      setCustomClientId(input.value);
      const label = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => { saveBtn.textContent = label; }, 1500);
    });
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────
  function initDragDrop() {
    const dropZone = $('#drop-zone');
    const fileInput = $('#file-input');
    const songInput = $('#song-input');

    ['dragenter', 'dragover'].forEach((evt) => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      dropZone.addEventListener(evt, () => {
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    });

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) readFile(fileInput.files[0]);
    });

    function readFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        songInput.value = e.target.result;
        // Auto-fill playlist name from filename (minus extension)
        const nameInput = $('#playlist-name');
        if (!nameInput.value.trim()) {
          nameInput.value = file.name.replace(/\.[^.]+$/, '');
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  }

  // ── Initialization ───────────────────────────────────────────────────
  async function init() {
    // Spotify only allows loopback IPs (not "localhost") as redirect URIs, and
    // sessionStorage is per-origin, so always run on 127.0.0.1 locally.
    if (window.location.hostname === 'localhost') {
      const url = new URL(window.location.href);
      url.hostname = '127.0.0.1';
      window.location.replace(url.toString());
      return;
    }

    // Check if returning from Spotify auth redirect
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    // Clean URL (remove code/state params)
    if (code || error) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = '';
      window.history.replaceState({}, document.title, cleanUrl.toString());
    }

    if (error) {
      console.error('Spotify auth error:', error);
      alert(`Spotify authorization failed: ${error}`);
      showView('login');
      return;
    }

    if (code) {
      try {
        await exchangeCodeForToken(code);
      } catch (e) {
        console.error('Token exchange failed:', e);
        alert(`Login failed: ${e.message}`);
        showView('login');
        return;
      }
    }

    // Try to restore existing session
    const storedToken = sessionStorage.getItem('access_token');
    if (storedToken) {
      accessToken = storedToken;
    }

    if (accessToken) {
      try {
        const profile = await fetchUserProfile();
        showUserBar(profile);
        showView('main');
      } catch (e) {
        console.warn('Session invalid, clearing:', e);
        logout();
      }
    } else {
      showView('login');
    }

    // Bind events
    $('#btn-login').addEventListener('click', startLogin);
    $('#btn-logout').addEventListener('click', logout);
    $('#btn-create').addEventListener('click', createPlaylist);
    $('#btn-cancel').addEventListener('click', () => {
      if (abortController) abortController.abort();
      showView('main');
    });
    $('#btn-new').addEventListener('click', () => {
      showView('main');
    });

    initSettings();
    initDragDrop();
  }

  // ── Boot ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
