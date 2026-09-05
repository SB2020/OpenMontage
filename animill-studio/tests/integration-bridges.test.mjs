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

test('talking-head world and voice context survives the OpenMontage handoff', () => {
  const talkingHeadProject = {
    id: 'talking-head-proof', name: 'Talking Head Proof', aspect: 'desktop_16_9', fps: 30,
    metadata: {source: 'WAN2', kind: 'talking-head'},
    world: {id: 'world-flight', name: 'Flight World'},
    scenes: [{id: 'scene-head', name: 'Cockpit intro', duration: 12_000,
      talkingHead: {videoSrc: 'https://example.com/presenter.mp4', provider: 'existing'},
      audio: [{id: 'voice-1', track: 'audioA', label: 'Pilot narration', start: 0, dur: 4_000, voiceName: 'Local voice', voiceURI: 'local:test'}],
      effects: [], blocks: [{id: 'head-video', type: 'video', content: 'Pilot', src: 'https://example.com/presenter.mp4', start: 0, dur: 12_000}],
    }],
  };
  const result = toOpenMontageArtifacts(talkingHeadProject, 'remotion');
  assert.equal(result.scenePlan.scenes[0].type, 'talking_head');
  assert.equal(result.scenePlan.metadata.creative_context.world.name, 'Flight World');
  assert.equal(result.scenePlan.metadata.creative_context.scenes[0].audio[0].voice_name, 'Local voice');
  assert.equal(result.scenePlan.metadata.creative_context.scenes[0].talking_head.provider, 'existing');
  assert.equal(result.sourceManifest.sources[0].url, 'https://example.com/presenter.mp4');
  assert.equal(result.animillProject.scenes[0].talkingHead.videoSrc, 'https://example.com/presenter.mp4');
});
