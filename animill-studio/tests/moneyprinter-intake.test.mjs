import test from 'node:test';
import assert from 'node:assert/strict';
import {moneyPrinterToAnimillSpec, parseSrt} from '../src/moneyprinter-intake.mjs';

test('MoneyPrinter script data becomes editable ANIMILL scenes with grounding', () => {
  const spec = moneyPrinterToAnimillSpec({
    task_id: 'fresh-mpt-proof',
    script: 'The first sourced claim matters. The second beat advances the story.',
    search_terms: ['evidence', 'story'],
    params: {video_subject: 'Grounded story', video_aspect: '16:9', video_clip_duration: 4},
    animillContext: {sources: [{id: 'source-proof', url: 'https://example.com/proof', canonicalUrl: 'https://example.com/proof', title: 'Proof'}]},
    materials: [{url: 'https://example.com/clip.mp4', search_term: 'evidence', duration: 4}],
  });
  assert.equal(spec.aspect, 'desktop_16_9');
  assert.equal(spec.metadata.source, 'MoneyPrinterTurbo-Extended');
  assert.deepEqual(spec.metadata.searchTerms, ['evidence', 'story']);
  assert.equal(spec.sources[0].id, 'source-proof');
  assert.equal(spec.scenes.length, 2);
  assert.equal(spec.scenes[0].blocks[0].type, 'video');
  assert.deepEqual(spec.scenes[0].blocks[1].sourceIds, ['source-proof']);
});

test('MoneyPrinter subtitle timing remains canonical instead of being flattened', () => {
  const subtitleSrt = '1\n00:00:00,250 --> 00:00:02,000\nFirst timed line\n\n2\n00:00:02,100 --> 00:00:04,500\nSecond timed line';
  assert.deepEqual(parseSrt(subtitleSrt).map(item => [item.start, item.end]), [[250, 2000], [2100, 4500]]);
  const spec = moneyPrinterToAnimillSpec({script: 'First timed line. Second timed line.', subtitleSrt, audioUrl: '/moneyprinter/audio.mp3', params: {video_subject: 'Timed story', video_aspect: '9:16'}});
  assert.equal(spec.scenes.length, 1);
  assert.equal(spec.scenes[0].duration, 4500);
  assert.equal(spec.scenes[0].blocks[0].start, 250);
  assert.equal(spec.scenes[0].blocks[1].dur, 2400);
  assert.equal(spec.scenes[0].soundtrack.src, '/moneyprinter/audio.mp3');
});
