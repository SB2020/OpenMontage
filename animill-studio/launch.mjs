import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const [major, minor] = process.versions.node.split('.').map(Number);
const compatible = major > 22 || (major === 22 && minor >= 12);
const watch = process.argv.includes('--watch');

if (compatible) {
  await import('./server.mjs');
} else if (process.platform === 'win32') {
  const candidate = path.join(process.env.LOCALAPPDATA || '', 'hermes', 'node', 'node.exe');
  if (!existsSync(candidate)) {
    console.error(`ANIMILL needs Node 22.12 or newer for HyperFrames. Current runtime: ${process.version}`);
    process.exit(1);
  }
  const candidateDir = path.dirname(candidate);
  const args = watch ? ['--watch', path.join(root, 'server.mjs')] : [path.join(root, 'server.mjs')];
  const child = spawn(candidate, args, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: false,
    env: {...process.env, PATH: `${candidateDir};${process.env.PATH || ''}`},
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.error(`ANIMILL needs Node 22.12 or newer for HyperFrames. Current runtime: ${process.version}`);
  process.exit(1);
}
