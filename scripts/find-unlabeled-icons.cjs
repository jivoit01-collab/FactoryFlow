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

// Find end of JSX opening tag, respecting {...} expressions (which may contain `>`).
function findTagEnd(src, start) {
  let depth = 0;
  let inStr = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === inStr && src[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i;
  }
  return -1;
}

const files = walk('src');
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  // Match JSX tag start: <Button or <button — followed by whitespace or slash/attr
  const re = /<(Button|button)\b/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const end = findTagEnd(s, m.index);
    if (end < 0) continue;
    const tag = s.slice(m.index, end + 1);
    if (!tag.includes('size="icon"')) continue;
    if (tag.includes('aria-label') || tag.includes('aria-labelledby')) continue;
    const line = s.slice(0, m.index).split('\n').length;
    console.log(`${f}:${line}`);
  }
}
