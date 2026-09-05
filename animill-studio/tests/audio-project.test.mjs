import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {audioBeatPlan, exportAudioProject, normalizeAudioProject, toAnimillLaunchProject} from '../src/audio-project.mjs';
import {analyzeRuntimeCompatibility} from '../src/runtime-compatibility.mjs';

test('audio archetype becomes a canonical timed beat plan', () => {
  const project = normalizeAudioProject({name: 'Signal', archetype: 'cliffhanger', durationMs: 18000});
  assert.equal(project.beats.length, 7);
  assert.deepEqual(audioBeatPlan(project).lanes.map((lane) => lane.lane), ['voice', 'music', 'ambience', 'sfx', 'silence', 'transition']);
  assert.ok(project.beats.every((beat) => beat.startMs + beat.durationMs <= project.durationMs));
});

test('selected local preview voice survives the production handoff', () => {
  const project = normalizeAudioProject({name: 'Voices', durationMs: 18000, beats: [
    {id: 'voice-1', lane: 'voice', startMs: 0, durationMs: 1200, text: 'Hello', energy: 50, voiceURI: 'device-voice-two', voiceName: 'Device Voice Two'},
  ]});
  assert.deepEqual(
    {voiceURI: project.beats[0].voiceURI, voiceName: project.beats[0].voiceName},
    {voiceURI: 'device-voice-two', voiceName: 'Device Voice Two'},
  );
});

test('voice beats become an editable production-safe ANIMILL launch scene', () => {
  const launch = toAnimillLaunchProject({name: 'Signal', archetype: 'talkback', durationMs: 18000});
  assert.equal(launch.scenes.length, 1);
  assert.match(launch.name, /visual launch kit/);
  assert.ok(launch.scenes[0].blocks.some((block) => block.effect === 'chrome-edge'));
  assert.ok(launch.scenes[0].blocks.every((block) => block.audioEnabled === false));
  assert.equal(analyzeRuntimeCompatibility(launch, 'hyperframes').exact, true);
  assert.equal(analyzeRuntimeCompatibility(launch, 'remotion').exact, true);
});

test('OpenMontage audio handoff writes connected artifacts', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'nana-handoff-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const result = await exportAudioProject({name: 'Signal', archetype: 'level_up'}, root);
  assert.deepEqual(result.files, ['nana-project.json', 'audio-beat-plan.json', 'animill-project.json', 'provider-decisions.json']);
  const launch = JSON.parse(await readFile(path.join(result.artifactRoot, 'animill-project.json'), 'utf8'));
  assert.equal(launch.scenes[0].name, 'Audio story · Level Up');
});
