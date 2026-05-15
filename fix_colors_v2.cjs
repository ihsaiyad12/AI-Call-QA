const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const replacements = [
  { from: /rgba\(255,\s*255,\s*255,\s*0\.05\)/g, to: 'var(--color-bg-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.03\)/g, to: 'var(--color-bg-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.02\)/g, to: 'var(--color-bg-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.08\)/g, to: 'var(--color-border)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.1\)/g, to: 'var(--color-border-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.85\)/g, to: 'var(--color-bg-card)' }, // for Navbar
  { from: /rgba\(255,\s*255,\s*255,\s*0\.3\)/g, to: 'var(--color-text-dim)' },
  { from: /rgba\(0,\s*0,\s*0,\s*0\.3\)/g, to: 'var(--color-shadow)' },
  { from: /rgba\(0,\s*0,\s*0,\s*0\.2\)/g, to: 'var(--color-shadow)' },
  { from: /rgba\(0,\s*0,\s*0,\s*0\.4\)/g, to: 'var(--color-shadow)' },
  { from: /rgba\(0,\s*0,\s*0,\s*0\.5\)/g, to: 'var(--color-shadow)' },
  { from: /rgba\(0,\s*0,\s*0,\s*0\.04\)/g, to: 'var(--color-shadow)' },
  { from: /rgba\(0,\s*0,\s*0,\s*0\.05\)/g, to: 'var(--color-shadow)' },
  { from: /rgba\(0,\s*0,\s*0,\s*0\.1\)/g, to: 'var(--color-shadow)' },
  { from: /#fff(?![a-zA-Z0-9])/g, to: 'var(--color-bg-card)' },
  { from: /#ffffff(?![a-zA-Z0-9])/g, to: 'var(--color-bg-card)' },
  { from: /#e2e8f0(?![a-zA-Z0-9])/g, to: 'var(--color-border)' },
  { from: /#f1f5f9(?![a-zA-Z0-9])/g, to: 'var(--color-bg-app)' },
  { from: /#94a3b8(?![a-zA-Z0-9])/g, to: 'var(--color-text-muted)' },
  { from: /#f8fafc(?![a-zA-Z0-9])/g, to: 'var(--color-text-main)' },
  { from: /#1e293b(?![a-zA-Z0-9])/g, to: 'var(--color-bg-card)' },
  { from: /#0f172a(?![a-zA-Z0-9])/g, to: 'var(--color-bg-app)' },
];

files.forEach(file => {
  const fullPath = path.join(dir, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  if (content !== original) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});

console.log('Done replacing colors in components.');
