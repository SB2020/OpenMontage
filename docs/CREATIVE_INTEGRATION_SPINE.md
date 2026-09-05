# Creative integration spine

This is the locked map for the existing work. It is an integration contract,
not a request to build another generator.

## Product equation

`AI / prompt input → World or talking-head composition → audio plan and voices → ANIMILL authoring → OpenMontage render and handoff`

ANIMILL is the authoring frontend. OpenMontage remains the production and
governance layer. NANA Storyworlds remains the audio planning and audition
surface. Existing Claude, WAN2, prompt-generator, avatar, talking-head, and
audio work feeds these surfaces; it does not get replaced by a new parallel
workflow.

## Existing surfaces to preserve

| Existing work | Current home | Integration responsibility |
| --- | --- | --- |
| Prompt and AI planning | Claude / WAN2 / prompt generators | Emit the existing `ANIMILL.compose(spec)` shape or a NANA project; do not render or invent a second project model. |
| World and talking-head intent | ANIMILL scenes and existing OpenMontage pipeline definitions | Enter the same scene/block/media contract so a creator can review and edit it in ANIMILL. |
| Voice, music, ambience, SFX, silence, transitions | NANA Storyworlds | Keep the beat plan canonical, locally previewable, and transferable to ANIMILL/OpenMontage. |
| Visual authoring | ANIMILL | Own selection, stage, inspector, timeline, save/reload, and the visible source of truth. |
| Render and delivery | OpenMontage + HyperFrames + Remotion + FFmpeg | Consume the reviewed project explicitly and preserve timing, geometry, audio metadata, and provenance. |

## UI standardization contract

Only the interface and handoff boundaries are in scope for this integration
pass:

1. Connected surfaces use ANIMILL typography, tokens, panel depth, bevels,
   spacing, transport, timeline, reticle, pointer information, focus, and
   hover behavior.
2. A handoff preserves IDs, scene order, millisecond timing, voice metadata,
   media references, authored geometry, and provenance. UI normalization must
   not silently drop content.
3. Existing talking-head and AI-created assets appear as editable media or
   scene inputs in the current authoring shell; no new provider or generation
   UI is required to prove the integration.
4. NANA and ANIMILL remain distinct desks with one canonical handoff, not two
   competing editors. Audio preview is local and honest; production rendering
   stays in OpenMontage.

## Evidence and next bounded move

- **Verified:** NANA → ANIMILL timing handoff, local voice roster, six-lane
  audio timeline, OpenMontage package, ANIMILL shell parity, one-hour timeline,
  direct timeline edits, and HyperFrames/Remotion parity.
- **Needs direct mapping:** the existing AI/talking-head artifact entry point
  into the standardized ANIMILL shell. This is a wiring and UI job, not a new
  generation system.
- **Next move:** choose one existing talking-head or AI artifact fixture,
  surface it through the current ANIMILL import/compose path, and show the
  preserved audio/world metadata in the same inspector and timeline.

Until that fixture is visible end to end, do not expand the provider catalog,
audio-platform pivot, or effect families.
