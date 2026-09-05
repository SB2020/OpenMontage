import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';

type Block = Record<string, any>;
type Scene = {name?: string; duration: number; themeBg?: string; blocks: Block[]; soundtrack?: Record<string, any>};
type Project = {name?: string; aspect?: string; fps?: number; scenes: Scene[]};
export type AnimillProps = {project: Project};

const aspectDimensions: Record<string, [number, number]> = {
  mobile_9_16: [1080, 1920], desktop_16_9: [1920, 1080], square_1_1: [1080, 1080],
  portrait_4_5: [1080, 1350], web_21_9: [2560, 1080],
};
const backgrounds: Record<string, [string, string]> = {
  gold: ['#241804', '#070502'], cyber: ['#0a1830', '#02060c'], noir: ['#1c1c20', '#0a0a0c'],
  vapor: ['#5a1a44', '#1a0726'], brutal: ['#0c0c0c', '#0c0c0c'], frost: ['#0e221a', '#06100c'],
  holo: ['#141030', '#05080f'], sunset: ['#5a2418', '#2a0f0a'], terminal: ['#06160e', '#020604'],
  aurora: ['#0c1024', '#04100c'], chrome: ['#1e2228', '#0a0c10'], '': ['#11141a', '#07090d'],
};

export const dimensionsFor = (aspect?: string) => aspectDimensions[aspect || ''] || aspectDimensions.mobile_9_16;
export const durationFramesFor = (project: Project, fps: number) => Math.max(1, project.scenes.reduce((n, scene) => n + Math.ceil(Number(scene.duration || 0) / 1000 * fps), 0));

function motion(block: Block, frame: number, fps: number) {
  const transitionFrames = Math.max(1, Math.min(Math.ceil(Number(block.dur || 1000) / 1000 * fps), Math.ceil(Number(block.transitionDuration || 700) / 1000 * fps)));
  const p = interpolate(frame, [0, transitionFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const eased = 1 - Math.pow(1 - p, 3);
  const state = {x: 0, y: 0, scale: 1, opacity: Number(block.opacity ?? 1), rotateX: 0, rotateY: 0, rotate: Number(block.rotation || 0), blur: 0};
  switch (block.motion) {
    case 'fade-up': state.y = (1 - eased) * 54; state.opacity *= eased; break;
    case 'fade-down': state.y = (1 - eased) * -54; state.opacity *= eased; break;
    case 'fade-in-big': state.y = (1 - eased) * 220; state.opacity *= eased; break;
    case 'slide-left': state.x = (1 - eased) * -90; state.opacity *= eased; break;
    case 'slide-right': state.x = (1 - eased) * 90; state.opacity *= eased; break;
    case 'scale-in': state.scale = 0.8 + eased * 0.2; state.opacity *= eased; break;
    case 'snap-pop': state.scale = 0.8 + eased * 0.2; state.opacity *= Math.min(1, eased * 4); break;
    case 'hero-strike': state.scale = 0.9 + eased * 0.1; state.y = (1 - eased) * 26; state.opacity *= eased; break;
    case 'mask-wipe': state.x = (1 - eased) * -40; state.opacity *= eased; break;
    case 'blur-rise': state.y = (1 - eased) * 80; state.blur = (1 - eased) * 10; state.opacity *= eased; break;
    case 'drop-in': state.y = (1 - eased) * -180; state.opacity *= Math.min(1, eased * 3); break;
    case 'rise-fade': state.y = (1 - eased) * 130; state.opacity *= eased; break;
    case 'flip-in-x': state.rotateX = (1 - eased) * 90; state.opacity *= eased; break;
    case 'flip-in-y': state.rotateY = (1 - eased) * 90; state.opacity *= eased; break;
    case 'rotate-in': state.rotate = Number(block.rotation || 0) + (1 - eased) * -220; state.scale = 0.6 + eased * 0.4; state.opacity *= eased; break;
  }
  return state;
}

function typography(block: Block) {
  const fallback: Record<string, {size: number; weight: number; spacing: string; lineHeight: number}> = {
    hero: {size: 68, weight: 900, spacing: '-0.06em', lineHeight: 0.87},
    mask: {size: 54, weight: 900, spacing: '-0.035em', lineHeight: 1.05},
    type: {size: 28, weight: 800, spacing: 'normal', lineHeight: 1.05},
    caption: {size: 28, weight: 850, spacing: 'normal', lineHeight: 1.14},
    annotation: {size: 21, weight: 900, spacing: '0.06em', lineHeight: 1.05},
    counter: {size: 64, weight: 900, spacing: 'normal', lineHeight: 1.05},
  };
  const defaults = fallback[block.type] || {size: 28, weight: 900, spacing: 'normal', lineHeight: 1.05};
  return {fontSize: Number(block.fontSize ?? defaults.size), fontWeight: Number(block.weight ?? defaults.weight), letterSpacing: block.letterSpacing ?? defaults.spacing, lineHeight: block.lineHeight ?? defaults.lineHeight};
}

function effectStyle(block: Block): React.CSSProperties {
  if (block.effect === 'chrome-edge') return {textShadow: '0 1px 0 rgba(255,255,255,.6), 0 -1px 0 rgba(0,0,0,.55), 0 0 22px rgba(242,201,104,.32)'};
  return {};
}

const BlockLayer: React.FC<{block: Block}> = ({block}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = motion(block, frame, fps);
  const text = typography(block);
  const common: React.CSSProperties = {
    position: 'absolute', left: Number(block.x || 0), top: Number(block.y || 0), width: Number(block.w || 400),
    minHeight: Number(block.h || 60), zIndex: Number(block.z || 1), opacity: m.opacity,
    color: block.color || '#fff', fontFamily: block.font || 'Inter, Arial, sans-serif',
    ...text, display: 'block', textAlign: 'left', whiteSpace: 'pre-wrap',
    overflow: 'visible', borderRadius: Number(block.radius || 0), mixBlendMode: block.blend || 'normal',
    transform: `perspective(1200px) translate(${m.x}px,${m.y}px) rotate(${m.rotate}deg) rotateX(${m.rotateX}deg) rotateY(${m.rotateY}deg) scale(${Number(block.scale || 1) * m.scale})`,
    filter: m.blur ? `blur(${m.blur}px)` : undefined,
  };
  if (block.type === 'shape') return <div style={{...common, height: Number(block.h || 100), background: block.color || '#181820'}} />;
  if (block.type === 'image' && block.src) return <Img src={block.src} style={{...common, height: Number(block.h || 400), objectFit: block.fit || 'cover'}} />;
  if (block.type === 'video' && block.src) return <OffthreadVideo src={block.src} muted={Boolean(block.muted)} volume={Number(block.vol ?? 1)} style={{...common, height: Number(block.h || 400), objectFit: block.fit || 'cover'}} />;
  return <div style={common}><span style={{display: 'inline-flex', alignItems: 'center', padding: '.08em .16em', minWidth: 18, minHeight: 18, ...effectStyle(block)}}>{String(block.content || '')}</span></div>;
};

const SceneLayer: React.FC<{scene: Scene}> = ({scene}) => {
  const {fps} = useVideoConfig();
  const palette = backgrounds[scene.themeBg || ''] || backgrounds[''];
  return <AbsoluteFill style={{background: `linear-gradient(145deg, ${palette[1]}, ${palette[0]})`}}>
    {(scene.blocks || []).map((block, index) => {
      const from = Math.max(0, Math.floor(Number(block.start || 0) / 1000 * fps));
      const duration = Math.max(1, Math.ceil(Number(block.dur || scene.duration) / 1000 * fps));
      return <Sequence key={block.id || index} from={from} durationInFrames={duration} premountFor={fps}><BlockLayer block={block} /></Sequence>;
    })}
    {scene.soundtrack && (scene.soundtrack.src || scene.soundtrack.url) ? <Sequence from={Math.max(0, Math.floor(Number(scene.soundtrack.start || 0) / 1000 * fps))}><Audio src={scene.soundtrack.src || scene.soundtrack.url} volume={Number(scene.soundtrack.vol ?? 0.8)} startFrom={Math.max(0, Math.floor(Number(scene.soundtrack.in || 0) / 1000 * fps))} /></Sequence> : null}
  </AbsoluteFill>;
};

export const AnimillComposition: React.FC<AnimillProps> = ({project}) => {
  const {fps} = useVideoConfig();
  let offset = 0;
  return <AbsoluteFill style={{background: '#07090d'}}>{project.scenes.map((scene, index) => {
    const duration = Math.max(1, Math.ceil(Number(scene.duration || 0) / 1000 * fps));
    const from = offset; offset += duration;
    return <Sequence key={`${scene.name || 'scene'}-${index}`} from={from} durationInFrames={duration} premountFor={fps}><SceneLayer scene={scene} /></Sequence>;
  })}</AbsoluteFill>;
};
