import express from 'express';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertPortableAssets, projectFps, validateProject} from './src/project.mjs';
import {hyperframesManifest, toHyperframesHtml} from './src/hyperframes-export.mjs';
import {browserStatus, inspectSource} from './src/source-browser.mjs';
import {exportToOpenMontage} from './src/openmontage-bridge.mjs';
import {analyzeRuntimeCompatibility, assertRuntimeApproval, runtimeCapabilities} from './src/runtime-compatibility.mjs';
import {materializeDataAssets} from './src/portable-assets.mjs';
import {audioBeatPlan, exportAudioProject, normalizeAudioProject, toAnimillLaunchProject} from './src/audio-project.mjs';
import {moneyPrinterToAnimillSpec} from './src/moneyprinter-intake.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.ANIMILL_PORT || 4177);
const jobs = new Map();
const openMontageRoot = path.resolve(root, '..');
const nanaStudioSource = 'E:\\e-drives\\nana_master_suite.html';
const localAssetBase = () => `http://127.0.0.1:${port}`;
const toolEntry = (name) => {
  if (name === 'hyperframes') return path.join(root, 'node_modules', 'hyperframes', 'bin', 'hyperframes.mjs');
  if (name === 'remotion') return path.join(root, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
  throw new Error(`Unknown Node tool: ${name}`);
};
const runTool = (name, args, cwd, job) => run(process.execPath, [toolEntry(name), ...args], cwd, job);

app.use(express.json({limit: '80mb'}));
app.use('/renders', express.static(path.join(root, 'renders')));
app.use('/openmontage-assets', express.static(path.join(openMontageRoot, 'assets')));
app.get('/nana-studio-master.html', async (_request, response) => {
  if (!existsSync(nanaStudioSource)) return response.status(404).type('text').send(`NANA Studio source not found: ${nanaStudioSource}`);
  response.type('html').send(await readFile(nanaStudioSource, 'utf8'));
});
app.use(express.static(path.join(root, 'public')));

function resolveLocalAssetUrls(input) {
  const project = structuredClone(input);
  const resolve = value => typeof value === 'string' && value.startsWith('/openmontage-assets/') ? `${localAssetBase()}${value}` : value;
  for (const scene of project.scenes || []) {
    for (const block of scene.blocks || []) block.src = resolve(block.src);
    if (scene.soundtrack) {
      if (scene.soundtrack.src) scene.soundtrack.src = resolve(scene.soundtrack.src);
      if (scene.soundtrack.url) scene.soundtrack.url = resolve(scene.soundtrack.url);
    }
  }
  return project;
}

function run(command, args, cwd, job) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {cwd, shell: false, windowsHide: true});
    let output = '';
    const capture = (chunk) => {
      output = (output + chunk.toString()).slice(-24000);
      if (job) job.log = output;
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(`${path.basename(command)} exited ${code}\n${output}`)));
  });
}

async function runtimeStatus() {
  const status = {
    node: process.version,
    ffmpeg: false,
    hyperframes: {installed: existsSync(toolEntry('hyperframes')), version: null},
    remotion: {installed: existsSync(toolEntry('remotion')), version: null},
    browser: await browserStatus(),
    openmontage: {connected: existsSync(path.join(openMontageRoot, 'AGENT_GUIDE.md')), root: openMontageRoot},
    capabilities: runtimeCapabilities,
  };
  try { await run('ffmpeg', ['-version'], root); status.ffmpeg = true; } catch {}
  if (status.hyperframes.installed) {
    try { status.hyperframes.version = (await runTool('hyperframes', ['--version'], root)).trim().split(/\s+/).at(-1); } catch {}
  }
  if (status.remotion.installed) {
    try { status.remotion.version = (await runTool('remotion', ['--version'], root)).trim().split(/\s+/).at(-1); } catch {}
  }
  return status;
}

async function renderHyperframes(project, jobDir, output, job) {
  const workspace = path.join(jobDir, 'hyperframes');
  await mkdir(workspace, {recursive: true});
  const portableProject = await materializeDataAssets(project, workspace, {localAssetsRoot: path.join(openMontageRoot, 'assets')});
  await writeFile(path.join(workspace, 'index.html'), toHyperframesHtml(portableProject), 'utf8');
  await writeFile(path.join(workspace, 'animill-manifest.json'), JSON.stringify(hyperframesManifest(project), null, 2), 'utf8');
  await copyFile(path.join(root, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), path.join(workspace, 'gsap.min.js'));
  job.phase = 'checking';
  await runTool('hyperframes', ['check', '--json', workspace], root, job);
  job.phase = 'rendering';
  await runTool('hyperframes', ['render', workspace, '-o', output, '--fps', String(projectFps(project)), '--strict'], root, job);
}

async function renderRemotion(project, jobDir, output, job) {
  project = resolveLocalAssetUrls(project);
  const props = path.join(jobDir, 'props.json');
  await writeFile(props, JSON.stringify({project}, null, 2), 'utf8');
  job.phase = 'rendering';
  await runTool('remotion', [
    'render', path.join(root, 'remotion', 'index.tsx'), 'Animill', output,
    '--props', props, '--codec', 'h264', '--pixel-format', 'yuv420p', '--overwrite',
  ], root, job);
}

async function executeJob(job, project) {
  try {
    const jobDir = path.join(root, '.animill-jobs', job.id);
    const outputDir = path.join(root, 'renders', job.id);
    await mkdir(jobDir, {recursive: true});
    await mkdir(outputDir, {recursive: true});
    const output = path.join(outputDir, `animill-${job.runtime}.mp4`);
    job.phase = 'preflight';
    if (job.runtime === 'hyperframes') await renderHyperframes(project, jobDir, output, job);
    else if (job.runtime === 'remotion') await renderRemotion(project, jobDir, output, job);
    else throw new Error(`Unknown runtime: ${job.runtime}`);
    job.status = 'complete';
    job.phase = 'complete';
    job.outputUrl = `/renders/${job.id}/${path.basename(output)}`;
  } catch (error) {
    job.status = 'failed';
    job.phase = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
  }
}

app.get('/api/runtimes', async (_request, response) => response.json(await runtimeStatus()));

app.post('/api/compatibility', (request, response) => {
  try {
    const project = validateProject(structuredClone(request.body.project));
    response.json({
      hyperframes: analyzeRuntimeCompatibility(project, 'hyperframes'),
      remotion: analyzeRuntimeCompatibility(project, 'remotion'),
    });
  } catch (error) {
    response.status(400).json({error: error.message});
  }
});

app.post('/api/browser/inspect', async (request, response) => {
  try {
    response.json(await inspectSource(request.body.url, request.body.mode));
  } catch (error) {
    response.status(400).json({error: error.message});
  }
});

app.post('/api/intake/moneyprinter', (request, response) => {
  try {
    response.json({spec: moneyPrinterToAnimillSpec(structuredClone(request.body.bundle || request.body))});
  } catch (error) {
    response.status(400).json({error: error.message});
  }
});

app.get('/api/audio/status', async (_request, response) => {
  let ffmpegReady = false;
  try { await run('ffmpeg', ['-version'], root); ffmpegReady = true; } catch {}
  response.json({
    local: {preview: true, ffmpegMixing: ffmpegReady, analysis: ffmpegReady},
    providers: {
      suno: {configured: Boolean(process.env.SUNO_API_KEY), role: 'music'},
      elevenlabs: {configured: Boolean(process.env.ELEVENLABS_API_KEY), role: 'voice, music and SFX'},
      openai: {configured: Boolean(process.env.OPENAI_API_KEY), role: 'voice'},
      google: {configured: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY), role: 'voice'},
      piper: {configured: Boolean(process.env.PIPER_PATH), role: 'offline voice'},
    },
    policy: 'No provider is called or substituted without explicit creator approval.',
  });
});

app.post('/api/audio/plan', (request, response) => {
  try {
    const project = normalizeAudioProject(structuredClone(request.body.project || request.body));
    response.json({project, beatPlan: audioBeatPlan(project), animillProject: toAnimillLaunchProject(project)});
  } catch (error) {
    response.status(400).json({error: error.message});
  }
});

app.post('/api/audio/handoff', async (request, response) => {
  try {
    response.status(201).json(await exportAudioProject(structuredClone(request.body.project || request.body), openMontageRoot));
  } catch (error) {
    response.status(400).json({error: error.message});
  }
});

app.post('/api/openmontage/export', async (request, response) => {
  try {
    const project = validateProject(structuredClone(request.body.project));
    const runtime = String(request.body.renderRuntime || '');
    assertRuntimeApproval(project, runtime, request.body.allowDifferences === true);
    response.status(201).json(await exportToOpenMontage(project, runtime, openMontageRoot));
  } catch (error) {
    response.status(error.code === 'RUNTIME_DIFFERENCES_NOT_APPROVED' ? 409 : 400).json({error: error.message, report: error.report});
  }
});

app.post('/api/export/hyperframes', async (request, response) => {
  try {
    const project = validateProject(structuredClone(request.body.project || request.body));
    assertPortableAssets(project);
    assertRuntimeApproval(project, 'hyperframes', request.body.allowDifferences === true);
    response.type('html').attachment('animill-hyperframes.html').send(toHyperframesHtml(project));
  } catch (error) {
    response.status(error.code === 'RUNTIME_DIFFERENCES_NOT_APPROVED' ? 409 : 400).json({error: error.message, report: error.report});
  }
});

app.post('/api/render', async (request, response) => {
  try {
    const runtime = String(request.body.runtime || '');
    if (!['hyperframes', 'remotion'].includes(runtime)) throw new Error('runtime must be hyperframes or remotion');
    const project = validateProject(structuredClone(request.body.project));
    assertPortableAssets(project);
    const compatibility = assertRuntimeApproval(project, runtime, request.body.allowDifferences === true);
    const job = {id: randomUUID(), runtime, compatibility, status: 'queued', phase: 'queued', log: '', error: null, outputUrl: null};
    jobs.set(job.id, job);
    response.status(202).json(job);
    job.status = 'running';
    void executeJob(job, project);
  } catch (error) {
    response.status(error.code === 'RUNTIME_DIFFERENCES_NOT_APPROVED' ? 409 : 400).json({error: error.message, report: error.report});
  }
});

app.get('/api/jobs/:id', (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) return response.status(404).json({error: 'Render job not found'});
  response.json(job);
});

app.get('/', async (_request, response) => {
  const html = await readFile(path.join(root, 'public', 'animill.html'), 'utf8');
  response.type('html').send(html);
});

app.listen(port, '127.0.0.1', () => {
  console.log(`ANIMILL 7 render bridge: http://127.0.0.1:${port}`);
});
