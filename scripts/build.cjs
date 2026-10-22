// Build on macOS, Linux or Windows. Development dependencies never ship in the extension.
const fs = require('node:fs');
const path = require('node:path');
const { zipSync } = require('fflate');
const { root, source, manifest, releaseFiles } = require('./files.cjs');
const files = releaseFiles();
const output = path.join(root, 'dist/extension');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const entries = {};
for (const file of [...files, 'LICENSE']) {
  const contents = fs.readFileSync(file === 'LICENSE' ? path.join(root, file) : path.join(source, file));
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
  entries[file] = [contents, { mtime: new Date(2026, 0, 1, 0, 0, 0) }];
}
const archive = path.join(root, `dist/deepseek-toolbox-v${manifest.version}.zip`);
fs.writeFileSync(archive, zipSync(entries, { level: 9 }));
console.log(`Built dist/extension and ${path.basename(archive)}. Permissions unchanged.`);
