# ANIMILL 7 - OpenMontage authoring studio

ANIMILL is the browser-first visual authoring frontend inside OpenMontage. It adds provenance-aware source inspection and two explicit, non-silent production runtimes:

- **HyperFrames** for deterministic HTML/CSS/GSAP rendering that closely follows ANIMILL's native authoring model.
- **Remotion** for React-driven compositions, reusable programmatic templates, and server/cloud render paths.
- **Lightpanda source browser** for public-page research and media ingest from `SB2020/browser`, with a bounded metadata-only adapter when Lightpanda is unavailable.
- **OpenMontage handoff** for canonical `scene_plan`, `edit_decisions`, source-manifest and original ANIMILL project artifacts.

The original `animation_mill_v6_24.html` is preserved. Its copy at `public/animill.html` receives the new renderer controls.

Before a production export, ANIMILL now compares the open project with both renderer capability sets. Exact projects render immediately. If a browser-only motion, micro-animation, styling effect, synth cue, or media treatment is present, the Export Forge lists it and keeps production actions locked until the creator explicitly chooses **Render with listed differences**. The server enforces the same rule, so API calls cannot bypass it accidentally.

## Run

```powershell
npm install
npm start
```

Open <http://127.0.0.1:4177>. The Export Forge exposes both render engines and reports the installed runtime versions.

HyperFrames requires Node 22.12 or newer. On this Windows machine the launcher automatically selects the newer bundled Hermes Node runtime when the system Node is older.

## Verify

```powershell
npm test
npm run render:hyperframes:demo
npm run render:remotion:demo
```

The demo commands require the ANIMILL server to already be running. Successful MP4 files are written beneath `renders/`.

## Stable boundary

Both engines consume the same ANIMILL project object returned by `window.ANIMILL.getState()`. A runtime is selected explicitly for every render; the bridge does not silently replace HyperFrames with Remotion or vice versa.

Use `await ANIMILL.checkCompatibility()` to inspect both reports. Automated clients may pass `{allowDifferences: true}` to `ANIMILL.renderWith(runtime, options)` or `ANIMILL.exportToOpenMontage(runtime, options)` only after reviewing the report.

Browser-only `blob:` asset URLs are rejected because a server renderer cannot retrieve them. Embed files as data URLs or upload/serve them through a stable local URL before rendering.

## Prompt-generator handoff

Claude, WAN2, and other prompt generators should emit the existing `ANIMILL.compose(spec)` schema. Rendering remains a separate decision after the generated timeline has been reviewed. This preserves the prompt tools as planners and ANIMILL as the editable source of truth.
