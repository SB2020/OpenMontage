# ANIMILL viewer, element, and timeline fault sweep

## Locked intake

Stabilize the existing ANIMILL authoring loop before accepting another feature family. The viewer, stage elements, inspector, timeline, and canonical project state must remain one connected edit surface.

## Verified contracts

- A visible stage element can be selected and dragged; its canonical `x`/`y` values change and the selection remains visible.
- A full-workbench timeline clip can be moved and resized directly.
- Timeline selection drives the inspector, including audio clips that do not have a stage block.
- The selection-frame resize handle mutates canonical scale, and browser save/restore preserves the edited geometry.
- Alt-drag rotation mutates canonical rotation, and pointer travel does not steal focus from the text inspector.
- A one-hour scene remains a valid bounded timeline and keeps its hour-aware ruler/readouts.
- Shared ANIMILL chrome remains compositor-safe and hover feedback does not move controls.

## Fresh proof

`animill-studio/tests/ui-editor.test.mjs` now runs dedicated timeline and geometry fixtures after closing the export review surface. It drags an audio cue, asserts the updated start and inspector selection, drags the right edge and asserts the updated duration, resizes and Alt-rotates a selected stage block, checks text-field focus during pointer travel, then saves, mutates, restores, and asserts the edited geometry returns. The existing browser proof covers stage/text edits, one-hour timing, undo, viewer visibility, exports, and Worlds parity.

## Gate status

**ANIMILL viewer/text/element/timeline gate: verified.** No production refactor was needed in this slice; direct editing and geometry persistence are now protected by regression coverage.

## Next bounded intake

Use fresh input to audit the remaining high-fan-out contract: geometry parity in standalone/HyperFrames/Remotion. Accept a code change only when a reproducible break is found and its cross-surface proof is added.
