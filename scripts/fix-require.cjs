/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk('src').filter((f) => f.includes(path.sep + '__tests__' + path.sep));

let touched = 0;
let subs = 0;
for (const f of files) {
  const orig = fs.readFileSync(f, 'utf8');
  if (!orig.includes("require('node:")) continue;

  const patA = [
    ...orig.matchAll(/const\s+\{\s*([^}]+)\s*\}\s*=\s*require\('node:(fs|path)'\);?\n?/g),
  ];
  const patB = [
    ...orig.matchAll(/const\s+(\w+)\s*=\s*require\('node:(fs|path)'\);?\n?/g),
  ];
  if (patA.length === 0 && patB.length === 0) continue;

  let s = orig;
  s = s.replace(/const\s+\{\s*([^}]+)\s*\}\s*=\s*require\('node:(fs|path)'\);?\n?/g, '');
  s = s.replace(/const\s+(\w+)\s*=\s*require\('node:(fs|path)'\);?\n?/g, '');

  const importsToAdd = [];
  const seen = new Set();
  for (const m of patA) {
    const names = m[1].split(',').map((x) => x.trim()).filter(Boolean).join(', ');
    const mod = 'node:' + m[2];
    const key = mod + '|D|' + names;
    if (seen.has(key)) continue;
    seen.add(key);
    importsToAdd.push(`import { ${names} } from '${mod}';`);
  }
  for (const m of patB) {
    const mod = 'node:' + m[2];
    const key = mod + '|N|' + m[1];
    if (seen.has(key)) continue;
    seen.add(key);
    importsToAdd.push(`import ${m[1]} from '${mod}';`);
  }

  const lines = s.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImport = i;
    else if (lastImport >= 0) break;
  }
  const insertAt = lastImport + 1;
  lines.splice(insertAt, 0, ...importsToAdd);
  s = lines.join('\n');

  fs.writeFileSync(f, s, 'utf8');
  touched++;
  subs += patA.length + patB.length;
}
console.log('Files touched:', touched, 'Requires replaced:', subs);
