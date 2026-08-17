const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all tsx files with asChild
const result = execSync('grep -rl "asChild" D:\\Engenox\\web\\src\\app --include="*.tsx"', { encoding: 'utf8', shell: true });
const files = result.trim().split('\n').filter(Boolean);

console.log('Files with asChild:');
files.forEach(f => console.log(' ', f));

// Pattern to replace: <Button ... asChild>\n  <a href="...">...</a>\n</Button>
// With: <Button ... onClick={() => window.location.href = '...'}>...</Button>

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  // Replace simple: <Button variant="X" size="Y" asChild><a href="/path"><Icon />Label</a></Button>
  // Simple single-line pattern
  content = content.replace(
    /<Button([^>]*?)asChild([^>]*)>\s*<a\s+href="([^"]+)">([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/a>\s*<\/Button>/g,
    (match, pre, post, href, inner) => {
      const props = (pre + post).trim();
      return `<Button${props ? ' ' + props : ''} onClick={() => window.location.href = '${href}'}>${inner}</Button>`;
    }
  );

  // Also handle template literal hrefs
  content = content.replace(
    /<Button([^>]*?)asChild([^>]*)>\s*<a\s+href=\{`([^`]+)`\}>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/a>\s*<\/Button>/g,
    (match, pre, post, href, inner) => {
      const props = (pre + post).trim();
      return `<Button${props ? ' ' + props : ''} onClick={() => window.location.href = \`${href}\`}>${inner}</Button>`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
  }
});
