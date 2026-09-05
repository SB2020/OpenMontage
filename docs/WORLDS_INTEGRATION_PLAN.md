# Worlds integration plan

## Locked goal

Make NANA Storyworlds a complete, dependable audio authoring surface inside the ANIMILL/OpenMontage workflow. Existing Worlds capabilities stay intact; the interface, state contract, and handoff should feel like one product.

## Current verified spine

- Story archetypes and editable promise, audience, project name, and duration.
- Six-lane deterministic timeline with transport, scrub, loop, themes, and collapsible Story/Launch rails.
- Per-beat local voice roster, direct timeline move/resize, text focus, numeric timing, save/download, OpenMontage handoff, and ANIMILL visual handoff.
- Shared reticle, pointer light, hover/focus behavior, and ANIMILL timeline primitives.

## Gate status

**Worlds integration gate: verified.** A fresh browser audit now covers the existing fields, themes, voices, timeline edits, save/reload, beat-plan export, OpenMontage handoff, ANIMILL handoff, collapse/expand, compact layout, and shell parity.

## Integration contract

1. **Shell:** ANIMILL typography, bevels, panel depth, palette tokens, spacing, and responsive behavior.
2. **Interaction:** one stable pointer light, fixed reticle geometry, no hover layout movement, consistent pointer information, and visible focus states.
3. **Timeline:** the same ruler, lane, clip, transport, scrub, selection, and edit semantics; timing remains canonical in the beat plan.
4. **State:** every control edits the same Worlds project object; browser save, download, OpenMontage, and ANIMILL handoff preserve the edits.
5. **Proof:** fresh browser checks plus visual review at desktop and compact widths; no new providers or feature families until this contract passes.

## Execution order

1. ~~Finish shell and interaction parity: remove opaque-layer mismatches and hover jitter.~~ **Verified.**
2. ~~Audit every existing Worlds control against the state contract.~~ **Verified.**
3. ~~Exercise the full path: archetype → edit → timeline → local preview → save/download → OpenMontage/ANIMILL handoff → reload.~~ **Verified.**
4. ~~Add compact-layout and collapse/expand regression proof.~~ **Verified.**
5. Accept the next component only through the same shared shell, state, handoff, and fresh-proof gates.

## Non-goals for this phase

- No new generation provider integrations.
- No new audio-platform pivot work.
- No separate renderer or flight-simulator work.

## Exit evidence

The phase is complete when the existing Worlds feature set is visually standardized, every visible control has a fresh interaction proof, state survives both handoffs and reload, and the solution map marks the module verified.
