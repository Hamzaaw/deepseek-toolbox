const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json')));
function releaseFiles() {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tests/permissions-baseline.json')));
  for (const [key, value] of Object.entries(baseline)) {
    assert.deepEqual(manifest[key] || [], value, `Permission changes are prohibited: ${key}`);
  }
  const files = new Set(['manifest.json', manifest.background.service_worker, 'storageMutations.js']);
  for (const script of manifest.content_scripts) for (const name of [...script.js, ...script.css]) files.add(name);
  for (const directory of ['icons', '_locales']) {
    function walk(relative) {
      for (const item of fs.readdirSync(path.join(source, relative), { withFileTypes: true })) {
        const name = `${relative}/${item.name}`;
        if (item.isDirectory()) walk(name); else if (item.isFile()) files.add(name);
      }
    }
    walk(directory);
  }
  return [...files].sort();
}
module.exports = { root, source, manifest, releaseFiles };
