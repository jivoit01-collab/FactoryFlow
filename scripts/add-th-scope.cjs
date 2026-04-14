const fs = require('fs');
const path = require('path');

function walk(d) {
  const out = [];
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const s = fs.statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(n)) out.push(p);
  }
  return out;
}

let touched = 0;
let subs = 0;
for (const f of walk('src')) {
  const src = fs.readFileSync(f, 'utf8');
  // Match `<th` followed by whitespace then either `>` (no attrs) or an attr name.
  // Skip `<th` already containing `scope=`.
  // Pattern: `<th` + (space)+ + <attrs> + `>` — insert `scope="col" ` right after `<th `.
  const next = src.replace(/<th(\s)(?!.*?\bscope=)([^>]*)>/g, (match, ws, attrs) => {
    subs++;
    // Preserve leading whitespace character, then inject scope="col"
    return `<th${ws}scope="col"${attrs ? ' ' + attrs.trimStart() : ''}>`;
  });
  if (next !== src) {
    fs.writeFileSync(f, next, 'utf8');
    touched++;
  }
}
console.log('Files touched:', touched, 'th elements patched:', subs);
