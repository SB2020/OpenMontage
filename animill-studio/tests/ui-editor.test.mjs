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

test('editor keeps project, inspector, timeline, and viewer state in sync', {timeout: 60_000}, async (t) => {
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

  const boundaryProof = await page.evaluate(() => {
    const base = {
      id: 'boundary-proof', name: 'Boundary proof', aspect: 'desktop_16_9', fps: 30, activeScene: 0, assets: [],
      scenes: [{id: 'scene-1', name: 'One', duration: 3000, audio: [
        {id: 'same', track: 'not-a-track', start: -40, dur: 9000, vol: 4, pan: -9, pitch: 0},
      ], effects: [], blocks: [
        {id: 'same', type: 'hero', content: 'FUTURE', x: 20, y: 20, w: 400, h: 90, start: 2000, dur: 500, motion: 'glitch-in'},
        {id: 'same', type: 'caption', content: 'NOW', x: 20, y: 150, w: 400, h: 90, start: 0, dur: 3000},
      ]}],
    };
    window.ANIMILL.loadState(base);
    window.ANIMILL.gotoMs(100);
    const state = window.ANIMILL.getState();
    const future = document.querySelector(`[data-id="${state.scenes[0].blocks[0].id}"]`);
    const pointerBeforeStart = getComputedStyle(future).pointerEvents;
    const selectionFrameBeforeStart = document.querySelector('#selFrame').classList.contains('on');
    window.ANIMILL.gotoMs(2200);
    const firstTransform = document.querySelector(`[data-id="${state.scenes[0].blocks[0].id}"]`).style.transform;
    window.ANIMILL.gotoMs(2200);
    const secondTransform = document.querySelector(`[data-id="${state.scenes[0].blocks[0].id}"]`).style.transform;
    return {state, pointerBeforeStart, selectionFrameBeforeStart, firstTransform, secondTransform};
  });
  const boundaryScene = boundaryProof.state.scenes[0];
  assert.equal(new Set([...boundaryScene.blocks, ...boundaryScene.audio].map((item) => item.id)).size, 3, 'loaded timeline IDs must be unique');
  assert.equal(boundaryProof.pointerBeforeStart, 'none', 'an invisible future block must not intercept viewer input');
  assert.equal(boundaryProof.selectionFrameBeforeStart, false, 'an inactive block must not show a misleading viewer selection frame');
  assert.equal(boundaryProof.firstTransform, boundaryProof.secondTransform, 'the same glitch frame must redraw deterministically');
  assert.deepEqual(
    {track: boundaryScene.audio[0].track, start: boundaryScene.audio[0].start, dur: boundaryScene.audio[0].dur, vol: boundaryScene.audio[0].vol, pan: boundaryScene.audio[0].pan, pitch: boundaryScene.audio[0].pitch},
    {track: 'audioA', start: 0, dur: 3000, vol: 1, pan: -1, pitch: 0.1},
    'imported audio clips must be normalized before reaching the timeline and inspector',
  );
  await page.click('#saveBtn');
  await page.evaluate(() => window.ANIMILL.loadState({...window.ANIMILL.getState(), name: 'Unsaved mutation'}));
  await page.click('#restoreBtn');
  assert.equal(await page.evaluate(() => window.ANIMILL.getState().name), 'Boundary proof', 'Restore must reconnect to the browser save');
  await page.reload({waitUntil: 'networkidle0'});
  assert.equal(await page.evaluate(() => window.ANIMILL.getState().name), 'Boundary proof', 'A browser save must survive a real page reload');

  await page.evaluate(() => {
    window.ANIMILL.loadState({id: 'empty-safe', name: 'Empty scene safe', aspect: 'desktop_16_9', scenes: [{id: 'empty', name: 'Empty', duration: 1000, blocks: []}]});
    document.querySelector('#saveBtn').click();
  });
  await page.reload({waitUntil: 'networkidle0'});
  assert.equal(await page.evaluate(() => window.ANIMILL.getState().scenes[0].blocks.length), 0, 'an empty saved scene must reopen without crashing startup');
  assert.deepEqual(errors, []);

  const composeProof = await page.evaluate(() => {
    const result = window.ANIMILL.compose({name: 'Normalized composition', scenes: [{name: 'Bad inputs', duration: -20, blocks: [
      {id: 'repeat', type: 'hero', text: 'A', start: -100, dur: 9999},
      {id: 'repeat', type: 'caption', text: 'B', start: 500, dur: -2},
    ], audio: [{id: 'repeat', track: 'unknown', start: -5, dur: 999}]}]});
    const beforeScene = window.ANIMILL.getState().activeScene;
    const sceneAfterBadNavigation = window.ANIMILL.gotoScene('not-a-scene');
    window.ANIMILL.gotoMs('not-a-time');
    return {result, state: window.ANIMILL.getState(), beforeScene, sceneAfterBadNavigation};
  });
  assert.equal(composeProof.result.ok, true);
  assert.equal(composeProof.state.scenes[0].duration, 1, 'automation composition must use the canonical duration rules');
  assert.equal(new Set([...composeProof.state.scenes[0].blocks, ...composeProof.state.scenes[0].audio].map((item) => item.id)).size, 3);
  assert.equal(composeProof.sceneAfterBadNavigation, composeProof.beforeScene, 'invalid automation navigation must keep the current scene stable');
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

  await page.setViewport({width: 1000, height: 1000});
  await page.goto(`${origin}/nana.html`, {waitUntil: 'networkidle0'});
  assert.match(await page.$eval('.brand', (node) => node.textContent), /NANA STORYWORLDS/);
  assert.equal(await page.$eval('#pointerInfo', (node) => node.getAttribute('aria-hidden')), 'true', 'NANA and ANIMILL must share the reticle information layer');
  const centerWidthBeforeCollapse = await page.$eval('.center', (node) => node.getBoundingClientRect().width);
  await page.click('#toggleStory');
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(await page.$eval('#workspace', (node) => node.classList.contains('storyHidden')), true, 'Story Engine must collapse from the shared panel control');
  assert.equal(await page.$eval('.storyPane', (node) => getComputedStyle(node).display), 'none');
  const collapsedWidths = await page.evaluate(() => ({
    center: document.querySelector('.center').getBoundingClientRect().width,
    workspace: document.querySelector('#workspace').getBoundingClientRect().width,
  }));
  assert.ok(collapsedWidths.center > centerWidthBeforeCollapse + 150, 'the sonic timeline must consume the width released by Story Engine');
  assert.ok(Math.abs(collapsedWidths.center - collapsedWidths.workspace) < 2, 'the collapsed responsive timeline must span the workspace');
  await page.click('#toggleStory');
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(await page.$eval('#workspace', (node) => node.classList.contains('storyHidden')), false, 'Story Engine must reopen without losing the workspace');
  await page.select('#themeSelect', 'mint');
  assert.equal(await page.$eval('body', (node) => node.dataset.theme), 'mint');
  const timelineBox = await page.$eval('#timeline', (node) => { const rect = node.getBoundingClientRect(); return {left: rect.left, top: rect.top, width: rect.width}; });
  await page.mouse.click(timelineBox.left + 82 + (timelineBox.width - 82) * 0.5, timelineBox.top + 10);
  assert.match(await page.$eval('#clock', (node) => node.textContent), /^9\.0 \/ 18\.0s$/, 'timeline click must scrub the NANA playhead');
  await page.click('#step');
  assert.match(await page.$eval('#clock', (node) => node.textContent), /^9\.5 \/ 18\.0s$/, 'transport step must advance from the scrubbed time');
  await page.click('#loop');
  assert.equal(await page.$eval('#loop', (node) => node.getAttribute('aria-pressed')), 'true');
  await page.click('[data-key="talkback"]');
  await page.$eval('#projectName', (input) => { input.value = 'Talkback proof'; });
  await page.click('#animill');
  await page.waitForFunction(() => location.pathname === '/' && window.ANIMILL?.getState().name.includes('Talkback proof'));
  const nanaLaunch = await page.evaluate(() => window.ANIMILL.getState());
  assert.equal(nanaLaunch.scenes[0].name, 'Audio story · Talkback');
  assert.ok(nanaLaunch.scenes[0].blocks.length >= 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('animill.handoff')), null, 'ANIMILL must consume the handoff once');
  assert.deepEqual(errors, []);
});
