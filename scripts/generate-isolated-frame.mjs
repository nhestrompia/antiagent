import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const files = ['src/intrinsic-guard.js', 'src/runtime-cost.js', 'src/capture-cover.js', 'src/combined-defense.js'];
const sources = await Promise.all(files.map(path => readFile(path, 'utf8')));
const runtimeOptIn = "(combinedMode || parameters.get('runtime') === 'on') && ";
assert.ok(sources[3].includes(runtimeOptIn), 'Runtime opt-in changed; update the fixture generator');
sources[3] = sources[3].replace(runtimeOptIn, '');
const referenceCheck = 'const integrity = inspectAPIs();';
assert.ok(sources[3].includes(referenceCheck), 'Reference gate changed; update the fixture generator');
// A nested reference frame has another opaque origin and cannot supply API baselines.
// Disable only this incompatible check in the sandbox experiment, not the application.
sources[3] = sources[3].replace(referenceCheck, 'const integrity = { allowed: true, reasons: [] };');
const script = sources.map(source => source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
const original = await readFile('combined-defense.html', 'utf8');
const child = original.replace('<script type="module" src="/src/combined-defense.js"></script>', `<script type="module">${script}</script>`);
assert.notEqual(child, original, 'Application entry changed; update the fixture generator');
const encoded = JSON.stringify(child).replaceAll('<', '\\u003c');
await writeFile('public/isolated-frame.html', `<!doctype html><meta charset="utf-8"><title>Isolated frame pending</title>
<style>body{margin:0}iframe{width:100vw;height:100vh;border:0;display:block}#probe{position:fixed;bottom:0;right:0;background:white;font:12px monospace}</style>
<iframe sandbox="allow-scripts" title="Protected application"></iframe><div id="probe"></div>
<script>
const frame=document.querySelector('iframe');
frame.addEventListener('load',()=>{
  let result;
  try { result=frame.contentWindow.document.querySelector('canvas')?'readable':'empty'; }
  catch(error) { result=error.name; }
  document.querySelector('#probe').textContent='Parent DOM access: '+result;
  document.title='Isolated frame '+result;
});
frame.srcdoc=${encoded};
</script>\n`);
