import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {materializeDataAssets} from '../src/portable-assets.mjs';

test('embedded media becomes a local HyperFrames job asset', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'animill-assets-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const project = {scenes: [{duration: 1000, blocks: [], soundtrack: {src: 'data:audio/wav;base64,UklGRg=='}}]};
  const result = await materializeDataAssets(project, directory);
  assert.match(result.scenes[0].soundtrack.src, /^\.\/assets\/scene-1-soundtrack-0\.wav$/);
  assert.equal((await readFile(path.join(directory, 'assets', 'scene-1-soundtrack-0.wav'))).toString('base64'), 'UklGRg==');
  assert.match(project.scenes[0].soundtrack.src, /^data:/, 'canonical project must remain untouched');
});
