import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeRuntimeCompatibility, assertRuntimeApproval} from '../src/runtime-compatibility.mjs';

const project = (block = {}) => ({
  name: 'Compatibility proof', aspect: 'desktop_16_9', fps: 30,
  scenes: [{name: 'One', duration: 2000, audio: [], effects: [], blocks: [{
    id: 'title', type: 'hero', content: 'TITLE', start: 0, dur: 1800,
    motion: 'fade-up', micro: 'none', effect: 'none', audioEnabled: false, ...block,
  }]}],
});

test('shared production-safe features receive an exact result', () => {
  assert.equal(analyzeRuntimeCompatibility(project(), 'hyperframes').exact, true);
  assert.equal(analyzeRuntimeCompatibility(project({motion: 'rotate-in', effect: 'chrome-edge'}), 'remotion').exact, true);
});

test('browser-only styling is reported and requires explicit approval', () => {
  const input = project({motion: 'glitch-in', micro: 'breath', effect: 'liquid-gold'});
  const report = analyzeRuntimeCompatibility(input, 'remotion');
  assert.equal(report.exact, false);
  assert.deepEqual(report.differences.map((item) => item.kind), ['motion', 'micro', 'effect']);
  assert.throws(() => assertRuntimeApproval(input, 'remotion'), /Render with listed differences/);
  assert.equal(assertRuntimeApproval(input, 'remotion', true).differenceCount, 3);
});

test('interactive-only hover state is explained but does not alter video parity', () => {
  const report = analyzeRuntimeCompatibility(project({micro: 'hover-pulse'}), 'hyperframes');
  assert.equal(report.exact, true);
  assert.equal(report.notes[0].kind, 'interaction');
});

test('static ANIMILL text treatments are production-safe', () => {
  const project = {scenes: [{name: 'Depth', duration: 1000, blocks: [{type: 'hero', content: 'Depth', effect: 'glass-depth'}]}]};
  assert.equal(analyzeRuntimeCompatibility(project, 'hyperframes').exact, true);
  assert.equal(analyzeRuntimeCompatibility(project, 'remotion').exact, true);
});
