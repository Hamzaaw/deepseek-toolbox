const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../extension');
const catalogs = Object.fromEntries(fs.readdirSync(path.join(root, '_locales')).map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, '_locales', locale, 'messages.json')))]));
function translator(locale, useFallback = true) {
  const ctx = vm.createContext({chrome:{i18n:{getMessage(key, values = []) {
    const record = catalogs[locale]?.[key] || (useFallback ? catalogs.en[key] : undefined);
    if (!record) return '';
    return record.message.replace(/\$([a-z0-9_]+)\$/gi, (_, name) => {
      const content = record.placeholders?.[name.toLowerCase()]?.content || '';
      return content.replace(/\$(\d+)/g, (_, n) => values[Number(n) - 1] ?? '');
    });
  }}}});
  vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8')+'; globalThis.i18n = ToolboxI18n;', ctx);
  return ctx.i18n;
}
test('all 15 catalogs have valid metadata, placeholders and no unexpected markup', () => {
  assert.equal(Object.keys(catalogs).length, 15);
  const metadata = Object.keys(catalogs.en).filter(key => !key.startsWith('ui_'));
  for (const [locale, catalog] of Object.entries(catalogs)) {
    for (const key of metadata) assert.ok(catalog[key]?.message, `${locale}: ${key}`);
    assert.ok(catalog.extensionName.message.length <= 75, locale+' name');
    assert.ok(catalog.extensionDescription.message.length <= 132, locale+' description');
    assert.equal(catalog.toolboxDirection.message, ['ar', 'fa'].includes(locale) ? 'rtl' : 'ltr');
    for (const [key, record] of Object.entries(catalog)) {
      assert.ok(catalogs.en[key], `${locale}: unknown key ${key}`);
      assert.ok(record.message.trim(), `${locale}: empty ${key}`);
      assert.ok(!/[<>]/.test(record.message), `${locale}: markup in ${key}`);
      const placeholders = s => [...s.matchAll(/\$([a-z0-9_]+)\$/gi)].map(m=>m[1].toLowerCase()).sort();
      assert.deepEqual(placeholders(record.message), placeholders(catalogs.en[key].message), `${locale}: placeholders ${key}`);
      assert.deepEqual(record.placeholders || {}, catalogs.en[key].placeholders || {}, `${locale}: substitutions ${key}`);
      const variables = s => [...s.matchAll(/\{\{?\w+\}?\}/g)].map(m=>m[0]).sort();
      assert.deepEqual(variables(record.message), variables(catalogs.en[key].message), `${locale}: template variables ${key}`);
    }
  }
});
test('Persian and Bengali translate every cataloged UI message without English fallback', () => {
  for (const locale of ['fa','bn']) {
    assert.deepEqual(Object.keys(catalogs[locale]).sort(), Object.keys(catalogs.en).sort());
    for (const key of Object.keys(catalogs.en).filter(k=>k.startsWith('ui_'))) {
      assert.notEqual(catalogs[locale][key].message, catalogs.en[key].message, locale+': '+key);
    }
  }
});
test('substitutions retain literal dollar signs and HTML is escaped once', () => {
  for (const locale of ['en','fa','bn']) {
    const i = translator(locale);
    const name = '<img src=x onerror=alert(1)> $& $1 "quote"';
    const message = i.t('Showing chats in "$1"', [name]);
    assert.ok(message.includes(name));
    const escaped = i.html('Showing chats in "$1"', [name]);
    assert.ok(!escaped.includes('<img'));assert.ok(escaped.includes('&lt;img'));assert.ok(!escaped.includes('&amp;lt;'));
  }
});
test('fallback uses English without changing values and direction is local to the UI', () => {
  const i = translator('de');assert.equal(i.t('Steps: $1', [3]), 'Steps: 3');
  assert.equal(i.t('Unregistered $1', ['$&']), 'Unregistered $&');
  const input={value:'user text',addEventListener(){}},code={},el={setAttribute(){},querySelectorAll(s){return s.includes('input')?[input]:[code];}};
  translator('fa').applyDirection(el);assert.equal(el.dir,'rtl');assert.equal(el.lang,'fa');assert.equal(input.dir,'auto');assert.equal(code.dir,'ltr');
  translator('bn').applyDirection(el);assert.equal(el.dir,'ltr');assert.equal(el.lang,'bn');
});
