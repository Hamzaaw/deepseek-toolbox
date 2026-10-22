const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { unzipSync } = require('fflate');
const { root, source, manifest, releaseFiles } = require('./files.cjs');
const files = releaseFiles();
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
assert.equal(packageInfo.version, manifest.version, 'Package and extension versions must match');
for (const file of files) {
  const full = path.join(source, file);
  if (file.endsWith('.js')) execFileSync(process.execPath, ['--check', full]);
  if (file.endsWith('.json')) JSON.parse(fs.readFileSync(full));
}
execFileSync(process.execPath, [path.join(__dirname, 'build.cjs')]);
const archive = path.join(root, `dist/deepseek-toolbox-v${manifest.version}.zip`);
const first = fs.readFileSync(archive);
const entries = unzipSync(first);
assert.deepEqual(Object.keys(entries).sort(), [...files, 'LICENSE'].sort());
for (const file of [...files, 'LICENSE']) {
  const expected = fs.readFileSync(file === 'LICENSE' ? path.join(root, file) : path.join(source, file));
  assert.deepEqual(Buffer.from(entries[file]), expected, `ZIP differs: ${file}`);
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/extension', file)), expected, `Unpacked build differs: ${file}`);
}
execFileSync(process.execPath, [path.join(__dirname, 'build.cjs')]);
assert.deepEqual(fs.readFileSync(archive), first, 'Repeated builds must produce identical ZIPs');
console.log(`Verified ${files.length} extension files, license, permissions, syntax, JSON and reproducible ZIP.`);
