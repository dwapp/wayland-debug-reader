// ─── i18n module ─────────────────────────────────────────────────────────────
// Usage:
//   t('key')                 → translated string for current language
//   applyI18n()              → update all [data-i18n] elements in DOM
//   setLanguage('zh'|'en')   → override and persist language

const MESSAGES = {
  zh: {
    fileLabel:        '未加载',
    resetBtn:         '🔄 重新加载',
    themeTitle:       '切换主题',
    langTitle:        '切换语言',
    searchPlaceholder:'搜索接口名、方法名、参数…',
    searchOption:     '搜索',
    filterOption:     '过滤',
    prevTitle:        '上一个 (Shift+Enter)',
    nextTitle:        '下一个 (Enter)',
    showEvents:       '事件',
    showRequests:     '请求',
    showComments:     '注释',
    timeDiff:         '相对时间',
    highlightOnly:    '仅高亮对象',
    dropSub:          '拖拽日志文件到此处，或选择文件 / 粘贴文本',
    chooseFile:       '📂 选择文件',
    pasteArea:        '或者直接粘贴日志内容到这里…',
    loadLog:          '▶ 加载日志',
    noObjects:        '暂无数据',
    emptyLog:         '请先加载日志文件',
    noMatchLog:       '没有匹配的日志行',
    pastedContent:    '(粘贴内容)',
    statEvents:       '事件',
    statRequests:     '请求',
    statComments:     '注释',
  },
  en: {
    fileLabel:        'No file loaded',
    resetBtn:         '🔄 Reload',
    themeTitle:       'Toggle theme',
    langTitle:        'Toggle language',
    searchPlaceholder:'Search interface, method, argument…',
    searchOption:     'Search',
    filterOption:     'Filter',
    prevTitle:        'Previous (Shift+Enter)',
    nextTitle:        'Next (Enter)',
    showEvents:       'events',
    showRequests:     'requests',
    showComments:     'comments',
    timeDiff:         'Relative time',
    highlightOnly:    'Highlight only',
    dropSub:          'Drop a log file here, or choose a file / paste text',
    chooseFile:       '📂 Choose file',
    pasteArea:        'Or paste log content here…',
    loadLog:          '▶ Load log',
    noObjects:        'No data',
    emptyLog:         'Load a log file to start',
    noMatchLog:       'No matching log lines',
    pastedContent:    '(pasted)',
    statEvents:       'events',
    statRequests:     'requests',
    statComments:     'comments',
  }
};

// ─── Detect & persist language ────────────────────────────────────────────────
function detectLanguage() {
  const saved = localStorage.getItem('lang');
  if (saved === 'zh' || saved === 'en') return saved;
  // navigator.languages is ordered by preference
  const langs = navigator.languages || [navigator.language || 'en'];
  for (const l of langs) {
    if (l.startsWith('zh')) return 'zh';
  }
  return 'en';
}

let currentLang = detectLanguage();

function t(key) {
  return (MESSAGES[currentLang] || MESSAGES.en)[key] || key;
}

// ─── Apply translations to DOM ────────────────────────────────────────────────
// Elements can be annotated with:
//   data-i18n="key"             → sets textContent
//   data-i18n-placeholder="key" → sets placeholder attribute
//   data-i18n-title="key"       → sets title attribute
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // Update language toggle button label
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = currentLang === 'zh' ? 'EN' : '中';
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyI18n();
}
