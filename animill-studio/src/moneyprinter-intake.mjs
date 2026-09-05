const ASPECTS = {
  '16:9': {aspect: 'desktop_16_9', width: 1920, height: 1080},
  '9:16': {aspect: 'mobile_9_16', width: 1080, height: 1920},
  '1:1': {aspect: 'square_1_1', width: 1080, height: 1080},
};

function text(value, fallback = '') {
  return value == null ? fallback : String(value).trim();
}

function termsFrom(value) {
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean);
  return text(value).split(/[,，\n]/).map(item => item.trim()).filter(Boolean);
}

function sentenceSegments(script) {
  const segments = script.match(/[^.!?。！？\n]+[.!?。！？]?/g)?.map(item => item.trim()).filter(Boolean) || [];
  return segments.length ? segments : [script];
}

function estimatedDurationMs(value) {
  const words = text(value).split(/\s+/).filter(Boolean).length;
  return Math.max(1800, Math.min(15_000, Math.round((Math.max(words, 5) / 150) * 60_000)));
}

export function parseSrt(value) {
  const timestamp = token => {
    const match = token.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    return match ? (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000 + Number(match[4].padEnd(3, '0').slice(0, 3))) : null;
  };
  return text(value).split(/\r?\n\s*\r?\n/).map(chunk => {
    const lines = chunk.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex(line => line.includes('-->'));
    if (timingIndex < 0) return null;
    const [startToken, endToken] = lines[timingIndex].split('-->').map(part => part.trim());
    const start = timestamp(startToken), end = timestamp(endToken);
    const caption = lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    return start == null || end == null || end <= start || !caption ? null : {start, end, text: caption};
  }).filter(Boolean);
}

function mediaFrom(bundle, params) {
  const raw = bundle.materials || bundle.video_materials || params.video_materials || [];
  return (Array.isArray(raw) ? raw : []).map((item, index) => {
    const value = typeof item === 'string' ? {url: item} : item || {};
    const url = text(value.url || value.path || value.file);
    if (!url) return null;
    const type = /\.(png|jpe?g|gif|webp)(?:$|[?#])/i.test(url) ? 'image' : 'video';
    return {url, type, label: text(value.label || value.search_term, `Material ${index + 1}`), durationMs: Math.max(500, Number(value.duration || params.video_clip_duration || 5) * 1000)};
  }).filter(Boolean);
}

function sourceIds(bundle) {
  const sources = bundle.sources || bundle.animillContext?.sources || [];
  return (Array.isArray(sources) ? sources : []).map(source => source?.id).filter(Boolean);
}

export function moneyPrinterToAnimillSpec(rawBundle) {
  if (!rawBundle || typeof rawBundle !== 'object') throw new Error('MoneyPrinter intake must be an object');
  const bundle = rawBundle.moneyPrinter || rawBundle;
  const params = bundle.params && typeof bundle.params === 'object' ? bundle.params : {};
  const script = text(bundle.script || bundle.video_script || bundle.data?.script);
  if (!script) throw new Error('MoneyPrinter intake needs script or video_script text');
  const subject = text(params.video_subject || bundle.video_subject, 'MoneyPrinter story');
  const terms = termsFrom(bundle.search_terms || bundle.video_terms || params.video_terms);
  const profile = ASPECTS[text(params.video_aspect || bundle.video_aspect, '9:16')] || ASPECTS['9:16'];
  const materials = mediaFrom(bundle, params);
  const sources = bundle.sources || bundle.animillContext?.sources || [];
  const groundingIds = sourceIds(bundle);
  const provenance = {adapter: 'MoneyPrinterTurbo-Extended', taskId: text(bundle.task_id || bundle.taskId) || null, sourceIds: groundingIds};
  const srt = text(bundle.subtitleSrt || bundle.subtitle_srt);
  const subtitles = srt ? parseSrt(srt) : [];
  let scenes;

  if (subtitles.length) {
    const duration = Math.max(1000, subtitles.at(-1).end);
    const clipDuration = Math.max(1000, Number(params.video_clip_duration || 5) * 1000);
    const blocks = subtitles.map((subtitle, index) => ({
      id: `mpt-caption-${index + 1}`, type: 'caption', text: subtitle.text,
      x: Math.round(profile.width * .08), y: Math.round(profile.height * .72),
      w: Math.round(profile.width * .84), h: Math.round(profile.height * .18),
      start: subtitle.start, dur: subtitle.end - subtitle.start, fontSize: profile.height > profile.width ? 56 : 48,
      motion: 'fade-up', micro: 'none', effect: 'soft-shadow', audioEnabled: false,
      provenance, sourceIds: groundingIds,
    }));
    materials.forEach((material, index) => blocks.unshift({
      id: `mpt-media-${index + 1}`, type: material.type, text: material.label, src: material.url,
      x: 0, y: 0, w: profile.width, h: profile.height, z: -10 + index,
      start: index * clipDuration, dur: Math.min(material.durationMs, Math.max(1, duration - index * clipDuration)),
      motion: 'none', micro: 'none', effect: 'none', audioEnabled: false, fit: 'cover',
      provenance, sourceIds: groundingIds,
    }));
    scenes = [{name: subject, duration, blocks, audio: [], effects: []}];
  } else {
    const segments = sentenceSegments(script);
    scenes = segments.map((segment, index) => {
      const duration = estimatedDurationMs(segment);
      const material = materials[index % Math.max(1, materials.length)];
      const blocks = material ? [{
        id: `mpt-media-${index + 1}`, type: material.type, text: material.label, src: material.url,
        x: 0, y: 0, w: profile.width, h: profile.height, z: 0, start: 0, dur: duration,
        motion: 'none', micro: 'none', effect: 'none', audioEnabled: false, fit: 'cover',
        provenance, sourceIds: groundingIds,
      }] : [];
      blocks.push({
        id: `mpt-caption-${index + 1}`, type: index === 0 ? 'hero' : 'caption', text: segment,
        x: Math.round(profile.width * .08), y: Math.round(profile.height * (index === 0 ? .22 : .7)),
        w: Math.round(profile.width * .84), h: Math.round(profile.height * (index === 0 ? .28 : .18)), z: 10,
        start: 0, dur: duration, fontSize: profile.height > profile.width ? (index === 0 ? 76 : 54) : (index === 0 ? 86 : 46),
        motion: index === 0 ? 'mask-wipe' : 'fade-up', micro: 'none', effect: index === 0 ? 'chrome-edge' : 'soft-shadow', audioEnabled: false,
        provenance, sourceIds: groundingIds,
      });
      return {name: `${String(index + 1).padStart(2, '0')} · ${subject}`, duration, blocks, audio: [], effects: []};
    });
  }

  const audioUrl = text(bundle.audioUrl || bundle.audio_url || bundle.audio_file);
  if (audioUrl && scenes.length === 1) scenes[0].soundtrack = {id: 'mpt-audio', name: 'MoneyPrinter narration', src: audioUrl, start: 0, vol: Number(params.voice_volume ?? 1), muted: false, provenance};

  return {
    name: text(bundle.name, subject),
    aspect: profile.aspect,
    metadata: {source: 'MoneyPrinterTurbo-Extended', kind: 'content-generation', taskId: provenance.taskId, searchTerms: terms, params, provenance},
    sources: Array.isArray(sources) ? sources : [],
    scenes,
  };
}
