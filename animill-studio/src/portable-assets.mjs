import {copyFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const extensions = {
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg',
  'video/mp4': 'mp4', 'video/webm': 'webm',
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
};

function decodeDataUrl(value) {
  if (typeof value !== 'string') return null;
  const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(value);
  if (!match) return null;
  return {mime: match[1].toLowerCase(), bytes: Buffer.from(match[2], 'base64')};
}

export async function materializeDataAssets(input, workspace, options = {}) {
  const project = structuredClone(input);
  const assetDir = path.join(workspace, 'assets');
  let index = 0;
  const materialize = async (value, stem) => {
    const decoded = decodeDataUrl(value);
    await mkdir(assetDir, {recursive: true});
    if (!decoded && typeof value === 'string' && value.startsWith('/openmontage-assets/') && options.localAssetsRoot) {
      const relative = decodeURIComponent(value.slice('/openmontage-assets/'.length)).replaceAll('/', path.sep);
      const source = path.resolve(options.localAssetsRoot, relative);
      const localRoot = path.resolve(options.localAssetsRoot);
      if (source !== localRoot && !source.startsWith(`${localRoot}${path.sep}`)) throw new Error('Local asset path escapes the OpenMontage asset library');
      const extension = path.extname(source) || '.bin';
      const filename = `${stem}-${index++}${extension}`;
      await copyFile(source, path.join(assetDir, filename));
      return `./assets/${filename}`;
    }
    if (!decoded) return value;
    const extension = extensions[decoded.mime] || 'bin';
    const filename = `${stem}-${index++}.${extension}`;
    await writeFile(path.join(assetDir, filename), decoded.bytes);
    return `./assets/${filename}`;
  };

  for (const [sceneIndex, scene] of project.scenes.entries()) {
    for (const [blockIndex, block] of (scene.blocks || []).entries()) {
      block.src = await materialize(block.src, `scene-${sceneIndex + 1}-block-${blockIndex + 1}`);
    }
    if (scene.soundtrack) {
      if (scene.soundtrack.src) scene.soundtrack.src = await materialize(scene.soundtrack.src, `scene-${sceneIndex + 1}-soundtrack`);
      else if (scene.soundtrack.url) scene.soundtrack.url = await materialize(scene.soundtrack.url, `scene-${sceneIndex + 1}-soundtrack`);
    }
  }
  return project;
}
