import {spawn} from 'node:child_process';
import {copyFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {toHyperframesHtml} from '../src/hyperframes-export.mjs';
import {analyzeRuntimeCompatibility} from '../src/runtime-compatibility.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const origin = process.env.ANIMILL_ORIGIN || 'http://127.0.0.1:4177';
const proofDir = path.join(root, 'artifacts', 'representative-proof');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pixel = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g"><stop stop-color="#14263b"/><stop offset="1" stop-color="#2a1750"/></linearGradient></defs><rect width="640" height="360" rx="28" fill="url(#g)"/><circle cx="320" cy="180" r="92" fill="none" stroke="#76ffc3" stroke-width="16"/><path d="M260 190l45 45 90-110" fill="none" stroke="#f2c968" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>').toString('base64');
function toneDataUrl() {
  const rate = 48000;
  const samples = Math.floor(rate * 0.45);
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + samples * 2, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    const envelope = Math.max(0, 1 - index / samples);
    bytes.writeInt16LE(Math.round(Math.sin(index / rate * Math.PI * 2 * 523.25) * envelope * 9000), 44 + index * 2);
  }
  return `data:audio/wav;base64,${bytes.toString('base64')}`;
}
const tone = toneDataUrl();

const project = {
  id: 'representative-proof', name: 'ANIMILL representative proof', aspect: 'desktop_16_9', fps: 24, activeScene: 0, assets: [],
  scenes: [
    {id: 'proof-1', name: '01 · Title', duration: 1200, themeBg: 'cyber', audio: [], effects: [], blocks: [
      {id: 'title', type: 'hero', content: 'ONE PROJECT', x: 210, y: 300, w: 1500, h: 220, z: 2, start: 0, dur: 1100, transitionDuration: 600, motion: 'rotate-in', micro: 'none', effect: 'chrome-edge', audioEnabled: false, font: 'Arial', fontSize: 128, weight: 900, color: '#ffffff'},
      {id: 'subtitle', type: 'caption', content: 'viewer → HyperFrames → Remotion', x: 350, y: 610, w: 1220, h: 100, z: 3, start: 300, dur: 800, transitionDuration: 450, motion: 'fade-up', micro: 'none', effect: 'none', audioEnabled: false, font: 'Arial', fontSize: 46, weight: 700, color: '#76ffc3'},
    ]},
    {id: 'proof-2', name: '02 · Media', duration: 1200, themeBg: 'noir', audio: [], effects: [], blocks: [
      {id: 'panel', type: 'shape', content: '', x: 150, y: 170, w: 1620, h: 740, z: 1, start: 0, dur: 1200, motion: 'scale-in', micro: 'none', effect: 'none', audioEnabled: false, color: '#111820', radius: 32},
      {id: 'image', type: 'image', content: 'Proof artwork', src: pixel, x: 220, y: 240, w: 760, h: 560, z: 2, start: 80, dur: 1050, motion: 'slide-right', micro: 'none', effect: 'none', audioEnabled: false, radius: 24, fit: 'cover'},
      {id: 'media-copy', type: 'hero', content: 'MEDIA\nSTAYS PUT', x: 1080, y: 330, w: 620, h: 330, z: 3, start: 260, dur: 850, motion: 'fade-up', micro: 'none', effect: 'none', audioEnabled: false, font: 'Arial', fontSize: 92, weight: 900, color: '#f2c968'},
    ]},
    {id: 'proof-3', name: '03 · Finish', duration: 1200, themeBg: 'gold', audio: [], effects: [], soundtrack: {id: 'proof-tone', name: 'Embedded proof tone', src: tone, start: 120, dur: 600, vol: 0.35}, blocks: [
      {id: 'finish', type: 'hero', content: 'FRAME TRUE', x: 260, y: 370, w: 1400, h: 220, z: 2, start: 100, dur: 1000, transitionDuration: 500, motion: 'hero-strike', micro: 'none', effect: 'none', audioEnabled: false, font: 'Arial', fontSize: 144, weight: 900, color: '#fff4d4'},
      {id: 'finish-sub', type: 'annotation', content: '24 FPS · 3 SCENES · 2 ENGINES', x: 430, y: 690, w: 1060, h: 70, z: 3, start: 380, dur: 700, motion: 'slide-left', micro: 'none', effect: 'none', audioEnabled: false, font: 'Arial', fontSize: 36, weight: 800, color: '#76ffc3'},
    ]},
  ],
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output)));
});

async function render(runtime) {
  const response = await fetch(`${origin}/api/render`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({runtime, project})});
  if (!response.ok) throw new Error(await response.text());
  let job = await response.json();
  while (!['complete', 'failed'].includes(job.status)) {
    await wait(800);
    job = await fetch(`${origin}/api/jobs/${job.id}`).then((result) => result.json());
  }
  if (job.status !== 'complete') throw new Error(job.error || `${runtime} failed`);
  const source = path.join(root, job.outputUrl.replace(/^\/renders\//, 'renders/'));
  const output = path.join(proofDir, `${runtime}.mp4`);
  await copyFile(source, output);
  const audioProbe = JSON.parse(await run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'json', output]));
  if (!audioProbe.streams?.length) throw new Error(`${runtime} proof has no audio stream`);
  return {...job, copiedOutput: output, audioProbe};
}

await mkdir(proofDir, {recursive: true});
const compatibility = {
  hyperframes: analyzeRuntimeCompatibility(project, 'hyperframes'),
  remotion: analyzeRuntimeCompatibility(project, 'remotion'),
};
if (!compatibility.hyperframes.exact || !compatibility.remotion.exact) throw new Error('Representative project must remain exact');
await writeFile(path.join(proofDir, 'project.json'), JSON.stringify(project, null, 2));
await writeFile(path.join(proofDir, 'hyperframes.html'), toHyperframesHtml(project));

const browser = await puppeteer.launch({headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-gpu']});
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem('animill.onboard', 'off'));
  await page.goto(origin, {waitUntil: 'networkidle0'});
  const standalone = await page.evaluate((input) => {
    if (!window.ANIMILL.loadState(input)) throw new Error('Browser rejected representative project');
    return window.ANIMILL.exportHTML();
  }, project);
  await writeFile(path.join(proofDir, 'standalone.html'), standalone);
} finally {
  await browser.close();
}

const results = {};
for (const runtime of ['hyperframes', 'remotion']) results[runtime] = await render(runtime);
for (const runtime of ['hyperframes', 'remotion']) {
  for (const seconds of [0.6, 1.8, 3.0]) {
    const label = String(seconds).replace('.', '_');
    await run('ffmpeg', ['-y', '-ss', String(seconds), '-i', results[runtime].copiedOutput, '-frames:v', '1', path.join(proofDir, `${runtime}-${label}.png`)]);
  }
}

await writeFile(path.join(proofDir, 'proof-report.json'), JSON.stringify({generatedAt: new Date().toISOString(), project: project.name, compatibility, results}, null, 2));
console.log(`Representative proof complete: ${proofDir}`);
