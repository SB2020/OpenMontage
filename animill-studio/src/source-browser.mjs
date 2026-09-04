import {spawn} from 'node:child_process';
import {lookup} from 'node:dns/promises';
import {existsSync} from 'node:fs';
import net from 'node:net';

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

function isPrivateIp(address) {
  const normalized = String(address || '').toLowerCase().replace(/^::ffff:/, '');
  if (net.isIP(normalized) === 4) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
      (a >= 224);
  }
  if (net.isIP(normalized) === 6) {
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return true;
}

export async function assertPublicUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { throw new Error('Enter a complete http:// or https:// URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http:// and https:// sources are supported');
  if (url.username || url.password) throw new Error('URLs containing credentials are not supported');
  if (url.hostname.toLowerCase() === 'localhost') throw new Error('Local and private network URLs are blocked');
  const addresses = await lookup(url.hostname, {all: true, verbatim: true});
  if (!addresses.length || addresses.some(({address}) => isPrivateIp(address))) {
    throw new Error('Local and private network URLs are blocked');
  }
  return url;
}

function decodeEntities(value = '') {
  const basic = {amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' '};
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_m, token) => {
    if (token[0] === '#') {
      const hex = token[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    return basic[token.toLowerCase()] ?? _m;
  }).replace(/\s+/g, ' ').trim();
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? '');
}

function absoluteUrl(value, base) {
  if (!value || /^(data|blob|javascript):/i.test(value)) return null;
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function metaMap(html) {
  const map = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (attr(tag, 'property') || attr(tag, 'name')).toLowerCase();
    const content = attr(tag, 'content');
    if (key && content && !map.has(key)) map.set(key, content);
  }
  return map;
}

export function extractSourceDocument(html, sourceUrl, runtime = 'http') {
  const meta = metaMap(html);
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalTag = html.match(/<link\b[^>]*rel\s*=\s*["']?canonical["']?[^>]*>/i)?.[0] || '';
  const candidates = [];
  const seen = new Set();
  const add = (type, value, label = '') => {
    const url = absoluteUrl(value, sourceUrl);
    if (!url || seen.has(`${type}:${url}`)) return;
    seen.add(`${type}:${url}`);
    candidates.push({type, url, label: decodeEntities(label) || `${type} from source`});
  };

  add('image', meta.get('og:image') || meta.get('twitter:image'), 'Social preview image');
  add('video', meta.get('og:video') || meta.get('twitter:player:stream'), 'Social preview video');
  add('audio', meta.get('og:audio'), 'Social preview audio');
  for (const match of html.matchAll(/<(img|video|audio|source)\b[^>]*>/gi)) {
    const tag = match[0];
    const kind = match[1].toLowerCase();
    const src = attr(tag, 'src') || attr(tag, 'data-src') || (kind === 'video' ? attr(tag, 'poster') : '');
    const mime = attr(tag, 'type').toLowerCase();
    const type = kind === 'source' ? (mime.startsWith('audio') ? 'audio' : mime.startsWith('video') ? 'video' : 'image') : kind === 'img' ? 'image' : kind;
    add(type, src, attr(tag, 'alt') || attr(tag, 'title'));
    if (kind === 'video') add('image', attr(tag, 'poster'), 'Video poster');
    if (candidates.length >= 60) break;
  }

  return {
    url: sourceUrl,
    canonicalUrl: absoluteUrl(attr(canonicalTag, 'href'), sourceUrl) || sourceUrl,
    title: decodeEntities(meta.get('og:title') || meta.get('twitter:title') || titleMatch?.[1] || new URL(sourceUrl).hostname),
    description: decodeEntities(meta.get('og:description') || meta.get('description') || ''),
    siteName: decodeEntities(meta.get('og:site_name') || new URL(sourceUrl).hostname),
    runtime,
    inspectedAt: new Date().toISOString(),
    candidates: candidates.slice(0, 60),
  };
}

function run(command, args, {timeoutMs = FETCH_TIMEOUT_MS, maxBytes = MAX_HTML_BYTES} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {shell: false, windowsHide: true});
    const chunks = [];
    let bytes = 0;
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Browser inspection timed out')); }, timeoutMs);
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) { child.kill(); reject(new Error('Source page exceeds the 3 MB inspection limit')); return; }
      chunks.push(chunk);
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-4000); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
      else reject(new Error(stderr || `${command} exited ${code}`));
    });
  });
}

async function lightpandaAdapter() {
  const configured = process.env.LIGHTPANDA_BIN;
  if (configured && existsSync(configured)) {
    try { await run(configured, ['version'], {maxBytes: 64_000}); return {available: true, command: configured, prefix: [], kind: 'native'}; } catch {}
  }
  try { await run('lightpanda', ['version'], {maxBytes: 64_000}); return {available: true, command: 'lightpanda', prefix: [], kind: 'native'}; } catch {}
  if (process.platform === 'win32') {
    try {
      await run('wsl.exe', ['--exec', 'lightpanda', 'version'], {maxBytes: 64_000});
      return {available: true, command: 'wsl.exe', prefix: ['--exec', 'lightpanda'], kind: 'wsl'};
    } catch {}
  }
  return {available: false, command: null, prefix: [], kind: null};
}

export async function browserStatus() {
  const lightpanda = await lightpandaAdapter();
  return {
    lightpanda: {available: lightpanda.available, transport: lightpanda.kind},
    httpInspector: {available: true, note: 'Single-page metadata inspection; no scripted interaction'},
  };
}

async function fetchHttp(url, redirects = 0) {
  if (redirects > 4) throw new Error('Too many redirects');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'manual', signal: controller.signal,
      headers: {'user-agent': 'ANIMILL-Source-Browser/1.0 (+https://github.com/SB2020/OpenMontage)', accept: 'text/html,application/xhtml+xml'},
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      const next = await assertPublicUrl(new URL(response.headers.get('location'), url).href);
      return fetchHttp(next, redirects + 1);
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!/html|xhtml/i.test(contentType)) throw new Error(`Expected an HTML page, received ${contentType || 'unknown content'}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_HTML_BYTES) throw new Error('Source page exceeds the 3 MB inspection limit');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_HTML_BYTES) { await reader.cancel(); throw new Error('Source page exceeds the 3 MB inspection limit'); }
      chunks.push(value);
    }
    return {html: Buffer.concat(chunks.map(value => Buffer.from(value))).toString('utf8'), finalUrl: response.url || url.href};
  } finally { clearTimeout(timer); }
}

export async function inspectSource(value, requestedMode = 'auto') {
  const url = await assertPublicUrl(value);
  const mode = String(requestedMode || 'auto').toLowerCase();
  if (!['auto', 'lightpanda', 'http'].includes(mode)) throw new Error('Browser mode must be auto, lightpanda, or http');
  const adapter = await lightpandaAdapter();
  if (mode === 'lightpanda' && !adapter.available) {
    throw new Error('Lightpanda is not available. Install it in WSL/Docker or set LIGHTPANDA_BIN; no substitute was used.');
  }
  if (adapter.available && mode !== 'http') {
    const html = await run(adapter.command, [...adapter.prefix, 'fetch', '--obey-robots', '--dump', 'html', '--wait-until', 'domcontentloaded', url.href]);
    return extractSourceDocument(html, url.href, `lightpanda-${adapter.kind}`);
  }
  const result = await fetchHttp(url);
  return extractSourceDocument(result.html, result.finalUrl, 'http-inspector');
}
