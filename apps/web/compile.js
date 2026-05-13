/**
 * Build script: compiles src/DraftLab.jsx → injects into template.html → writes index.html
 * Usage: node compile.js
 */
const babel  = require('@babel/core');
const fs     = require('fs');
const path   = require('path');

const SRC      = path.join(__dirname, 'src', 'DraftLab.jsx');
const TEMPLATE = path.join(__dirname, 'template.html');
const OUT      = path.join(__dirname, 'index.html');
const MARKER   = '/* __COMPILED_SCRIPT__ */';

const jsx = fs.readFileSync(SRC, 'utf8');

const { code } = babel.transformSync(jsx, {
  filename: 'DraftLab.jsx',
  presets: [
    ['@babel/preset-env', {
      targets: { chrome: '90', firefox: '90', safari: '14' },
      modules: false
    }],
    ['@babel/preset-react', { runtime: 'classic' }]
  ],
  compact: false,
  comments: false
});

const template = fs.readFileSync(TEMPLATE, 'utf8');
if (!template.includes(MARKER)) {
  console.error(`ERROR: marker "${MARKER}" not found in template.html`);
  process.exit(1);
}

fs.writeFileSync(OUT, template.replace(MARKER, code));
console.log('✓  Built apps/web/index.html');
