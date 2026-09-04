import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const AUDIO_LANES = ['voice', 'music', 'ambience', 'sfx', 'silence', 'transition'];

export const AUDIO_ARCHETYPES = {
  cliffhanger: {
    name: 'Cliffhanger', promise: 'Reveal enough to create a question, then stop before the answer.',
    beats: [
      ['ambience', 0, 18000, 'Low atmospheric bed', 25], ['voice', 500, 4200, 'I should not have opened that message.', 58],
      ['sfx', 4700, 900, 'Notification impact', 78], ['voice', 6200, 4800, 'It was sent tomorrow — in my own voice.', 72],
      ['transition', 11200, 1800, 'Rising tension', 88], ['silence', 13200, 1700, 'Hold the question', 0],
      ['voice', 15100, 2600, 'Then the cockpit answered.', 92],
    ],
  },
  war_of_two_worlds: {
    name: 'War of Two Worlds', promise: 'Collide two opposing sonic identities and force a choice.',
    beats: [
      ['music', 0, 9000, 'World A — warm pulse', 42], ['voice', 600, 3600, 'One signal promised safety.', 55],
      ['music', 9000, 9000, 'World B — fractured rhythm', 72], ['voice', 9800, 3900, 'The other one knew my name.', 76],
      ['sfx', 14300, 800, 'Collision impact', 100], ['voice', 15500, 2300, 'I chose both.', 90],
    ],
  },
  level_up: {
    name: 'Level Up', promise: 'Make progress audible through escalating rhythm, density and confidence.',
    beats: [
      ['music', 0, 18000, 'Ascending electronic pulse', 45], ['voice', 400, 3300, 'Attempt one: survive.', 42],
      ['sfx', 4300, 500, 'Level chime one', 55], ['voice', 6100, 3300, 'Attempt two: understand.', 64],
      ['sfx', 10100, 500, 'Level chime two', 76], ['voice', 12400, 3300, 'Attempt three: take control.', 90],
      ['sfx', 16300, 900, 'Final unlock', 100],
    ],
  },
  talkback: {
    name: 'Talkback', promise: 'Stage a sharp call-and-response that invites the listener into the argument.',
    beats: [
      ['ambience', 0, 18000, 'Intimate room tone', 20], ['voice', 300, 3500, 'You call that impossible?', 62],
      ['silence', 4100, 800, 'Wait for the answer', 0], ['voice', 5200, 3800, 'No. I call it untested.', 72],
      ['sfx', 9600, 450, 'Desk tap', 68], ['voice', 11000, 5100, 'Your turn — what would you try first?', 84],
    ],
  },
  cautionary_tale: {
    name: 'Cautionary Tale', promise: 'Open with a warning, show the irreversible choice, leave one usable lesson.',
    beats: [
      ['ambience', 0, 18000, 'Distant mechanical hum', 24], ['voice', 400, 4200, 'There was one rule: never answer twice.', 60],
      ['sfx', 5200, 700, 'Second answer tone', 80], ['voice', 6800, 4700, 'At midnight, I forgot which voice was mine.', 86],
      ['silence', 12000, 1200, 'Warning breath', 0], ['voice', 13700, 3900, 'If it calls again, let it ring.', 72],
    ],
  },
};

const slugify = (value) => String(value || 'nana-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 64) || 'nana-project';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeAudioProject(input) {
  if (!input || typeof input !== 'object') throw new Error('Audio project must be an object');
  const durationMs = clamp(Number(input.durationMs || 18000), 5000, 180000);
  const archetype = AUDIO_ARCHETYPES[input.archetype] ? input.archetype : 'cliffhanger';
  const sourceBeats = Array.isArray(input.beats) && input.beats.length ? input.beats : AUDIO_ARCHETYPES[archetype].beats.map(([lane, startMs, beatDuration, text, energy]) => ({lane, startMs, durationMs: beatDuration, text, energy}));
  const beats = sourceBeats.map((beat, index) => {
    const lane = AUDIO_LANES.includes(beat.lane) ? beat.lane : 'voice';
    const startMs = clamp(Math.round(Number(beat.startMs || 0)), 0, durationMs - 1);
    return {
      id: String(beat.id || `beat-${index + 1}`), lane, startMs,
      durationMs: clamp(Math.round(Number(beat.durationMs || 1000)), 100, durationMs - startMs),
      text: String(beat.text || `${lane} beat`).slice(0, 500), energy: clamp(Math.round(Number(beat.energy ?? 50)), 0, 100),
      provider: String(beat.provider || (lane === 'voice' ? 'unassigned-tts' : lane === 'music' ? 'unassigned-music' : 'local-preview')),
      rights: String(beat.rights || 'original-plan'), approved: beat.approved === true,
    };
  }).sort((a, b) => a.startMs - b.startMs || AUDIO_LANES.indexOf(a.lane) - AUDIO_LANES.indexOf(b.lane));
  return {
    version: '1.0', id: String(input.id || `nana-${Date.now()}`), name: String(input.name || 'Untitled audio story').slice(0, 120),
    archetype, promise: String(input.promise || AUDIO_ARCHETYPES[archetype].promise).slice(0, 500), audience: String(input.audience || 'curious short-form listeners').slice(0, 240),
    durationMs, providerPolicy: String(input.providerPolicy || 'local-first'), rightsPolicy: 'declared-assets-only', beats,
  };
}

export function toAnimillLaunchProject(input) {
  const project = normalizeAudioProject(input);
  const textBeats = project.beats.filter((beat) => beat.lane === 'voice');
  const blocks = [
    {id: 'nana-kicker', type: 'annotation', content: AUDIO_ARCHETYPES[project.archetype].name.toUpperCase(), track: 'text3', x: 150, y: 240, w: 1500, h: 70, z: 10, start: 0, dur: project.durationMs, motion: 'slide-right', micro: 'none', effect: 'none', audioEnabled: false, font: 'Arial', fontSize: 32, weight: 800, color: '#76ffc3'},
    ...textBeats.map((beat, index) => ({
      id: `nana-${beat.id}`, type: index === 0 ? 'hero' : 'caption', content: beat.text, track: `text${index % 3 + 1}`,
      x: 150, y: 400 + (index % 3) * 190, w: 1540, h: index === 0 ? 260 : 150, z: 20 + index,
      start: beat.startMs, dur: Math.max(beat.durationMs, 1400), transitionDuration: 550,
      motion: index % 2 ? 'slide-left' : 'fade-up', micro: 'none', effect: index === 0 ? 'chrome-edge' : 'none',
      audioEnabled: false, font: 'Arial', fontSize: index === 0 ? 104 : 52, weight: index === 0 ? 900 : 750, color: index === 0 ? '#fff4d4' : '#ffffff',
    })),
  ];
  return {
    version: '7.0', id: `animill-${project.id}`, name: `${project.name} · visual launch kit`, aspect: 'desktop_16_9', fps: 30, activeScene: 0, assets: [],
    scenes: [{id: 'nana-launch-scene', name: `Audio story · ${AUDIO_ARCHETYPES[project.archetype].name}`, duration: project.durationMs, themeBg: 'noir', audio: [], effects: [], blocks}],
  };
}

export function audioBeatPlan(input) {
  const project = normalizeAudioProject(input);
  return {
    version: '1.0', projectId: project.id, durationMs: project.durationMs,
    lanes: AUDIO_LANES.map((lane) => ({lane, beats: project.beats.filter((beat) => beat.lane === lane)})),
    mixTarget: {integratedLufs: -16, truePeakDb: -1.5, dialoguePriority: true},
  };
}

export async function exportAudioProject(input, openMontageRoot) {
  const project = normalizeAudioProject(input);
  const slug = slugify(project.name);
  const artifactRoot = path.join(openMontageRoot, 'projects', slug, 'artifacts');
  await mkdir(artifactRoot, {recursive: true});
  const artifacts = {
    'nana-project.json': project,
    'audio-beat-plan.json': audioBeatPlan(project),
    'animill-project.json': toAnimillLaunchProject(project),
    'provider-decisions.json': {version: '1.0', policy: project.providerPolicy, generationExecuted: false, note: 'Provider calls require explicit configuration and approval.'},
  };
  for (const [name, data] of Object.entries(artifacts)) await writeFile(path.join(artifactRoot, name), JSON.stringify(data, null, 2));
  return {projectSlug: slug, artifactRoot, files: Object.keys(artifacts), animillProject: artifacts['animill-project.json']};
}
