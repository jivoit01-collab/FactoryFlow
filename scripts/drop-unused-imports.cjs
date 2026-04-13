/* eslint-disable @typescript-eslint/no-require-imports */
// One-off codemod: remove unused named imports reported by ESLint's
// no-unused-vars rule. Only touches names inside `import { ... }` / `import
// type { ... }` lists — skips array-destructures, variable declarations, and
// other cases the rule also reports.
const { execSync } = require('child_process');
const fs = require('fs');

let raw;
try {
  raw = execSync('npx eslint . -f json', { cwd: process.cwd(), maxBuffer: 50 * 1024 * 1024 });
} catch (e) {
  // ESLint exits non-zero when lint errors exist — stdout still holds valid JSON.
  raw = e.stdout;
}
const results = JSON.parse(raw.toString());

const targets = []; // { file, line, name }
for (const r of results) {
  for (const m of r.messages) {
    if (m.ruleId !== '@typescript-eslint/no-unused-vars') continue;
    const match = m.message.match(/^'([^']+)' is defined but never used\b/);
    if (!match) continue;
    targets.push({ file: r.filePath, line: m.line, name: match[1] });
  }
}

// Group by file
const byFile = new Map();
for (const t of targets) {
  if (!byFile.has(t.file)) byFile.set(t.file, []);
  byFile.get(t.file).push(t);
}

let touched = 0;
let removed = 0;
for (const [file, items] of byFile) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const names = new Set(items.map((i) => i.name));
  // Find import blocks the name appears in
  let changed = false;
  // Simple regex-based remover: match `import ... from '...'` spans (may be multi-line)
  const newSrc = src.replace(
    /import\s+(?:type\s+)?(?:(\w+)\s*,\s*)?\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/g,
    (match, defaultName, namedList) => {
      const parts = namedList.split(',').map((p) => p.trim()).filter(Boolean);
      const kept = parts.filter((p) => {
        // Strip `type ` prefix and aliases: `X as Y` -> consider Y the binding
        const clean = p.replace(/^type\s+/, '');
        const binding = clean.split(/\s+as\s+/).pop().trim();
        if (names.has(binding)) {
          removed++;
          return false;
        }
        return true;
      });
      if (kept.length === parts.length) return match; // no change
      changed = true;
      if (kept.length === 0 && !defaultName) {
        // Whole import becomes empty — drop entirely
        return '';
      }
      const newList = kept.join(', ');
      return match.replace(/\{[^}]+\}/, `{ ${newList} }`);
    },
  );
  // Also: imports without braces (e.g. `import X from '...'`) where X is unused
  // — keep these rare cases for manual handling.
  if (changed) {
    // Clean up any fully-blanked import lines
    const finalSrc = newSrc.replace(/^\s*\n/gm, (m, off) => {
      // Keep single trailing blank, collapse triple+ blanks into one
      return m;
    });
    fs.writeFileSync(file, finalSrc, 'utf8');
    touched++;
  }
}

console.log('Files touched:', touched, 'Imports removed:', removed);
