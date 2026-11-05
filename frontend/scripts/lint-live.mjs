import { build } from 'vite';
import { ESLint } from 'eslint';

process.env.VITE_DATA_MODE = 'supabase';
const files = new Set();
await build({
  logLevel: 'error',
  build: { write: false },
  plugins: [{
    name: 'collect-live-modules-for-lint',
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if (this.getModuleInfo(id)?.isIncluded && !id.includes('node_modules') && (id.endsWith('.ts') || id.endsWith('.tsx'))) files.add(id);
      }
    },
  }],
});
if (files.size < 10) throw new Error('Live module collection failed.');
files.add('vite.config.ts');
const eslint = new ESLint();
const results = await eslint.lintFiles([...files]);
const formatter = await eslint.loadFormatter('stylish');
const report = formatter.format(results);
if (report) console.log(report);
const errors = results.reduce((total, result) => total + result.errorCount, 0);
const warnings = results.reduce((total, result) => total + result.warningCount, 0);
console.log('Live build lint: ' + files.size + ' files; ' + errors + ' errors; ' + warnings + ' warnings.');
process.exitCode = errors ? 1 : 0;
