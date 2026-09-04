import {projectDurationMs, projectFps, projectSize, validateProject} from './project.mjs';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const js = (value) => JSON.stringify(value).replace(/<\//g, '<\\/');

const backgrounds = {
  gold: ['#241804', '#070502'], cyber: ['#0a1830', '#02060c'], noir: ['#1c1c20', '#0a0a0c'],
  vapor: ['#5a1a44', '#1a0726'], brutal: ['#0c0c0c', '#0c0c0c'], frost: ['#0e221a', '#06100c'],
  holo: ['#141030', '#05080f'], sunset: ['#5a2418', '#2a0f0a'], terminal: ['#06160e', '#020604'],
  aurora: ['#0c1024', '#04100c'], chrome: ['#1e2228', '#0a0c10'], '': ['#11141a', '#07090d'],
};

function motionFrom(block) {
  switch (block.motion) {
    case 'fade-up': return {opacity: 0, y: 48};
    case 'fade-down': return {opacity: 0, y: -48};
    case 'fade-in-big': return {opacity: 0, y: 200};
    case 'slide-left': return {opacity: 0, x: -80};
    case 'slide-right': return {opacity: 0, x: 80};
    case 'scale-in': return {opacity: 0, scale: 0.84};
    case 'snap-pop': return {opacity: 0, scale: 0.5};
    case 'hero-strike': return {opacity: 0, scale: 0.92, y: 22};
    case 'mask-wipe': return {opacity: 0, x: -32};
    case 'blur-rise': return {opacity: 0, y: 70, filter: 'blur(16px)'};
    case 'drop-in': return {opacity: 0, y: -160};
    case 'rise-fade': return {opacity: 0, y: 120};
    case 'flip-in-x': return {opacity: 0, rotationX: -90};
    case 'flip-in-y': return {opacity: 0, rotationY: -90};
    case 'rotate-in': return {opacity: 0, rotation: -45, scale: 0.85};
    default: return null;
  }
}

function typographyFor(block) {
  const defaults = {
    hero: {size: 68, weight: 900, spacing: '-0.06em', lineHeight: 0.87},
    mask: {size: 54, weight: 900, spacing: '-0.035em', lineHeight: 1.05},
    type: {size: 28, weight: 800, spacing: 'normal', lineHeight: 1.05},
    caption: {size: 28, weight: 850, spacing: 'normal', lineHeight: 1.14},
    annotation: {size: 21, weight: 900, spacing: '0.06em', lineHeight: 1.05},
    counter: {size: 64, weight: 900, spacing: 'normal', lineHeight: 1.05},
  }[block.type] || {size: 28, weight: 900, spacing: 'normal', lineHeight: 1.05};
  return {
    size: Number(block.fontSize ?? defaults.size),
    weight: Number(block.weight ?? defaults.weight),
    spacing: block.letterSpacing ?? defaults.spacing,
    lineHeight: block.lineHeight ?? defaults.lineHeight,
  };
}

function blockMarkup(block, globalStart, duration, index) {
  const id = `animill-block-${index}`;
  const z = Number(block.z || index + 1);
  const rotatedEntrance = ['flip-in-x', 'flip-in-y', 'rotate-in'].includes(block.motion);
  const common = `id="${id}" class="clip animill-block animill-${esc(block.type || 'hero')}" data-start="${globalStart.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="${Math.max(1, z)}"${rotatedEntrance ? ' data-layout-allow-occlusion' : ''}`;
  const typography = typographyFor(block);
  const style = [
    `left:${Number(block.x || 0)}px`, `top:${Number(block.y || 0)}px`, `width:${Number(block.w || 400)}px`,
    `min-height:${Number(block.h || 60)}px`, `z-index:${z}`, `opacity:${block.opacity ?? 1}`,
    `color:${esc(block.color || '#ffffff')}`, `font-family:${esc(block.font || 'Inter')}`,
    `font-size:${typography.size}px`, `font-weight:${typography.weight}`, `letter-spacing:${esc(typography.spacing)}`,
    `line-height:${typography.lineHeight}`, `transform:rotate(${Number(block.rotation || 0)}deg) scale(${Number(block.scale || 1)})`,
    `border-radius:${Number(block.radius || 0)}px`, `mix-blend-mode:${esc(block.blend || 'normal')}`,
  ].join(';');
  const src = esc(block.src || '');
  if (block.type === 'image' && src) return `<img ${common} src="${src}" alt="${esc(block.content || '')}" style="${style};height:${Number(block.h || 400)}px;object-fit:${esc(block.fit || 'cover')}" />`;
  if (block.type === 'video' && src) return `<video ${common} src="${src}" style="${style};height:${Number(block.h || 400)}px;object-fit:${esc(block.fit || 'cover')}" ${block.muted ? 'muted' : ''} ${block.loop ? 'loop' : ''} playsinline></video>`;
  if (block.type === 'shape') return `<div ${common} style="${style};height:${Number(block.h || 100)}px;background:${esc(block.color || '#181820')}"></div>`;
  const effectClass = block.effect && block.effect !== 'none' ? ` animill-effect-${esc(block.effect)}` : '';
  return `<div ${common} style="${style}"><span class="animill-content${effectClass}">${esc(block.content || '')}</span></div>`;
}

export function toHyperframesHtml(input) {
  const project = validateProject(structuredClone(input));
  const [width, height] = projectSize(project);
  const fps = projectFps(project);
  const duration = projectDurationMs(project) / 1000;
  let offset = 0;
  let blockIndex = 0;
  const layers = [];
  const tweens = [];

  project.scenes.forEach((scene, sceneIndex) => {
    const sceneDuration = Number(scene.duration) / 1000;
    const palette = backgrounds[scene.themeBg || ''] || backgrounds[''];
    layers.push(`<div id="animill-scene-${sceneIndex}" class="clip animill-scene-bg" data-start="${offset.toFixed(3)}" data-duration="${sceneDuration.toFixed(3)}" data-track-index="0" style="background:linear-gradient(145deg,${palette[1]},${palette[0]})"></div>`);
    for (const block of scene.blocks || []) {
      const start = offset + Number(block.start || 0) / 1000;
      const blockDuration = Math.max(0.034, Number(block.dur || scene.duration) / 1000);
      const index = blockIndex++;
      layers.push(blockMarkup(block, start, blockDuration, index));
      const from = motionFrom(block);
      if (from) {
        const tweenDuration = Math.min(blockDuration, Math.max(0.25, Number(block.transitionDuration || 700) / 1000));
        tweens.push(`tl.fromTo(${js(`#animill-block-${index}`)}, ${js(from)}, {opacity:${block.opacity ?? 1},x:0,y:0,scale:1,rotation:0,rotationX:0,rotationY:0,filter:'none',duration:${tweenDuration.toFixed(3)},ease:'power3.out'}, ${start.toFixed(3)});`);
      }
    }
    const soundtrack = scene.soundtrack;
    const soundtrackSrc = soundtrack?.src || soundtrack?.url;
    if (soundtrackSrc) {
      const audioStart = offset + Number(soundtrack.start || 0) / 1000;
      const audioDuration = Math.min(sceneDuration, Number(soundtrack.dur || scene.duration) / 1000);
      layers.push(`<audio id="animill-audio-${sceneIndex}" data-start="${audioStart.toFixed(3)}" data-duration="${audioDuration.toFixed(3)}" data-track-index="999" data-volume="${Number(soundtrack.vol ?? 0.8)}" src="${esc(soundtrackSrc)}"></audio>`);
    }
    offset += sceneDuration;
  });

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(project.name || 'ANIMILL')}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}
#animill{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:#07090d;transform-origin:0 0}
.animill-scene-bg{position:absolute;inset:0;width:${width}px;height:${height}px}
.animill-block{position:absolute;display:block;text-align:left;white-space:pre-wrap;overflow:visible;transform-origin:center center}
.animill-content{display:inline-flex;align-items:center;padding:.08em .16em;min-width:18px;min-height:18px}
.animill-effect-chrome-edge{text-shadow:0 1px 0 rgba(255,255,255,.6),0 -1px 0 rgba(0,0,0,.55),0 0 22px rgba(242,201,104,.32)}
.animill-shape{display:block}
</style></head><body>
<div id="animill" data-composition-id="animill" data-start="0" data-duration="${duration.toFixed(3)}" data-width="${width}" data-height="${height}" data-fps="${fps}">
${layers.join('\n')}
</div>
<script src="./gsap.min.js"></script>
<script>
const tl=gsap.timeline({paused:true});
${tweens.join('\n')}
window.__timelines=window.__timelines||{};window.__timelines.animill=tl;
</script></body></html>`;
}

export function hyperframesManifest(project) {
  const [width, height] = projectSize(project);
  return {
    source: 'ANIMILL',
    sourceVersion: project.version || '6.5',
    runtime: 'hyperframes',
    composition: 'animill',
    fps: projectFps(project),
    width,
    height,
    durationMs: projectDurationMs(project),
  };
}
