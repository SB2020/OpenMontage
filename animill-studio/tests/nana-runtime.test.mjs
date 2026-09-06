import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';

// Exercise the actual adapter with the source suite: broad removal expressions
// previously ate nested function bodies and broke every generator input.
test('focused NANA adapter preserves executable handlers and removes demo runtimes', async t => {
  const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
  const start = server.indexOf('function prepareNanaStudioHtml(');
  const end = server.indexOf('\nconst localAssetBase', start);
  assert.ok(start >= 0 && end > start);
  const prepare = new Script(`(${server.slice(start, end).trim()})`).runInNewContext();
  let source;
  try { source = await readFile('E:/e-drives/nana_master_suite.html', 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return t.skip('Local NANA source suite is not present'); throw error; }
  const reference = await readFile(new URL('../public/animill.html', import.meta.url), 'utf8');
  const theme = [':root','body:before','body:after','button,.tabBtn,.buttonLike','.primary','.cursor'].map(selector => {
    const start = reference.indexOf(selector + '{');
    return start < 0 ? '' : reference.slice(start, reference.indexOf('}', start) + 1);
  }).join('\n');
  const html = prepare(source, theme);
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim());
  assert.ok(scripts.length >= 2);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new Script(source), `inline script ${index}`));
  for (const name of ['loadGenImage', 'loadGenAudio', 'setGenMode', 'drawGenSel']) {
    assert.match(html, new RegExp(`function ${name}\\(`));
  }
  for (const removed of ['runGenerator_DEMO_DISABLED', 'function importSuno(', 'function sectionAction(', 'ace-play-btn']) {
    assert.ok(!html.includes(removed), `${removed} must not ship`);
  }
  assert.match(html, /src="\/nana-operational.js"/);
  assert.ok(!html.includes('SELECT 15s LIP SYNC WINDOW'));
  assert.ok(!html.includes('your RTX 2060'));
  const operational = await readFile(new URL('../public/nana-operational.js', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new Script(operational));
});
