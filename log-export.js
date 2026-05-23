// ─── log-export.js ────────────────────────────────────────────────────────────
// Filter iteration, plain-text formatting, copy/export actions.
// Depends on globals: appState, highlightedUniqueIds (app.js),
//                     getArgNames (protocol-data.js), t (i18n.js)

// ─── Shared filter iterator ───────────────────────────────────────────────────
// Calls callback(line) for every line that passes the current UI filters.
function iterFilteredLines(callback) {
  if (!appState) return;
  const query      = document.getElementById('search-input').value.toLowerCase();
  const searchMode = document.getElementById('search-mode').value;
  const showEv     = document.getElementById('show-events').checked;
  const showReq    = document.getElementById('show-requests').checked;
  const showCom    = document.getElementById('show-comments').checked;
  const hlOnly     = document.getElementById('highlight-only').checked;

  for (const line of appState.parsedLines) {
    const { type, parts, rawText } = line;
    if (type === 'event'   && !showEv)  continue;
    if (type === 'request' && !showReq) continue;
    if (type === 'comment' && !showCom) continue;
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
    if (query && !rawText.toLowerCase().includes(query) && searchMode === 'filter') continue;
    callback(line);
  }
}

// ─── Plain-text arg formatter (mirrors renderArg but no HTML) ─────────────────
function formatArgAsText(arg, argName) {
  const prefix = argName ? `${argName}: ` : '';
  switch (arg.type) {
    case 'object':
      return prefix + (arg.interfaceName ? `${arg.interfaceName}@${arg.id}` : '?');
    case 'new': {
      const inner = arg.object ? `${arg.object.interfaceName}@${arg.object.id}` : '?';
      return `${prefix}new ${inner}`;
    }
    case 'integer':
    case 'string':
    default:
      return prefix + arg.rawText;
  }
}

// ─── Plain-text line formatter (mirrors the HTML built in renderLog) ───────────
function formatLineAsText(line, showTimeDiff, firstTimestamp) {
  const { type, parts, rawText } = line;
  if (type === 'comment') return rawText;

  // timestamp
  let tsStr = '';
  if (line.timestampStr) {
    let ts = line.timestampStr;
    if (showTimeDiff && firstTimestamp !== null &&
        line.timestamp !== undefined && !isNaN(line.timestamp)) {
      ts = '+' + (line.timestamp - firstTimestamp).toFixed(3);
    }
    tsStr = `[${ts}] `;
  }

  // discarded marker
  const discarded = line.discarded ? 'discarded ' : '';

  // arrow for requests
  const arrow = type === 'request' ? '→ ' : '';

  // object label
  const obj = parts.object;
  const objLabel = obj ? `${obj.interfaceName}@${obj.id}` : '?';

  // arguments with protocol names
  const argNames = getArgNames(obj ? obj.interfaceName : '', parts.fn);
  const argsText = parts.args.map((a, i) => {
    const name = (argNames && i < argNames.length) ? argNames[i] : null;
    return formatArgAsText(a, name);
  }).join(', ');

  return `${tsStr}${discarded}${arrow}${objLabel}.${parts.fn}(${argsText})`;
}

// ─── Build formatted line collection (respects all current UI options) ─────────
function getFilteredFormattedLines() {
  const showTimeDiff = document.getElementById('show-time-diff').checked;
  let firstTimestamp = null;
  if (showTimeDiff) {
    for (const line of appState.parsedLines) {
      if (line.timestamp !== undefined && !isNaN(line.timestamp)) {
        firstTimestamp = line.timestamp; break;
      }
    }
  }
  const result = [];
  iterFilteredLines(line => {
    result.push(formatLineAsText(line, showTimeDiff, firstTimestamp));
  });
  return result;
}

// ─── Toast notification ───────────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('log-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'log-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
      'background:var(--bg3)', 'color:var(--text)', 'border:1px solid var(--border)',
      'border-radius:8px', 'padding:8px 18px', 'font-size:13px',
      'box-shadow:0 4px 18px rgba(0,0,0,.4)', 'transition:opacity .3s',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ─── Copy / Export actions ────────────────────────────────────────────────────
function copyFilteredLog() {
  const text = getFilteredFormattedLines().join('\n');
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => showToast(t('copySuccess')))
    .catch(() => showToast(t('copyFail')));
}

function exportFilteredLog() {
  const text = getFilteredFormattedLines().join('\n');
  if (!text) return;
  const label = document.getElementById('file-label').textContent || 'filtered';
  const filename = label.replace(/[^\w.-]/g, '_') + '_filtered.log';
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
