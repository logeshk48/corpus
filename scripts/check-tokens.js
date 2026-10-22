// Fails if a style uses a raw font size or a stray hex colour instead of the
// design tokens in src/constants/theme.ts. Run: npm run check:tokens
const fs = require('fs');
const path = require('path');

// Data palettes (jar colours, chart colours) are allowed to hold hex values
const ALLOWED = ['src/constants/', 'src/types/', 'src/screens/vaults/components/JarSheet.tsx', 'src/screens/bills/components/LoanPanel.styles.ts'];
const problems = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) check(p.split(path.sep).join('/'));
  }
}

function check(file) {
  if (file.startsWith('src/constants/')) return;
  const hexOk = ALLOWED.some((a) => file.startsWith(a));
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (/fontSize:\s*\d/.test(line)) problems.push(`${file}:${i + 1}  raw fontSize → use Type.*`);
    if (!hexOk && /['"]#[0-9A-Fa-f]{6}['"]/.test(line)) problems.push(`${file}:${i + 1}  raw colour → use Corpus.*`);
  });
}

walk('src');
if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n✗ ${problems.length} design-token problem(s)`);
  process.exit(1);
}
console.log('✓ All styles use design tokens');
