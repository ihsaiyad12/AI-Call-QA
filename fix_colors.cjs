const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(file => {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Background hovers and faint borders
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'var(--color-bg-hover)');
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, 'var(--color-bg-hover)');
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.02\)/g, 'var(--color-bg-hover)');
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, 'var(--color-border)');
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'var(--color-border-hover)');
    
    // Shadows
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.2\)/g, 'var(--color-shadow)');
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.3\)/g, 'var(--color-shadow)');
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.4\)/g, 'var(--color-shadow)');
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.5\)/g, 'var(--color-shadow)');

    // Text dimmer
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.3\)/g, 'var(--color-text-dim)');
    
    // Gradients (StepIndicator, Skeleton) that used white
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'var(--color-bg-hover)');
    
    // Input/Form backgrounds that used hardcoded slate #0f172a
    content = content.replace(/rgba\(15,\s*23,\s*42,\s*0\.5\)/g, 'var(--color-bg-app)');
    content = content.replace(/rgba\(15,\s*23,\s*42,\s*0\.8\)/g, 'var(--color-bg-sidebar)');

    fs.writeFileSync(fullPath, content);
});

console.log('Done replacing colors in components.');
