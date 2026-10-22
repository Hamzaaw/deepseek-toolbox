// Localize only explicit extension UI strings. Never translate saved/chat content.
const ToolboxI18n = (() => {
  'use strict';
  const api = typeof chrome !== 'undefined' ? chrome.i18n : null;
  const locale = api?.getMessage('toolboxLocale') || 'en';
  const direction = api?.getMessage('toolboxDirection') === 'rtl' ? 'rtl' : 'ltr';
  function key(source) {
    // Stable, case-sensitive ID; avoids collisions between similar English labels.
    let hash = 2166136261;
    for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return 'ui_' + source.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 48) + '_' + (hash >>> 0).toString(16);
  }
  function t(source, substitutions = []) {
    const values = substitutions.map(value => String(value ?? ''));
    const translated = api?.getMessage(key(source), values);
    return translated || source.replace(/\$(\d+)/g, (_, n) => values[Number(n) - 1] ?? '');
  }
  function html(source, substitutions = []) {
    return t(source, substitutions).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function prepareInput(input) {
    const update = () => { input.dir = input.value ? 'auto' : direction; };
    update();
    input.addEventListener('input', update);
  }
  function applyDirection(element) {
    element.dir = direction;
    element.lang = locale;
    element.setAttribute('data-toolbox-ui', '');
    // User-entered text chooses its own direction, independently of UI language.
    element.querySelectorAll('input[type="text"], textarea').forEach(prepareInput);
    element.querySelectorAll('kbd, pre, code').forEach(code => { code.dir = 'ltr'; });
  }
  return { t, html, key, prepareInput, applyDirection, locale, direction };
})();
