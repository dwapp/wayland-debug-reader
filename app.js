// ─── app.js ───────────────────────────────────────────────────────────────────
// Application state, rendering, event wiring, theme & i18n init.
// Depends on: render-helpers.js, log-export.js, wayland-debug-tools.js,
//             protocol-data.js, i18n.js

// ─── Global state ─────────────────────────────────────────────────────────────
let appState = null;                        // parsed wayland state
let highlightedUniqueIds = new Set();       // currently selected object uniqueIds
let currentSearchMatches = [];
let currentSearchIndex = 0;

// ─── Render log panel ─────────────────────────────────────────────────────────
function renderLog() {
  if (!appState) return;

  const query      = document.getElementById('search-input').value.toLowerCase();
  const searchMode = document.getElementById('search-mode').value;
  const showEv     = document.getElementById('show-events').checked;
  const showReq    = document.getElementById('show-requests').checked;
  const showCom    = document.getElementById('show-comments').checked;
  const hlOnly     = document.getElementById('highlight-only').checked;
  const showTimeDiff = document.getElementById('show-time-diff').checked;

  let firstTimestamp = null;
  if (showTimeDiff) {
    for (const line of appState.parsedLines) {
      if (line.timestamp !== undefined && !isNaN(line.timestamp)) {
        firstTimestamp = line.timestamp;
        break;
      }
    }
  }

  const frag = document.createDocumentFragment();
  let countEv = 0, countReq = 0, countCom = 0;
  currentSearchMatches = [];

  for (const line of appState.parsedLines) {
    const { type, parts, rawText } = line;

    // type filter
    if (type === 'event'   && !showEv)  continue;
    if (type === 'request' && !showReq) continue;
    if (type === 'comment' && !showCom) continue;

    // highlight-only filter
    if (hlOnly && highlightedUniqueIds.size > 0) {
      if (type === 'event' || type === 'request') {
        const obj    = parts.object;
        const inObj  = obj && highlightedUniqueIds.has(obj.uniqueId);
        const inArgs = parts.args && parts.args.some(a =>
          (a.type === 'object' && highlightedUniqueIds.has(a.uniqueId)) ||
          (a.type === 'new'    && a.object && highlightedUniqueIds.has(a.object.uniqueId))
        );
        if (!inObj && !inArgs) continue;
      }
    }

    // search filter
    let isSearchMatch = false;
    if (query) {
      if (rawText.toLowerCase().includes(query)) {
        isSearchMatch = true;
      } else if (searchMode === 'filter') {
        continue;
      }
    }

    // count
    if (type === 'event')        countEv++;
    else if (type === 'request') countReq++;
    else                         countCom++;

    const div = document.createElement('div');
    div.className = 'log-line ' + type;

    if (isSearchMatch && searchMode === 'search') {
      div.classList.add('search-match');
      currentSearchMatches.push(div);
    }

    // highlight line if any selected object is involved
    if (highlightedUniqueIds.size > 0 && (type === 'event' || type === 'request')) {
      const obj = parts.object;
      const touched = (obj && highlightedUniqueIds.has(obj.uniqueId)) ||
        (parts.args && parts.args.some(a =>
          (a.type === 'object' && highlightedUniqueIds.has(a.uniqueId)) ||
          (a.type === 'new'    && a.object && highlightedUniqueIds.has(a.object.uniqueId))
        ));
      if (touched) div.classList.add('highlighted-line');
    }

    if (type === 'comment') {
      div.innerHTML = escHtml(rawText);
    } else {
      let timeHtml = '';
      if (line.timestampStr) {
        let tsText = line.timestampStr;
        if (showTimeDiff && firstTimestamp !== null && line.timestamp !== undefined && !isNaN(line.timestamp)) {
          tsText = '+' + (line.timestamp - firstTimestamp).toFixed(3);
        }
        timeHtml = `<span class="timestamp">[${tsText}]</span> `;
      }
      const discardedHtml = line.discarded ? '<span class="discarded-tag">discarded</span> ' : '';
      const arrow = type === 'request' ? '<span class="arrow">→</span>' : '';
      // Look up protocol arg names for this interface.method
      const argNames = getArgNames(parts.object.interfaceName, parts.fn);
      const argsHtml = parts.args.map((a, i) => {
        const name = (argNames && i < argNames.length) ? argNames[i] : null;
        return renderArg(a, name);
      }).join('<span class="arg-sep">, </span>');
      div.innerHTML = `${timeHtml}${discardedHtml}${arrow}${makeObjTag(parts.object)}<span class="fn-name">.${escHtml(parts.fn)}</span><span class="paren">(</span>${argsHtml}<span class="paren">)</span>`;
    }

    frag.appendChild(div);
  }

  const panel = document.getElementById('log-panel');
  panel.innerHTML = '';
  if (frag.childElementCount === 0) {
    panel.innerHTML = `<div class="empty-msg">${t('noMatchLog')}</div>`;
  } else {
    panel.appendChild(frag);
  }

  // update stats
  document.getElementById('stat-events').textContent   = countEv;
  document.getElementById('stat-requests').textContent = countReq;
  document.getElementById('stat-comments').textContent = countCom;

  if (searchMode === 'search') {
    currentSearchIndex = 0;
    updateSearchNav();
  }

  const isSearchActive = searchMode === 'search' && query.length > 0;
  document.querySelectorAll('.search-nav').forEach(el => el.classList.toggle('hidden', !isSearchActive));

  // attach click handlers to obj-tags inside log
  panel.querySelectorAll('.obj-tag[data-uid]').forEach(tag => {
    tag.addEventListener('click', () => {
      const uid = parseInt(tag.dataset.uid);
      if (uid) selectObject(uid);
    });
  });
}

// ─── Render sidebar ───────────────────────────────────────────────────────────
function renderSidebar() {
  if (!appState) return;

  // Objects
  const objList = document.getElementById('objects-list');
  objList.innerHTML = '';
  for (const uid in appState.objects) {
    const obj   = appState.objects[uid];
    const color = colorForUniqueId(obj.uniqueId);
    const hl    = highlightedUniqueIds.has(obj.uniqueId) ? ' highlighted' : '';
    const chip  = document.createElement('span');
    chip.className   = `obj-chip${hl}`;
    chip.style.color = color;
    chip.dataset.uid = obj.uniqueId;
    chip.textContent = `${obj.interfaceName}@${obj.id}`;
    chip.title = chip.textContent;
    chip.addEventListener('click', () => selectObject(obj.uniqueId));
    objList.appendChild(chip);
  }

  // Globals
  const glList = document.getElementById('globals-list');
  glList.innerHTML = '';
  for (const k in appState.globals) {
    const g  = appState.globals[k];
    const el = document.createElement('div');
    el.className = 'global-item';
    el.innerHTML = `${g.number}: <span>${escHtml(g.interfaceName)}</span> v${g.version}`;
    glList.appendChild(el);
  }
}

// ─── Object selection ─────────────────────────────────────────────────────────
function selectObject(uid) {
  if (highlightedUniqueIds.has(uid)) {
    highlightedUniqueIds.delete(uid);
  } else {
    highlightedUniqueIds.add(uid);
  }
  renderSidebar();
  renderLog();
}

// ─── Load / reset ─────────────────────────────────────────────────────────────
function loadLog(text, label) {
  nextId = 1;  // reset parser's nextId counter (defined in wayland-debug-tools.js)
  appState = parseLog(text);

  document.getElementById('file-label').textContent = label;
  document.getElementById('drop-zone').classList.add('hidden');
  document.getElementById('filters-bar').classList.add('visible');
  highlightedUniqueIds.clear();

  renderSidebar();
  renderLog();
}

function resetApp() {
  appState = null;
  highlightedUniqueIds.clear();
  document.getElementById('drop-zone').classList.remove('hidden');
  document.getElementById('filters-bar').classList.remove('visible');
  document.getElementById('log-panel').innerHTML   = `<div class="empty-msg">${t('emptyLog')}</div>`;
  document.getElementById('objects-list').innerHTML = `<div class="empty-msg">${t('noObjects')}</div>`;
  document.getElementById('globals-list').innerHTML = '';
  document.getElementById('file-label').textContent = t('fileLabel');
  ['stat-events','stat-requests','stat-comments'].forEach(id =>
    document.getElementById(id).textContent = '0'
  );
}

// ─── File input ───────────────────────────────────────────────────────────────
document.getElementById('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => loadLog(ev.target.result, file.name);
  reader.readAsText(file);
});

// ─── Drag & drop ──────────────────────────────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
document.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragging'); });
document.addEventListener('dragleave', e => { if (!e.relatedTarget) dropZone.classList.remove('dragging'); });
document.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => loadLog(ev.target.result, file.name);
  reader.readAsText(file);
});

// ─── Paste area ───────────────────────────────────────────────────────────────
function loadFromPaste() {
  const text = document.getElementById('paste-area').value.trim();
  if (text) loadLog(text, t('pastedContent'));
}
document.getElementById('paste-area').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) loadFromPaste();
});

// ─── Filter controls ──────────────────────────────────────────────────────────
['show-events','show-requests','show-comments','show-time-diff','highlight-only'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderLog);
});

let searchTimer;
document.getElementById('search-input').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderLog, 180);
});

function updateSearchNav() {
  const countEl = document.getElementById('search-count');
  if (!currentSearchMatches.length) {
    countEl.textContent = '0/0';
    return;
  }
  countEl.textContent = `${currentSearchIndex + 1}/${currentSearchMatches.length}`;
  currentSearchMatches.forEach(el => el.classList.remove('search-active'));
  const activeEl = currentSearchMatches[currentSearchIndex];
  activeEl.classList.add('search-active');
  activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

document.getElementById('search-prev').addEventListener('click', () => {
  if (!currentSearchMatches.length) return;
  currentSearchIndex = (currentSearchIndex - 1 + currentSearchMatches.length) % currentSearchMatches.length;
  updateSearchNav();
});

document.getElementById('search-next').addEventListener('click', () => {
  if (!currentSearchMatches.length) return;
  currentSearchIndex = (currentSearchIndex + 1) % currentSearchMatches.length;
  updateSearchNav();
});

document.getElementById('search-mode').addEventListener('change', renderLog);

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('search-mode').value === 'search') {
    e.preventDefault();
    if (e.shiftKey) {
      document.getElementById('search-prev').click();
    } else {
      document.getElementById('search-next').click();
    }
  }
});

// ─── Sidebar resize ───────────────────────────────────────────────────────────
const handle  = document.getElementById('resize-handle');
const sidebar = document.getElementById('sidebar');
let resizing = false, startX = 0, startW = 0;
handle.addEventListener('mousedown', e => {
  resizing = true; startX = e.clientX; startW = sidebar.offsetWidth;
  handle.classList.add('dragging');
  document.body.style.userSelect = 'none';
});
document.addEventListener('mousemove', e => {
  if (!resizing) return;
  const w = Math.max(140, Math.min(800, startW + e.clientX - startX));
  sidebar.style.width = w + 'px';
});
document.addEventListener('mouseup', () => {
  resizing = false;
  handle.classList.remove('dragging');
  document.body.style.userSelect = '';
});

// ─── Theme toggle ─────────────────────────────────────────────────────────────
(function () {
  const saved      = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme      = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
})();

function updateThemeIcon(theme) {
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '🌙' : '☀️';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
});

// ─── Copy / Export button wiring ─────────────────────────────────────────────
document.getElementById('copy-log-btn').addEventListener('click', copyFilteredLog);
document.getElementById('export-log-btn').addEventListener('click', exportFilteredLog);

// ─── i18n init & lang toggle ─────────────────────────────────────────────────
// Protocol data is loaded synchronously via <script src="protocols/all-protocols.js">
applyI18n();

document.getElementById('lang-toggle').addEventListener('click', () => {
  setLanguage(currentLang === 'zh' ? 'en' : 'zh');
});
