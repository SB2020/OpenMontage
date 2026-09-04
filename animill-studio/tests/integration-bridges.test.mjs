import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSourceDocument} from '../src/source-browser.mjs';
import {toOpenMontageArtifacts} from '../src/openmontage-bridge.mjs';

const project = {
  id: 'fresh-proof', name: 'Fresh Bridge Proof', aspect: 'desktop_16_9', fps: 24,
  assets: [{id: 'source-1', name: 'Reference', type: 'image', url: 'https://example.com/cover.jpg', rights: 'unknown'}],
  scenes: [{id: 'scene-1', name: 'Hook', duration: 1000, audio: [], effects: [], blocks: [
    {id: 'hero-1', type: 'hero', content: 'A NEW HOOK', start: 0, dur: 1000, motion: 'scale-in'},
    {id: 'image-1', type: 'image', content: 'Cover', src: 'https://example.com/cover.jpg', start: 0, dur: 1000},
  ]}],
};

test('source browser extracts provenance-ready media', () => {
  const result = extractSourceDocument('<title>Proof</title><meta property="og:description" content="Fresh"><img src="/cover.jpg" alt="Cover">', 'https://example.com/page', 'proof');
  assert.equal(result.title, 'Proof');
  assert.equal(result.description, 'Fresh');
  assert.deepEqual(result.candidates[0], {type: 'image', url: 'https://example.com/cover.jpg', label: 'Cover'});
});

test('ANIMILL maps to valid OpenMontage artifact contracts', () => {
  const result = toOpenMontageArtifacts(project, 'hyperframes');
  assert.equal(result.scenePlan.version, '1.0');
  assert.equal(result.scenePlan.scenes[0].type, 'generated');
  assert.equal(result.editDecisions.render_runtime, 'hyperframes');
  assert.equal(result.editDecisions.cuts[0].source, 'artifacts/animill-project.json#scene-1');
  assert.equal(result.sourceManifest.sources[0].rights, 'unknown');
});
