import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const runtime = process.argv[2];
if (!['hyperframes', 'remotion'].includes(runtime)) throw new Error('Choose hyperframes or remotion');
const project = {
  name: `ANIMILL ${runtime} proof`, aspect: 'desktop_16_9', fps: 24,
  scenes: [{name: 'Proof', duration: 1000, themeBg: 'cyber', blocks: [
    {id: 'proof-title', type: 'hero', content: `${runtime.toUpperCase()} ONLINE`, x: 260, y: 360, w: 1400, h: 220, start: 0, dur: 1000, motion: 'fade-up', color: '#ffffff', fontSize: 96, weight: 900},
    {id: 'proof-sub', type: 'caption', content: 'ANIMILL deterministic render route', x: 460, y: 650, w: 1000, h: 100, start: 250, dur: 750, motion: 'scale-in', color: '#76ffc3', fontSize: 42, weight: 700},
  ]}],
};

const renderDir = path.join(root, 'renders', `demo-${runtime}`);
await mkdir(renderDir, {recursive: true});
const response = await fetch('http://127.0.0.1:4177/api/render', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({runtime, project})});
if (!response.ok) throw new Error(await response.text());
let job = await response.json();
while (!['complete', 'failed'].includes(job.status)) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  job = await fetch(`http://127.0.0.1:4177/api/jobs/${job.id}`).then((r) => r.json());
  process.stdout.write(`\r${job.runtime}: ${job.phase}    `);
}
process.stdout.write('\n');
await writeFile(path.join(renderDir, 'result.json'), JSON.stringify(job, null, 2));
if (job.status !== 'complete') throw new Error(job.error || 'Render failed');
console.log(`Rendered ${job.outputUrl}`);
