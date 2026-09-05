# ANIMILL Studio

ANIMILL is the shared visual authoring and interaction center for the creative
capabilities collected under E-drives. It gives a human or an agent a direct
canvas, scene list, timeline, typography system, motion vocabulary, sound cues,
asset library, attributable research context, and explicit production routes.
OpenMontage is one downstream production adapter, not ANIMILL's owner or shell.

## Boundary contract

```text
Browser/acquisition nerves -> pinned source context + attributable assets
                                      |
                                      v
                         ANIMILL canonical project
                         /         |          \
              generators     authoring UI     output adapters
                                              /      |      \
                                      HyperFrames Remotion OpenMontage
```

- **ANIMILL owns shared creative state:** sources, assets, worlds, scenes, layout,
  timing, motion, selected media, audio intent, and preview.
- **Specialized fragments own their niche logic:** generators, audio desks,
  browsers, renderers, and publishers connect through explicit ports without
  introducing parallel project models.
- **OpenMontage owns its production-governance adapter:** pipeline state,
  canonical artifacts, provider choices, approval gates, budget, and delivery
  review when that path is selected.
- **Lightpanda owns browser automation:** scripted public-web inspection when its runtime is installed. The built-in HTTP inspector is deliberately limited to single-page metadata.
- **HyperFrames and Remotion remain separate:** selecting one never silently invokes the other.

## Run

```bash
cd animill-studio
npm install
npm start
```

Open `http://127.0.0.1:4177`.

## Authoring workflow

1. Add an object from the tools panel on the left.
2. Select it on the stage or timeline.
3. Edit its content, geometry, timing, layer and opacity in the inspector on the right.
4. Scrub or press Play; the viewer always represents the current playhead.
5. Use the top **Render or export video** control to choose HyperFrames or Remotion explicitly.

The Export Forge checks the current project before enabling production actions. A green result means the features used in the project have equivalents in that renderer. An amber result names every browser-only feature and how many times it is used. ANIMILL will not render or hand off that changed result until **Render with listed differences** is checked.

Project loads are atomic. Older projects receive safe defaults for missing fields, while invalid projects are rejected without replacing the project already open in the editor.

## Source browser

Choose **Source browser**, enter a public `http://` or `https://` page and select an inspection engine:

- **Best available:** uses Lightpanda when present, otherwise the bounded HTTP metadata inspector.
- **Require Lightpanda:** fails visibly if Lightpanda is unavailable.
- **Metadata only:** fetches one public page and extracts title, description,
  language, keywords, headings, a bounded text excerpt, and directly exposed
  image/video/audio URLs.

Local, private-network and credential-bearing URLs are blocked. Responses are
capped at 3 MB and time out. Choose **Pin source to project** to make the page
context part of canonical ANIMILL state. Pinned context survives save/restore,
is available to prompt generators through `ANIMILL.context()`, appears in the
asset desk and license report, and follows downstream handoffs. Imported web
media retains its source ID and is marked `rights: unknown`, `commercial:
false`, and `zone: reference` until a human clears it.

The browser is based on the interface exposed by [`SB2020/browser`](https://github.com/SB2020/browser), the Lightpanda fork. On Windows, install Lightpanda in WSL or Docker, or set `LIGHTPANDA_BIN` to a runnable binary.

## OpenMontage handoff

In **Export forge**, select HyperFrames or Remotion and choose **Send project to OpenMontage**. ANIMILL writes:

```text
projects/<project-slug>/artifacts/
├── animill-project.json
├── animill-sources.json
├── edit_decisions.json
└── scene_plan.json
```

`scene_plan.json` and `edit_decisions.json` conform to the existing OpenMontage artifact contracts. The handoff records `renderer_family: animation-first`, the explicit `render_runtime`, source provenance and the original ANIMILL project.

## Agent interface

```js
const source = await ANIMILL.inspectSource(url, 'auto', {pin: true});
const grounding = ANIMILL.context();
const match = await ANIMILL.checkCompatibility();
await ANIMILL.exportToOpenMontage('hyperframes', {allowDifferences: !match.hyperframes.exact});
await ANIMILL.renderWith('remotion', {allowDifferences: !match.remotion.exact});
```

The existing `ANIMILL.compose(spec)` interface remains the
prompt-generator/Claude/Wan entry point. Compose specs may carry `sources`, and
generated assets or blocks should retain their `sourceId` so decisions remain
traceable.

Creative Intake also recognizes a MoneyPrinterTurbo-Extended `script.json`
shape. The adapter preserves its subject, script, search terms, aspect,
materials, SRT timing, narration path, parameters, task ID, and any incoming
ANIMILL source context. It creates editable scenes and blocks rather than
importing only the flattened final MP4. No generator or provider is called by
the intake step.
