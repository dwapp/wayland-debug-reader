// ─── render-helpers.js ────────────────────────────────────────────────────────
// Pure rendering utilities: color hashing, HTML escaping, object/arg builders.
// Depends on global: highlightedUniqueIds (defined in app.js)

// ─── Color hash ───────────────────────────────────────────────────────────────
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return h >>> 0;
}

function colorForUniqueId(uid) {
  const hue = (hashStr(String(uid)) % 360 + 360) % 360;
  return `hsl(${hue}, var(--obj-sat, 70%), var(--obj-lit, 62%))`;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Object tag HTML builder ──────────────────────────────────────────────────
function makeObjTag(obj) {
  if (!obj) return '<span class="arg-unk">?</span>';
  const uid   = obj.uniqueId || 0;
  const color = uid ? colorForUniqueId(uid) : '#888';
  const hl    = uid && highlightedUniqueIds.has(uid) ? ' highlighted-tag' : '';
  const label = `${obj.interfaceName}@${obj.id}`;
  return `<span class="obj-tag${hl}" style="color:${color}" data-uid="${uid}" title="${label}">${label}</span>`;
}

// ─── Argument HTML builder ────────────────────────────────────────────────────
function renderArg(arg, argName) {
  const namePrefix = argName ? `<span class="arg-name">${escHtml(argName)}:</span> ` : '';
  switch (arg.type) {
    case 'object':  return `${namePrefix}${makeObjTag(arg)}`;
    case 'new':     return `${namePrefix}<span class="arg-new">new</span> ${makeObjTag(arg.object)}`;
    case 'integer': return `${namePrefix}<span class="arg-int">${arg.rawText}</span>`;
    case 'string':  return `${namePrefix}<span class="arg-str">${escHtml(arg.rawText)}</span>`;
    default:        return `${namePrefix}<span class="arg-unk">${escHtml(arg.rawText)}</span>`;
  }
}
