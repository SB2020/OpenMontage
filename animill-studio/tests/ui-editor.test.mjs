import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import test from 'node:test';
import puppeteer from 'puppeteer-core';

const port = 4197;
const origin = `http://127.0.0.1:${port}`;
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

async function waitForServer(child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`ANIMILL server exited with ${child.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('ANIMILL server did not become ready');
}

test('editor keeps project, inspector, timeline, and viewer state in sync', {timeout: 30_000}, async (t) => {
  const executablePath = chromeCandidates.find(existsSync);
  if (!executablePath) return t.skip('Chrome or Edge is required for the editor integration test');

  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: {...process.env, ANIMILL_PORT: String(port)},
    stdio: 'ignore',
    windowsHide: true,
  });
  t.after(() => server.kill());
  await waitForServer(server);

  const browser = await puppeteer.launch({headless: true, executablePath, args: ['--no-sandbox', '--disable-gpu']});
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({width: 1440, height: 1000});
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('animill.onboard', 'off');
    localStorage.setItem('animill.mode', 'adv');
  });
  await page.goto(origin, {waitUntil: 'networkidle0'});

  const result = await page.evaluate(() => {
    const initial = {
      id: 'ui-proof', name: 'UI proof', aspect: 'desktop_16_9', fps: 30, activeScene: 0, assets: [],
      scenes: [{id: 'scene-1', name: 'One', duration: 2000, audio: [], effects: [], blocks: [
        {id: 'text-1', type: 'hero', content: 'BEFORE', micro: 'breath', x: 100, y: 100, w: 600, h: 120, start: 1000, dur: 500},
      ]}],
    };
    assertForBrowser(window.ANIMILL.loadState(initial), 'project should load');
    window.ANIMILL.gotoMs(0);
    const beforeEditOpacity = getComputedStyle(document.querySelector('[data-id="text-1"]')).opacity;
    window.ANIMILL.updateBlock('text-1', {content: 'AFTER'});
    const afterEditOpacity = getComputedStyle(document.querySelector('[data-id="text-1"]')).opacity;
    window.ANIMILL.gotoMs(1200);
    const activeOpacity = getComputedStyle(document.querySelector('[data-id="text-1"]')).opacity;

    const stableName = window.ANIMILL.getState().name;
    const invalidLoad = window.ANIMILL.loadState({name: 'Broken', scenes: []});
    const nameAfterInvalidLoad = window.ANIMILL.getState().name;

    const legacyImage = {
      id: 'legacy', name: 'Legacy', aspect: 'desktop_16_9', scenes: [{id: 's1', name: 'One', duration: 2000, blocks: [
        {id: 'image-1', type: 'image', content: 'Image', src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', start: 0, dur: 1000},
      ]}],
    };
    const legacyLoaded = window.ANIMILL.loadState(legacyImage);
    const normalizedImage = window.ANIMILL.getState().scenes[0].blocks[0];
    return {beforeEditOpacity, afterEditOpacity, activeOpacity, invalidLoad, stableName, nameAfterInvalidLoad, legacyLoaded, normalizedImage, invalidSelect: window.ANIMILL.selectBlock('missing')};

    function assertForBrowser(condition, message) { if (!condition) throw new Error(message); }
  });

  assert.equal(result.beforeEditOpacity, '0');
  assert.equal(result.afterEditOpacity, '0', 'editing must not make a future block appear at the current playhead');
  assert.notEqual(result.activeOpacity, '0');
  assert.equal(result.invalidLoad, false);
  assert.equal(result.nameAfterInvalidLoad, result.stableName, 'a rejected load must leave the current project untouched');
  assert.equal(result.legacyLoaded, true);
  assert.equal(result.normalizedImage.track, 'video');
  assert.deepEqual(result.normalizedImage.filters, {brightness: 1, contrast: 1, saturate: 1, blur: 0, hue: 0, grayscale: 0, sepia: 0, invert: 0});
  assert.equal(result.invalidSelect, false);
  assert.deepEqual(errors, []);

  await page.evaluate(() => window.ANIMILL.loadState({
    id: 'text-edit', name: 'Text edit', aspect: 'desktop_16_9', fps: 30, activeScene: 0, assets: [],
    scenes: [{id: 'scene-1', name: 'One', duration: 2000, audio: [], effects: [], blocks: [
      {id: 'text-1', type: 'hero', content: 'BEFORE', x: 100, y: 100, w: 600, h: 120, start: 0, dur: 2000},
    ]}],
  }));
  await page.focus('#bContent');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.type('LIVE TEXT');
  assert.equal(await page.$eval('#previewStage [data-id="text-1"] .content', (node) => node.textContent), 'LIVE TEXT');
  assert.equal(await page.evaluate(() => window.ANIMILL.getState().scenes[0].blocks[0].content), 'LIVE TEXT');
  await page.evaluate(() => { document.activeElement.blur(); document.querySelector('#undoBtn').click(); });
  assert.equal(await page.evaluate(() => window.ANIMILL.getState().scenes[0].blocks[0].content), 'BEFORE');

  await page.evaluate(() => {
    window.ANIMILL.updateBlock('text-1', {effect: 'liquid-gold', micro: 'breath'});
    openExport();
  });
  await page.waitForFunction(() => document.querySelector('#compatibilityReport')?.textContent.includes('Review before production'));
  assert.equal(await page.$eval('#renderRemotion', (button) => button.disabled), true, 'a visually different render must wait for review');
  assert.match(await page.$eval('#compatibilityReport', (node) => node.textContent), /liquid-gold/);
  await page.click('#allowRuntimeDifferences');
  assert.equal(await page.$eval('#renderRemotion', (button) => button.disabled), false, 'explicit approval should unlock the selected production route');
  assert.deepEqual(errors, []);
});
