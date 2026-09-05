const COMMON_MOTIONS = new Set([
  'none', 'fade-up', 'fade-down', 'fade-in-big', 'slide-left', 'slide-right',
  'scale-in', 'snap-pop', 'hero-strike', 'mask-wipe', 'blur-rise', 'drop-in',
  'rise-fade', 'flip-in-x', 'flip-in-y', 'rotate-in',
]);

const COMMON_EFFECTS = new Set(['none', 'chrome-edge', 'glass-depth', 'soft-shadow']);
const NON_RENDERED_INTERACTIONS = new Set(['hover-pulse', 'confirm-flash', 'focus-glow']);

export const runtimeCapabilities = Object.freeze({
  hyperframes: {motions: [...COMMON_MOTIONS], micros: ['none'], effects: [...COMMON_EFFECTS]},
  remotion: {motions: [...COMMON_MOTIONS], micros: ['none'], effects: [...COMMON_EFFECTS]},
});

const changedFilters = (filters = {}) =>
  Number(filters.brightness ?? 1) !== 1 || Number(filters.contrast ?? 1) !== 1 ||
  Number(filters.saturate ?? 1) !== 1 || Number(filters.blur ?? 0) !== 0 ||
  Number(filters.hue ?? 0) !== 0 || Number(filters.grayscale ?? 0) !== 0 ||
  Number(filters.sepia ?? 0) !== 0 || Number(filters.invert ?? 0) !== 0;

export function analyzeRuntimeCompatibility(project, runtime) {
  const capabilities = runtimeCapabilities[runtime];
  if (!capabilities) throw new Error(`Unknown runtime: ${runtime}`);
  const motions = new Set(capabilities.motions);
  const micros = new Set(capabilities.micros);
  const effects = new Set(capabilities.effects);
  const differences = [];
  const notes = [];
  const add = (kind, value, scene, block, detail) => differences.push({kind, value, scene, block, detail});

  for (const [sceneIndex, scene] of (project.scenes || []).entries()) {
    const sceneName = scene.name || `Scene ${sceneIndex + 1}`;
    for (const effect of scene.effects || []) {
      add('scene-effect', effect.effect || 'unknown', sceneName, effect.label || null, 'Timeline FX clips are browser-preview only.');
    }
    if ((scene.audio || []).length) {
      add('synth-audio', `${scene.audio.length} cue(s)`, sceneName, null, 'Built-in synthesized cues are not yet mixed into production renders.');
    }
    for (const [blockIndex, block] of (scene.blocks || []).entries()) {
      const blockName = block.content || block.id || `Block ${blockIndex + 1}`;
      const motion = block.motion || 'none';
      const micro = block.micro || 'none';
      const effect = block.effect || 'none';
      if (!motions.has(motion)) add('motion', motion, sceneName, blockName, 'Entrance motion will render as a plain fade.');
      if (!micros.has(micro) && !NON_RENDERED_INTERACTIONS.has(micro)) add('micro', micro, sceneName, blockName, 'Continuous micro-animation will not appear.');
      if (NON_RENDERED_INTERACTIONS.has(micro)) notes.push({kind: 'interaction', value: micro, scene: sceneName, block: blockName, detail: 'Interactive-only state is intentionally absent from video.'});
      if (!effects.has(effect)) add('effect', effect, sceneName, blockName, 'The browser styling effect will not appear.');
      if (block.type === 'type') add('typewriter', 'type-on text', sceneName, blockName, 'Text will appear whole instead of typing on.');
      if (block.type === 'svg') add('generated-svg', 'inline vector', sceneName, blockName, 'The generated browser vector is not reproduced.');
      if (block.type === 'media') add('media-placeholder', 'media placeholder', sceneName, blockName, 'Placeholder media has no production asset.');
      if (['image', 'video'].includes(block.type) && changedFilters(block.filters)) add('media-filters', 'image adjustments', sceneName, blockName, 'Brightness, colour and blur adjustments will not be applied.');
      if (block.type === 'video' && Number(block.in || 0) !== 0) add('video-trim', `${block.in}ms source offset`, sceneName, blockName, 'The source trim-in is not reproduced by this runtime.');
      if (block.audioEnabled) add('bound-audio', 'block sound cue', sceneName, blockName, 'The block-triggered synth sound is browser-preview only.');
    }
  }

  const grouped = differences.reduce((result, item) => {
    const key = `${item.kind}:${item.value}`;
    const existing = result.get(key);
    if (existing) existing.occurrences += 1;
    else result.set(key, {...item, occurrences: 1});
    return result;
  }, new Map());

  return {
    runtime,
    exact: differences.length === 0,
    differenceCount: differences.length,
    differences: [...grouped.values()],
    notes,
    capabilities,
  };
}

export function assertRuntimeApproval(project, runtime, allowDifferences = false) {
  const report = analyzeRuntimeCompatibility(project, runtime);
  if (!report.exact && !allowDifferences) {
    const error = new Error(`${runtime} would change ${report.differenceCount} project feature(s). Review the compatibility report and choose “Render with listed differences” to continue.`);
    error.code = 'RUNTIME_DIFFERENCES_NOT_APPROVED';
    error.report = report;
    throw error;
  }
  return report;
}
