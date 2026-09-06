/* Functional repairs for the focused Generator + Wav2Lip surface. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['mode', 'engine', 'gender', 'orient', 'quality'];
  const key = 'animill.nana.generator.v1';
  const history = [], future = [];
  const prompt = $('gen-prompt');
  const status = document.createElement('div');
  status.id = 'nana-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.querySelector('.nana-settings-content').prepend(status);
  const tell = message => { status.textContent = message; };
  const snapshot = () => Object.fromEntries([...fields.map(k => [k, genState[k]]), ['prompt', prompt.value]]);
  let current = snapshot();
  function remember() {
    const next = snapshot();
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    history.push(current); if (history.length > 100) history.shift();
    future.length = 0; current = next;
  }
  function apply(value) {
    setGenMode(value.mode || 'lipsync');
    selectEngine(value.engine || 'veo3fast');
    setGenGender(value.gender || 'female');
    setGenOrient(value.orient || 'portrait');
    genState.quality = value.quality || '1080p';
    document.querySelectorAll('[onclick^="setGenQuality"]').forEach(el =>
      el.classList.toggle('active', el.textContent.trim().toLowerCase() === genState.quality));
    prompt.value = value.prompt || '';
    $('gen-prompt-chars').textContent = prompt.value.length + ' CHARS';
    current = snapshot(); syncPressed();
  }
  const download = (data, name) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.sectionAction = async (_, action) => {
    remember();
    try {
      if (action === 'undo' && history.length) { future.push(current); apply(history.pop()); tell('Undone.'); }
      else if (action === 'redo' && future.length) { history.push(current); apply(future.pop()); tell('Redone.'); }
      else if (action === 'copy') { await navigator.clipboard.writeText(prompt.value); tell('Prompt copied.'); }
      else if (action === 'save') { localStorage.setItem(key, JSON.stringify(snapshot())); tell('Settings and prompt saved locally. Media files must be selected again after reload.'); }
      else if (action === 'export') { download({format:'animill-nana-settings', version:1, ...snapshot()}, 'nana-settings.json'); tell('Settings exported.'); }
      else tell('Nothing to ' + action + '.');
    } catch (error) { tell('Could not ' + action + ': ' + error.message); }
  };
  window.resetPromptToDefault = () => { prompt.value = ''; $('gen-prompt-chars').textContent = '0 CHARS'; remember(); };
  window.setGenQuality = (quality, el) => {
    genState.quality = quality;
    document.querySelectorAll('[onclick^="setGenQuality"]').forEach(p => p.classList.toggle('active', p === el));
  };
  window.aiRewrite = () => tell('AI rewrite is unavailable: no rewrite provider is connected.');
  window.openNanaBanana = () => tell('Image generation is unavailable: upload a local character image.');
  // A pasted URL is not imported audio. Only mark loaded after a real decode.
  window.importSuno = async () => {
    let url;
    try { url = new URL($('gen-suno-url').value); } catch { tell('Paste a direct audio download URL, or upload an audio file.'); return; }
    if (!['http:', 'https:'].includes(url.protocol)) { tell('Use an HTTP(S) audio URL.'); return; }
    tell('Fetching audio…');
    try {
      const response = await fetch(url, {signal:AbortSignal.timeout(20000), credentials:'omit'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const blob = await response.blob();
      if (!blob.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac)$/i.test(url.pathname)) throw new Error('This link is a webpage, not downloadable audio');
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], url.pathname.split('/').pop() || 'imported-audio', {type:blob.type}));
      $('gen-audio-input').files = transfer.files;
      await loadGenAudio($('gen-audio-input'));
    } catch (error) { tell('Audio not imported: ' + error.message + '. Download the track and use Upload.'); }
  };
  let imageUrl, audioUrl, audioVersion = 0;
  const player = document.createElement('audio');
  player.controls = true; player.preload = 'metadata'; player.setAttribute('aria-label','Uploaded audio preview');
  player.style.width = '100%';
  $('gen-audio-loaded').append(player);
  window.loadGenImage = input => {
    const file = input.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { tell('Select an image file.'); return; }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = URL.createObjectURL(file);
    $('gen-img-preview').src = imageUrl; $('gen-img-preview').style.display = 'block';
    $('gen-img-empty').style.display = 'none'; $('gen-img-badge').style.display = '';
    $('gen-img-preview').alt = file.name;
    tell('Character image loaded: ' + file.name);
  };
  window.loadGenAudio = async input => {
    const file = input.files[0]; if (!file) return;
    const version = ++audioVersion;
    const context = new (window.AudioContext || window.webkitAudioContext)();
    tell('Decoding audio…');
    try {
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      if (version !== audioVersion) return;
      genState.audioBuffer = buffer; genState.waveData = buffer.getChannelData(0);
      genState.duration = buffer.duration; genState._viewDur = buffer.duration;
      genState._viewStart = 0; genState.selStart = 0;
      genState.selDur = Math.min(15, buffer.duration); genState.waveZoom = 1;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = URL.createObjectURL(file); player.src = audioUrl;
      $('gen-wave-audio-name').textContent = file.name;
      $('gen-audio-loaded').style.display = ''; $('gen-audio-empty').style.display = 'none';
      $('gen-wave-end-label').textContent = formatGenTime(buffer.duration);
      $('gen-wave-zoom-label').textContent = '1x';
      drawGenWaveform(genState.waveData, 0, genState.waveData.length); drawGenSel();
      tell('Audio ready: ' + file.name + ' · ' + buffer.duration.toFixed(1) + ' seconds.');
    } catch (error) { tell('Audio could not be decoded: ' + error.message); }
    finally { await context.close(); }
  };
  window.drawGenWaveform = (samples, start, end) => {
    const canvas = $('gen-wave-canvas'), width = Math.max(1, $('gen-wave-wrap').clientWidth);
    canvas.width = width; canvas.height = 56;
    const context = canvas.getContext('2d');
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
    context.beginPath();
    // Read the existing channel directly; no full-buffer copy on each zoom.
    const step = Math.max(1, Math.ceil((end - start) / width));
    for (let x = 0; x < width; x++) {
      let peak = 0;
      for (let i = start + x * step; i < Math.min(end, start + (x + 1) * step); i++) peak = Math.max(peak, Math.abs(samples[i] || 0));
      context.moveTo(x, 28 - peak * 25); context.lineTo(x, 28 + peak * 25);
    }
    context.stroke();
  };
  const selectTime = event => {
    const rect = $('gen-wave-wrap').getBoundingClientRect();
    const position = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    genState.selStart = Math.max(0, Math.min(genState.duration - genState.selDur, genState._viewStart + position * genState._viewDur));
    drawGenSel();
  };
  window.genWaveSelStart = event => { genWaveDragging = true; selectTime(event); };
  window.genWaveSelMove = event => { if (genWaveDragging) selectTime(event); };
  const wave = $('gen-wave-wrap');
  wave.setAttribute('role','slider'); wave.tabIndex = 0; wave.setAttribute('aria-label','Audio selection start');
  const originalDrawSelection = drawGenSel;
  window.drawGenSel = () => {
    originalDrawSelection();
    wave.setAttribute('aria-valuemin','0');
    wave.setAttribute('aria-valuemax', String(Math.max(0, genState.duration - genState.selDur)));
    wave.setAttribute('aria-valuenow',String(genState.selStart));
    wave.setAttribute('aria-valuetext',genState.selStart.toFixed(1) + ' seconds');
  };
  wave.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const max = Math.max(0, genState.duration - genState.selDur);
    genState.selStart = event.key === 'Home' ? 0 : event.key === 'End' ? max :
      Math.min(max, Math.max(0, genState.selStart + (event.key === 'ArrowRight' ? .5 : -.5)));
    drawGenSel();
  });
  window.addEventListener('mouseup', () => { genWaveDragging = false; });
  window.addToTimeline = () => {
    const output = window._lastGenOutput;
    if (!output?.url) { tell('Generate a completed clip before adding it to ANIMILL.'); return; }
    const video = document.querySelector('#gen-output-done video');
    const duration = Math.round((Number.isFinite(video?.duration) ? video.duration : genState.selDur) * 1000);
    const portrait = genState.orient === 'portrait';
    const project = {id:crypto.randomUUID(),name:'NANA clip',aspect:portrait?'mobile_9_16':'desktop_16_9',fps:30,activeScene:0,
      scenes:[{id:crypto.randomUUID(),name:'NANA output',duration,audio:[],effects:[],blocks:[{
        id:crypto.randomUUID(),type:'video',src:output.url,content:'NANA output',x:0,y:0,w:portrait?1080:1920,h:portrait?1920:1080,
        start:0,dur:duration,motion:'none',micro:'none',effect:'none',audioEnabled:true}]}]};
    try { localStorage.setItem('animill.handoff', JSON.stringify(project)); location.href = '/'; }
    catch(error) { tell('Handoff failed: ' + error.message); }
  };
  function syncPressed() {
    document.querySelectorAll('.pill[onclick],.gen-mode-btn[onclick],.engine-tile[onclick]').forEach(el =>
      el.setAttribute('aria-pressed', String(el.classList.contains('active'))));
  }
  document.querySelectorAll('[onclick]').forEach(el => {
    if (!['BUTTON','A','INPUT'].includes(el.tagName)) {
      el.setAttribute('role','button'); el.tabIndex = 0;
      el.addEventListener('keydown', event => {
        if (event.target !== el || !['Enter',' '].includes(event.key)) return;
        event.preventDefault(); el.click();
      });
    }
  });
  const labels = {'gen-img-input':'Character image','gen-audio-input':'Audio track','gen-suno-url':'Direct audio URL',
    'gen-prompt':'Motion prompt','ls-face':'Wav2Lip face image or video','ls-audio':'Wav2Lip audio'};
  Object.entries(labels).forEach(([id,label]) => $(id)?.setAttribute('aria-label',label));
  $('ls-status')?.setAttribute('role','status');
  document.querySelectorAll('[onclick^="aiRewrite"],[onclick^="openNanaBanana"]').forEach(el => {
    el.setAttribute('aria-disabled','true'); el.title = 'No provider connected';
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[onclick^="setGen"],[onclick^="selectEngine"]')) { remember(); syncPressed(); }
  });
  prompt.addEventListener('input', remember);
  try { const saved = JSON.parse(localStorage.getItem(key)); if (saved) apply(saved); } catch {}
  syncPressed();
  // Check actual service capabilities; never present the static NATIVE badge as proof.
  async function checkBackend() {
    const button = $('veo-auth-btn'), label = $('tool-lipsync-label'), dot = $('tool-lipsync-dot');
    $('ls-go').disabled = true;
    $('gen-btn').disabled = true;
    $('ls-status').textContent = 'Checking local lip-sync service…';
    if (label) label.textContent = 'CHECKING';
    let online = false, lipsync = false;
    try {
      const response = await fetch(API + '/api/status', {signal:AbortSignal.timeout(4000)});
      online = response.ok;
      if (online) {
        const schema = await fetch(API + '/openapi.json', {signal:AbortSignal.timeout(4000)}).then(r=>r.json());
        lipsync = !!schema.paths?.['/api/lipsync'];
      }
    } catch {}
    $('ls-go').disabled = !lipsync;
    $('ls-status').textContent = lipsync ? 'Local lip-sync service connected.' : online ? 'Connected backend does not provide Wav2Lip.' : 'Local lip-sync service is offline. Inputs remain available.';
    if (label) label.textContent = lipsync ? 'CONNECTED' : 'OFFLINE';
    if (dot) dot.style.background = lipsync ? 'var(--mint)' : 'var(--muted)';
    $('gen-btn').disabled = !online;
    if (online) refreshVeoAuthBanner();
    if (!online) {
      $('veo-auth-title').textContent = 'Generation service offline';
      $('veo-auth-sub').textContent = 'Local editing, uploads and settings work. Connect the NANA backend to generate.';
      button.textContent = 'RECHECK'; button.onclick = checkBackend;
    }
  }
  const lipOutput = $('ls-output');
  if (lipOutput) new MutationObserver(() => {
    const video = lipOutput.querySelector('video');
    if (!video || !video.getAttribute('src')) return;
    const preview = $('gen-output-done'); preview.replaceChildren(video.cloneNode(true));
    preview.style.display = 'flex'; $('gen-output-idle').style.display = 'none';
    $('gen-output-actions').style.display = 'flex'; $('gen-output-badge').textContent = 'READY';
    window._lastGenOutput = {url:video.src,engine:'wav2lip',id:crypto.randomUUID()};
  }).observe(lipOutput, {childList:true,subtree:true});
  void checkBackend();
})();
