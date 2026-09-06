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
function prepareNanaStudioHtml(source) {
  let html = source;
  const findClosingDiv = function (value, start) {
    let depth = 0;
    const tags = /<\/?div\b[^>]*>/gi;
    tags.lastIndex = start;
    let match;
    while ((match = tags.exec(value))) {
      if (match[0].startsWith('</')) {
        depth -= 1;
        if (depth === 0) return match.index + match[0].length;
      } else {
        depth += 1;
      }
    }
    return -1;
  };
  const layoutStart = html.indexOf('<div class="layout">');
  const mainStart = html.indexOf('<div class="main">', layoutStart);
  const generatorStart = html.indexOf('<div class="section" id="generator"', mainStart);
  const generatorEnd = findClosingDiv(html, generatorStart);
  const scriptTailStart = html.indexOf('<script>', generatorEnd);
  if (layoutStart >= 0 && mainStart > layoutStart && generatorStart > mainStart && generatorEnd > generatorStart && scriptTailStart > generatorEnd) {
    let topbar = html.slice(0, layoutStart);
    const generator = html.slice(generatorStart, generatorEnd);
    let scripts = html.slice(scriptTailStart);
    const stripRuntimeBetween = function (value, startMarker, endMarker) {
      const start = value.indexOf(startMarker);
      const end = value.indexOf(endMarker, start + startMarker.length);
      if (start < 0 || end <= start) return value;
      return value.slice(0, start) + value.slice(end);
    };
    // These runtimes belong to the retired archive/tools and must not ship in the
    // focused Generator + Wav2Lip surface. The source-of-record remains untouched.
    [
      ['// ── PRICING ──', '// ── ACE-STEP ──'],
      ['// ── ACE-STEP ──', '// ── VIDEO FEED ──'],
      ['// ── VIDEO FEED ──', '// ── MINIMIZE / TOGGLE ──'],
      ['// ── CONTENT INGESTION ──', '// ── TOPBAR NAV ACTIVE ON SCROLL ──'],
      ['// Auto-prompt generator', '</script>']
    ].forEach(function (range) { scripts = stripRuntimeBetween(scripts, range[0], range[1]); });
    scripts = scripts.replace(/engine: 'syncso'/g, "engine: 'veo3fast'");
    scripts = scripts.replace(/genState\.engine \|\| 'syncso'/g, "genState.engine || 'veo3fast'");
    scripts = scripts.replace(/\s*var engineDesc = document\.getElementById\('engine-desc'\);\s*/g, '\n');
    scripts = scripts.replace(/\s*var descs = \{[\s\S]*?\n  \};\s*var desc = document\.getElementById\('engine-desc'\);\s*if \(desc\) desc\.textContent = descs\[eng\] \|\| '';\s*/g, '\n');
    scripts = scripts.replace(/\s*addToVideoFeed\(job\);/g, '');
    scripts = scripts.replace(/if \(false\) \{  \/\/ lipsync-full removed — all engines native\r?\n[\s\S]*?\r?\n    \} else \{\r?\n([\s\S]*?)\r?\n    \}/g, '$1');
    scripts = scripts.replace(/\s*if \(false\) \{  \/\/ lipsync-full removed — all engines native\r?\n[\s\S]*?\r?\n      \}\s*/g, '\n');
    scripts = scripts.replace(/lipsync-full/g, 'native-lipsync');
    scripts = scripts.replace(/\(eng === 'native-lipsync'\) \? 'GENERATE — FULL LIPSYNC' : 'GENERATE'/g, "'GENERATE'");
    const styleEnd = topbar.indexOf('</style>');
    if (styleEnd >= 0) {
      let styles = topbar.slice(0, styleEnd);
      [
        ['/* ── CONTENT INGESTION ── */', '/* ── PREVENT SECTION FLASH ── */'],
        ['/* ── HERO FEED ── */', '/* ── DAW TIMELINE ── */'],
        ['/* ── DAW TIMELINE ── */', '/* ── PILL GROUP ── */']
      ].forEach(function (range) { styles = stripRuntimeBetween(styles, range[0], range[1]); });
      topbar = styles + topbar.slice(styleEnd);
    }
    const animillChrome = '<div class="animill-nana-chrome" role="banner"><div class="animill-brand"><span class="animill-brand-sigil">A</span><strong>ANIMILL</strong></div><span class="animill-chrome-divider"></span><div class="animill-context"><strong>NANA STUDIO</strong><span>LOCAL AUDIO → TALKING HEAD</span></div><span class="animill-chrome-spacer"></span><span class="animill-live-dot"></span><span class="animill-local-label">LOCAL</span></div>';
    html = topbar + animillChrome + '<div class="layout"><div class="main">\n' + generator + '\n</div></div>\n' + scripts;
  }
  const topbarRightStart = html.indexOf('<div class="topbar-right">');
  const topbarRightEnd = findClosingDiv(html, topbarRightStart);
  if (topbarRightStart >= 0 && topbarRightEnd > topbarRightStart) {
    html = html.slice(0, topbarRightStart) + html.slice(topbarRightEnd);
  }
  const topbarStart = html.indexOf('<div class="topbar">');
  const topbarEnd = findClosingDiv(html, topbarStart);
  if (topbarStart >= 0 && topbarEnd > topbarStart) {
    html = html.slice(0, topbarStart) + html.slice(topbarEnd);
  }
  const generatorSectionStart = html.indexOf('<div class="section" id="generator"');
  const generatorHeadStart = html.indexOf('  <div class="section-head">', generatorSectionStart);
  const generatorBodyMarkup = html.indexOf('  <div class="section-body" id="generator-body">', generatorHeadStart);
  if (generatorHeadStart >= 0 && generatorBodyMarkup > generatorHeadStart) {
    html = html.slice(0, generatorHeadStart) + html.slice(generatorBodyMarkup);
  }
  html = html.replace(/\s*body:not\(\.show-archive\)[\s\S]*?#tool-imagegen \{ display:none !important; \}/, '');
  html = html.replace(/function toggleArchiveView\(\) \{[\s\S]*?\n\}/, '');
  html = html.replace(/\s*<div class="tnav-item" onclick="location\.href='\/production'">QUICK VIDEO<\/div>/, '');
  const outputStart = html.indexOf('      <!-- Output preview -->');
  const queueStart = html.indexOf('      <!-- Generation queue -->', outputStart);
  const generatorBodyStart = html.indexOf('<div class="section-body" id="generator-body">');
  if (outputStart >= 0 && queueStart > outputStart && generatorBodyStart >= 0) {
    const output = html.slice(outputStart, queueStart).replace('class="card" style="padding:0;overflow:hidden;"', 'class="card nana-output-top-card" style="padding:0;overflow:hidden;"');
    html = html.slice(0, outputStart) + html.slice(queueStart);
    const bodyOpenEnd = html.indexOf('>', generatorBodyStart) + 1;
    const outputChunk = '\n  <!-- ANIMILL adapter: output stays first; settings are opt-in. -->\n' + output;
    html = html.slice(0, bodyOpenEnd) + outputChunk + html.slice(bodyOpenEnd);
    const controlsStart = bodyOpenEnd + outputChunk.length;
    const bodyEnd = findClosingDiv(html, generatorBodyStart);
    if (bodyEnd > controlsStart) {
      html = html.slice(0, controlsStart) + '\n  <details class="nana-settings-menu"><summary>SETTINGS</summary><div class="nana-settings-content">\n' + html.slice(controlsStart, bodyEnd) + '\n</div></details>\n' + html.slice(bodyEnd);
    }
  }
  html = html.replace('        <!-- Mock waveform display -->', '        <!-- Real waveform appears only after a completed local job. -->');
  html = html.replace(/\s*<div style="padding:8px 10px;background:var\(--surface2\);border:1px solid var\(--border\);border-radius:var\(--r-sm\);display:flex;align-items:center;gap:8px;">\s*<div style="flex:1;">\s*<div style="font-size:11px;font-weight:500;">(?:dark_trap_seraph_v1|hellfire_interlude_draft)\.wav<\/div>[\s\S]*?<\/div>\s*<\/div>/g, '');
  html = html.replace('<div id="ace-history" style="display:flex;flex-direction:column;gap:6px;">', '<div id="ace-history" style="display:flex;flex-direction:column;gap:6px;"><div class="muted" style="font-size:9px;padding:8px 0;">No completed local jobs yet. History appears only after a real WAN2GP result.</div>');
  html = html.replace('      <!-- Output preview -->', '      <!-- Output preview · moved to top by ANIMILL adapter -->');
  html = html.replace('<div id="gen-output-actions" style="display:none;padding:10px 12px;border-top:1px solid var(--border);display:none;gap:6px;flex-wrap:wrap;">', '<div id="gen-output-actions" style="display:none;padding:10px 12px;border-top:1px solid var(--border);gap:6px;flex-wrap:wrap;">');
  html = html.replace(/\s*<!-- Cost estimate -->[\s\S]*?<\/div>\s*\n\s*<!-- GENERATE BUTTON -->/, '\n      <!-- GENERATE BUTTON -->');
  html = html.replace(/\s*<div style="margin-top:8px;font-size:9px;color:var\(--muted\);font-family:var\(--font-mono\);padding:6px;background:var\(--surface2\);border-radius:var\(--r-sm\);" id="engine-desc">[\s\S]*?<\/div>/, '');
  html = html.replace('</style>', ':root { --bg:#05070a; --surface:#0c1017; --surface2:#121820; --surface3:#1a2232; --border:#27323a; --border-hi:#3f4a52; --text:#eef5f2; --muted:#8b9a98; --dim:#52605f; --accent:#f2c968; --accent2:#fff4d4; --green:#76ffc3; --blue:#82ddff; --amber:#f2c968; --font-hud:Inter,ui-sans-serif,system-ui,sans-serif; --font-body:Inter,ui-sans-serif,system-ui,sans-serif; --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; } .animill-nana-chrome { height:52px; display:flex; align-items:center; gap:10px; padding:0 12px; color:var(--text); background:linear-gradient(110deg,#101820 0%,#171b28 56%,#282238 100%); border-bottom:1px solid rgba(242,201,104,.28); box-shadow:0 8px 26px rgba(0,0,0,.28); clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%); } .animill-brand { display:flex; align-items:center; gap:8px; letter-spacing:.22em; font-size:13px; } .animill-brand strong { color:#fff4d4; font:900 14px/1 Impact,Inter,sans-serif; letter-spacing:.24em; } .animill-brand-sigil { display:grid; place-items:center; width:30px; height:30px; color:#080a0d; font-weight:1000; background:linear-gradient(135deg,#fff1ba,#b68121 48%,#533100); clip-path:polygon(50% 0,90% 18%,100% 62%,72% 100%,28% 100%,0 62%,10% 18%); } .animill-chrome-divider { width:1px; height:24px; background:rgba(255,255,255,.18); } .animill-context { display:flex; align-items:baseline; gap:9px; } .animill-context strong { font-size:10px; letter-spacing:.14em; color:#fff4d4; } .animill-context span,.animill-local-label { font:9px var(--font-mono); letter-spacing:.12em; color:var(--muted); } .animill-chrome-spacer { flex:1; } .animill-live-dot { width:7px; height:7px; border-radius:50%; background:var(--green); box-shadow:0 0 12px rgba(118,255,195,.72); } .animill-local-label { color:var(--green); } .layout { padding-top:0 !important; } .main { padding-top:0 !important; } .nana-output-top-card { position:relative; width:100%; margin:0 0 14px; border-color:var(--border); clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px); box-shadow:0 16px 42px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.06); } .nana-output-top-card::before,#tool-lipsync > .section-head::before,.nana-settings-menu::before { content:""; position:absolute; left:12px; right:12px; top:0; height:1px; background:linear-gradient(90deg,transparent,var(--accent),var(--green) 72%,transparent); opacity:.68; pointer-events:none; } .nana-output-top-card > div:first-child { background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02)) !important; } .nana-output-top-card .card-title { color:var(--accent) !important; letter-spacing:.14em; } .nana-output-top-card #gen-output-area { aspect-ratio:auto !important; min-height:calc(100vh - 92px); max-height:none !important; background:radial-gradient(circle at 50% 18%,rgba(242,201,104,.09),transparent 42%),var(--bg) !important; } .nana-output-top-card #gen-output-idle > div:first-child { color:var(--accent) !important; opacity:.82; text-shadow:0 0 22px rgba(242,201,104,.26); } .nana-output-top-card #gen-output-idle > div:last-child { color:var(--muted) !important; opacity:.9; } .nana-settings-menu { position:relative; margin:0 0 18px; border:1px solid var(--border); border-radius:0; overflow:hidden; background:var(--surface); clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px); } .nana-settings-menu > summary { cursor:pointer; list-style:none; min-height:38px; box-sizing:border-box; display:flex; align-items:center; padding:10px 12px; font:10px var(--font-mono); letter-spacing:2px; color:var(--muted); } .nana-settings-menu > summary::-webkit-details-marker { display:none; } .nana-settings-menu > summary::after { content:"+"; margin-left:auto; color:var(--accent); } .nana-settings-menu[open] > summary::after { content:"−"; } .nana-settings-content { padding:0 12px 12px; } .generator-body.settings-open .nana-output-top-card #gen-output-area { min-height:320px; max-height:60vh !important; } #tool-lipsync { margin:0 !important; } #tool-lipsync > .section-head { position:relative; min-height:38px; box-sizing:border-box; margin:0; padding:8px 10px; border:1px solid var(--border); border-radius:0; background:var(--surface); clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px); } #tool-lipsync > .section-head .section-title { font-size:13px; } #tool-lipsync > .section-body { display:none; margin:0; padding:12px; border:1px solid var(--border); border-top:0; border-radius:0; background:var(--surface); } #tool-lipsync > .section-body:not(.minimized) { display:block; } @media (max-width:640px) { .animill-nana-chrome { padding:0 8px; } .animill-context span { display:none; } } </style>');
  html = html.replace(/\s*<div class="tnav-item" onclick="navScrollTo\('tool-(?:music|prompts|project|wangp)'\)">[^<]*<\/div>/g, '');
  html = html.replace(/\s*<div class="tnav-item" id="archive-toggle" onclick="toggleArchiveView\(\)">ARCHIVE<\/div>/, '');
  const toolsStart = html.indexOf('  const NANA_TOOLS = [');
  const toolsEnd = html.indexOf('  ];', toolsStart);
  if (toolsStart >= 0 && toolsEnd > toolsStart) {
    const body = html.slice(toolsStart, toolsEnd);
    const starts = [...body.matchAll(/^    \{ id:'([^']+)'/gm)];
    const removed = new Set(['project', 'music', 'wangp', 'prompts', 'vimax', 'imagegen']);
    if (starts.length) {
      let rebuilt = body.slice(0, starts[0].index);
      starts.forEach(function (match, index) {
        const begin = match.index;
        const end = index + 1 < starts.length ? starts[index + 1].index : body.length;
        if (!removed.has(match[1])) rebuilt += body.slice(begin, end);
      });
      html = html.slice(0, toolsStart) + rebuilt + html.slice(toolsEnd);
    }
  }
  const costStart = html.indexOf('function updateGenCost() {');
  const loadImageStart = html.indexOf('function loadGenImage(', costStart);
  if (costStart >= 0 && loadImageStart > costStart) {
    html = html.slice(0, costStart) + 'function updateGenCost() {}\n\n' + html.slice(loadImageStart);
  }
  html = html.replace('  window.NANA_TOOLS = NANA_TOOLS.filter(function (t) { return [\'project\',\'music\',\'wangp\',\'prompts\'].indexOf(t.id) < 0; });', '  window.NANA_TOOLS = NANA_TOOLS;');
  const audFileStart = html.indexOf('function loadAudacityFile(input) {');
  const audOpenStart = html.indexOf('function audOpenTrack(', audFileStart);
  if (audFileStart >= 0 && audOpenStart > audFileStart) {
    html = html.slice(0, audFileStart) + `function loadAudacityFile(input) {
  if (!input.files.length) return;
  var f = input.files[0];
  document.getElementById('aud-filename').textContent = f.name;
  document.getElementById('aud-wave-empty').style.display = 'flex';
  var empty = document.querySelector('#aud-wave-empty span');
  if (empty) empty.textContent = 'FILE SELECTED — AUDACITY PIPE REQUIRED';
  document.getElementById('aud-len').textContent = '0:00.000';
}
` + html.slice(audOpenStart);
  }
  const audCheckStart = html.indexOf('function checkAudacity() {');
  const audLaunchStart = html.indexOf('function launchAudacity()', audCheckStart);
  if (audCheckStart >= 0 && audLaunchStart > audCheckStart) {
    html = html.slice(0, audCheckStart) + `function checkAudacity() {
  var dot = document.getElementById('aud-status-dot');
  var lbl = document.getElementById('aud-status-label');
  lbl.textContent = 'MANUAL PIPE CHECK';
  dot.style.background = '#ff8f00';
}
` + html.slice(audLaunchStart);
  }
  const audPlayStart = html.indexOf('function audPlayToggle() {');
  const audSeekStart = html.indexOf('function audSeek(', audPlayStart);
  if (audPlayStart >= 0 && audSeekStart > audPlayStart) {
    html = html.slice(0, audPlayStart) + `function audPlayToggle() {
  var out = document.getElementById('aud-wave-empty');
  if (out) out.style.display = 'flex';
  var empty = document.querySelector('#aud-wave-empty span');
  if (empty) empty.textContent = 'PLAYBACK REQUIRES AUDACITY PIPE';
}
` + html.slice(audSeekStart);
  }
  const audTrackStart = html.indexOf('function audOpenTrack(');
  const audActionStart = html.indexOf('function audAction(', audTrackStart);
  if (audTrackStart >= 0 && audActionStart > audTrackStart) {
    html = html.slice(0, audTrackStart) + `function audOpenTrack(id) {
  var empty = document.querySelector('#aud-wave-empty span');
  if (empty) empty.textContent = 'LIBRARY INDEX NOT CONNECTED';
  var wave = document.getElementById('aud-wave-empty');
  if (wave) wave.style.display = 'flex';
}
` + html.slice(audActionStart);
  }
  const audActionBlockStart = html.indexOf('function audAction(');
  const heroFeedStart = html.indexOf('// ── HERO FEED ──', audActionBlockStart);
  if (audActionBlockStart >= 0 && heroFeedStart > audActionBlockStart) {
    html = html.slice(0, audActionBlockStart) + `function audAction(action) {
  if (typeof window.show === 'function') window.show('Connect the Audacity mod-script-pipe before using editor actions.');
}
function audRunPipe() {
  if (typeof window.show === 'function') window.show('Audacity mod-script-pipe is not connected; command was not sent.');
}
function audClearPipe() {
  var cmd = document.getElementById('aud-pipe-cmd');
  var out = document.getElementById('aud-pipe-output');
  if (cmd) cmd.value = '';
  if (out) out.textContent = 'pipe output...';
}
function audExportToLibrary() {
  if (typeof window.show === 'function') window.show('Connect Audacity before exporting to the local library.');
}

` + html.slice(heroFeedStart);
  }
  const honestScript = `<script>
(function () {
  function notify(message) {
    if (typeof window.show === 'function') window.show(message);
    else console.info(message);
  }
  var aceWave = document.getElementById('ace-waveform');
  var acePlay = document.getElementById('ace-play-btn');
  if (aceWave) {
    aceWave.removeAttribute('onclick');
    aceWave.style.cursor = 'default';
    aceWave.setAttribute('aria-label', 'No completed local WAN2GP output');
  }
  if (acePlay) {
    acePlay.removeAttribute('onclick');
    acePlay.setAttribute('aria-disabled', 'true');
    acePlay.style.opacity = '0.45';
    acePlay.onclick = function () { notify('Generate a real WAN2GP job before playback is available.'); };
  }
  var aceLabel = document.getElementById('ace-waveform-label');
  if (aceLabel) aceLabel.textContent = 'NO COMPLETED LOCAL OUTPUT';
  var generatorBody = document.getElementById('generator-body');
  var settingsMenu = document.querySelector('.nana-settings-menu');
  if (generatorBody && settingsMenu) {
    settingsMenu.open = false;
    generatorBody.classList.remove('settings-open');
    settingsMenu.addEventListener('toggle', function () { generatorBody.classList.toggle('settings-open', settingsMenu.open); });
  }
  var generatorSection = document.getElementById('generator');
  if (generatorSection) generatorSection.style.marginTop = '0';
  var lipsyncSection = document.getElementById('tool-lipsync');
  var lipsyncBody = document.getElementById('tool-lipsync-body');
  if (lipsyncSection) {
    lipsyncSection.style.marginTop = '0';
    lipsyncSection.style.paddingTop = '0';
  }
  if (lipsyncBody) {
    lipsyncBody.classList.add('minimized');
    var lipsyncToggle = lipsyncBody.previousElementSibling && lipsyncBody.previousElementSibling.querySelector('.minimize-btn');
    if (lipsyncToggle) {
      lipsyncToggle.innerHTML = '&#43;';
      lipsyncToggle.setAttribute('aria-label', 'Expand Wav2Lip Lip-Sync');
      lipsyncToggle.title = 'Expand';
    }
  }
})();
</script>`;
  html = html.replace('</body>', honestScript + '\n</body>');
  return html;
}
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
  response.set('Cache-Control', 'no-store, max-age=0');
  response.type('html').send(prepareNanaStudioHtml(await readFile(nanaStudioSource, 'utf8')));
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
