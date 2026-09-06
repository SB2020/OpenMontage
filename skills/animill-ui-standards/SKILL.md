---
name: animill-ui-standards
description: Apply the ANIMILL Advanced visual system to integrated authoring surfaces without changing their workflow or inventing controls.
metadata:
  short-description: Standardize integrated UI to ANIMILL Advanced
---

# ANIMILL UI standards

Use this skill when an ANIMILL surface is being built, fused, or reskinned.

## Source of truth

- Treat `animill-studio/public/animill.html` and `animill-studio/public/animill-timeline.css` as the visual reference.
- Preserve the behavior and data contract of the target tool. This skill is a visual/integration standard, not permission to add fake providers, sample output, or disconnected controls.
- Adapter pages may transform a source page at serve time; do not mutate an archived source-of-record unless explicitly requested.

## Visual contract

- Palette: near-black background and surfaces, ANIMILL gold `#f2c968`, mint `#76ffc3`, cyan `#82ddff`, warm-white text, mono metadata.
- Use layered ambient radial light and the subtle 36px grid mask. Stages and previews are recessed into the surrounding surface with inset lighting; do not use floating white cards.
- Use beveled clip paths for panels, buttons, tabs, cards, and controls. Avoid rounded rectangles, squircles, and uncut rectangles. Keep corners intentional and consistent.
- Typography is compact, high-contrast HUD text: Inter/system for labels and mono for IDs, status, and measurements.
- Reticle is deterministic: a 10px gold diamond plus a 46px beveled halo, both positioned from `--mx`/`--my` with `requestAnimationFrame`. No layout-affecting hover animation.
- Hover may change color, border, or glow only. Never change dimensions, position, or flow when the pointer crosses nested children.

## Integration checklist

1. Put the primary preview/stage in the main composition area and embed it in the background layer.
2. Keep advanced settings, provider choices, and secondary actions behind a compact menu when they are not needed for the primary workflow.
3. Reuse the established transport/timeline and status language; do not duplicate controls with a new style.
4. Keep unavailable local services honest and visibly non-operational rather than simulating completion.
5. Verify with a desktop pointer and a coarse pointer. Check that pointer motion does not jerk layout, that panels remain square/beveled, and that the accessibility tree exposes only live controls.
