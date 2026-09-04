import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateProject} from './project.mjs';

export function projectSlug(value) {
  const slug = String(value || 'animill-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return slug || 'animill-project';
}

function sceneType(scene) {
  const types = new Set((scene.blocks || []).map(block => block.type));
  if (types.has('video')) return 'broll';
  if (types.has('image')) return 'generated';
  if ([...types].some(type => ['shape', 'svg', 'glyph'].includes(type))) return 'animation';
  return 'text_card';
}

function sceneDescription(scene) {
  const copy = (scene.blocks || []).filter(block => block.content && !['shape', 'image', 'video'].includes(block.type)).map(block => String(block.content)).slice(0, 5);
  return copy.join(' · ') || scene.name || 'ANIMILL authored scene';
}

function motionForScene(scene) {
  const motion = (scene.blocks || []).map(block => block.motion).find(value => value && value !== 'none');
  const map = {'slide-left': 'tracking_left', 'slide-right': 'tracking_right', 'fade-up': 'tilt_up', 'fade-down': 'tilt_down', 'scale-in': 'dolly_in', 'zoom-out': 'dolly_out', 'mask-wipe': 'whip_pan'};
  return map[motion] || 'static';
}

export function toOpenMontageArtifacts(rawProject, renderRuntime = 'hyperframes') {
  const project = validateProject(structuredClone(rawProject));
  if (!['hyperframes', 'remotion'].includes(renderRuntime)) throw new Error('renderRuntime must be hyperframes or remotion');
  let cursor = 0;
  const scenes = project.scenes.map((scene, index) => {
    const start = cursor;
    const duration = Number(scene.duration || 0) / 1000;
    cursor += duration;
    return {
      id: scene.id || `scene-${index + 1}`,
      type: sceneType(scene),
      description: sceneDescription(scene),
      start_seconds: start,
      end_seconds: cursor,
      movement: motionForScene(scene),
      transition_in: index ? 'cut' : 'none',
      transition_out: index === project.scenes.length - 1 ? 'none' : 'cut',
      shot_language: {camera_movement: motionForScene(scene)},
      shot_intent: index === 0 ? 'Hook attention and establish the visual promise' : index === project.scenes.length - 1 ? 'Resolve the authored sequence' : 'Advance the authored narrative beat',
      narrative_role: index === 0 ? 'introduce_subject' : index === project.scenes.length - 1 ? 'resolution' : 'deliver_payload',
      information_role: sceneDescription(scene),
      hero_moment: Boolean((scene.blocks || []).some(block => ['hero', 'counter'].includes(block.type))),
      required_assets: (scene.blocks || []).filter(block => ['image', 'video'].includes(block.type)).map(block => ({type: block.type, description: block.content || block.src || block.type, source: 'provided'})),
    };
  });
  const cuts = project.scenes.map((scene, index) => ({
    id: `animill-cut-${index + 1}`,
    source: `artifacts/animill-project.json#${scene.id || `scene-${index + 1}`}`,
    in_seconds: 0,
    out_seconds: Number(scene.duration || 0) / 1000,
    layer: 'primary',
    transform: {scale: 1, position: 'center', animation: 'animill-authored'},
    transition_in: index ? 'cut' : 'none',
    transition_out: index === project.scenes.length - 1 ? 'none' : 'cut',
    reason: 'Authored in ANIMILL and handed to the locked OpenMontage composition runtime',
  }));
  return {
    scenePlan: {version: '1.0', style_playbook: 'animill-authored', scenes, metadata: {source: 'ANIMILL 7', project_id: project.id, total_duration_seconds: cursor}},
    editDecisions: {version: '1.0', cuts, render_runtime: renderRuntime, renderer_family: 'animation-first', slideshow_risk_score: {average: 0, verdict: 'strong'}, metadata: {source: 'ANIMILL 7', runtime_locked: true}},
    animillProject: project,
    sourceManifest: {
      version: '1.0',
      sources: (project.assets || []).map(asset => ({id: asset.id, name: asset.name, type: asset.type, url: asset.url || null, source_url: asset.sourceUrl || null, rights: asset.rights || 'unknown', commercial: Boolean(asset.commercial)})),
    },
  };
}

export async function exportToOpenMontage(rawProject, renderRuntime, openMontageRoot) {
  const artifacts = toOpenMontageArtifacts(rawProject, renderRuntime);
  const slug = projectSlug(artifacts.animillProject.name);
  const projectRoot = path.join(openMontageRoot, 'projects', slug);
  const artifactRoot = path.join(projectRoot, 'artifacts');
  await mkdir(artifactRoot, {recursive: true});
  const files = {
    scene_plan: path.join(artifactRoot, 'scene_plan.json'),
    edit_decisions: path.join(artifactRoot, 'edit_decisions.json'),
    animill_project: path.join(artifactRoot, 'animill-project.json'),
    source_manifest: path.join(artifactRoot, 'animill-sources.json'),
  };
  await Promise.all([
    writeFile(files.scene_plan, JSON.stringify(artifacts.scenePlan, null, 2), 'utf8'),
    writeFile(files.edit_decisions, JSON.stringify(artifacts.editDecisions, null, 2), 'utf8'),
    writeFile(files.animill_project, JSON.stringify(artifacts.animillProject, null, 2), 'utf8'),
    writeFile(files.source_manifest, JSON.stringify(artifacts.sourceManifest, null, 2), 'utf8'),
  ]);
  return {projectSlug: slug, projectRoot, artifactRoot, renderRuntime, files};
}

