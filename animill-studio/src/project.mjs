export const ASPECTS = {
  mobile_9_16: [1080, 1920, '9:16'],
  desktop_16_9: [1920, 1080, '16:9'],
  square_1_1: [1080, 1080, '1:1'],
  portrait_4_5: [1080, 1350, '4:5'],
  web_21_9: [2560, 1080, '21:9'],
};

export function validateProject(value) {
  if (!value || typeof value !== 'object') throw new Error('ANIMILL project must be an object');
  if (!Array.isArray(value.scenes) || value.scenes.length === 0) throw new Error('ANIMILL project needs at least one scene');
  for (const [index, scene] of value.scenes.entries()) {
    if (!scene || typeof scene !== 'object') throw new Error(`Scene ${index + 1} must be an object`);
    if (!Number.isFinite(Number(scene.duration)) || Number(scene.duration) <= 0) throw new Error(`Scene ${index + 1} needs a positive duration`);
    if (!Array.isArray(scene.blocks)) scene.blocks = [];
  }
  return value;
}

export function projectSize(project) {
  return ASPECTS[project.aspect] || ASPECTS.mobile_9_16;
}

export function projectFps(project) {
  const fps = Number(project.fps || 30);
  return Number.isFinite(fps) ? Math.max(1, Math.min(120, Math.round(fps))) : 30;
}

export function projectDurationMs(project) {
  return project.scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
}

export function assertPortableAssets(project) {
  const offenders = [];
  for (const [sceneIndex, scene] of project.scenes.entries()) {
    for (const block of scene.blocks || []) {
      if (typeof block.src === 'string' && block.src.startsWith('blob:')) {
        offenders.push(`scene ${sceneIndex + 1}: ${block.content || block.id || block.type}`);
      }
    }
    const soundtrack = scene.soundtrack;
    if (soundtrack && typeof soundtrack.src === 'string' && soundtrack.src.startsWith('blob:')) {
      offenders.push(`scene ${sceneIndex + 1}: soundtrack`);
    }
  }
  if (offenders.length) {
    throw new Error(`Renderer cannot read browser-only blob URLs. Re-import these assets as embedded or server files: ${offenders.join(', ')}`);
  }
}
