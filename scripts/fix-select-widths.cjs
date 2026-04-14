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
  // Match SelectTrigger with a className that starts with `w-[Xpx]` as first class
  // and doesn't already contain `w-full sm:`
  const next = src.replace(
    /(<SelectTrigger[^>]*className=")(w-\[\d+px\])([^"]*")/g,
    (_match, pre, width, post) => {
      subs++;
      return `${pre}w-full sm:${width}${post}`;
    },
  );
  if (next !== src) {
    fs.writeFileSync(f, next, 'utf8');
    touched++;
  }
}
console.log('Files touched:', touched, 'Widths patched:', subs);
