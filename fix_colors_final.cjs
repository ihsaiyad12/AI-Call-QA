const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const dirs = ['components', 'app'];

const replacements = [
  { from: /rgba\(255,\s*255,\s*255,\s*0\.05\)/g, to: 'var(--color-bg-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.03\)/g, to: 'var(--color-bg-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.02\)/g, to: 'var(--color-bg-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.08\)/g, to: 'var(--color-border)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.1\)/g, to: 'var(--color-border-hover)' },
  { from: /rgba\(255,\s*255,\s*255,\s*0\.85\)/g, to: 'var(--color-bg-card)' },
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
  { from: /#eaeaea(?![a-zA-Z0-9])/g, to: 'var(--color-border)' }, // for Page.tsx
  { from: /#64748b(?![a-zA-Z0-9])/g, to: 'var(--color-text-muted)' }, // for Page.tsx
];

function processDir(dir) {
  const fullDir = path.join(projectRoot, dir);
  if (!fs.existsSync(fullDir)) return;
  
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      processDir(path.join(dir, entry.name));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      replacements.forEach(r => {
        content = content.replace(r.from, r.to);
      });

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  });
}

dirs.forEach(processDir);
console.log('Done replacing colors in app and components.');
