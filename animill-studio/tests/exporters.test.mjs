import test from 'node:test';
import assert from 'node:assert/strict';
import {toHyperframesHtml, hyperframesManifest} from '../src/hyperframes-export.mjs';
import {assertPortableAssets, projectDurationMs, validateProject} from '../src/project.mjs';

const freshProject = () => ({
  name: 'Fresh Engine Test', aspect: 'desktop_16_9', fps: 24,
  scenes: [
    {name: 'Signal', duration: 1000, themeBg: 'cyber', blocks: [
      {id: 'title', type: 'hero', content: 'ANIMILL', x: 200, y: 300, w: 1520, h: 200, start: 0, dur: 1000, motion: 'fade-up', color: '#fff'},
    ]},
  ],
});

test('ANIMILL project validates and measures full duration', () => {
  const project = validateProject(freshProject());
  assert.equal(projectDurationMs(project), 1000);
});

test('HyperFrames exporter emits a deterministic composition contract', () => {
  const project = freshProject();
  const html = toHyperframesHtml(project);
  assert.match(html, /data-composition-id="animill"/);
  assert.match(html, /data-width="1920"/);
  assert.match(html, /data-height="1080"/);
  assert.match(html, /data-fps="24"/);
  assert.match(html, /window.__timelines\.animill=tl/);
  assert.match(html, /class="animill-content">ANIMILL<\/span>/);
  assert.match(html, /id="animill-scene-0"/);
  assert.doesNotMatch(html, /justify-content:center/);
  assert.match(html, /Fresh Engine Test/);
  assert.equal(hyperframesManifest(project).runtime, 'hyperframes');
});

test('HyperFrames exporter explicitly declares intentional 3D entrance overlap', () => {
  const project = freshProject();
  project.scenes[0].blocks[0].motion = 'rotate-in';
  assert.match(toHyperframesHtml(project), /data-layout-allow-occlusion/);
});

test('HyperFrames exporter preserves the production-safe chrome edge effect', () => {
  const project = freshProject();
  project.scenes[0].blocks[0].effect = 'chrome-edge';
  const html = toHyperframesHtml(project);
  assert.match(html, /animill-effect-chrome-edge/);
  assert.match(html, /text-shadow:0 1px 0/);
});

test('Renderer preflight rejects browser-only blob assets', () => {
  const project = freshProject();
  project.scenes[0].blocks[0].type = 'video';
  project.scenes[0].blocks[0].src = 'blob:http://localhost/not-portable';
  assert.throws(() => assertPortableAssets(project), /blob URLs/);
});
