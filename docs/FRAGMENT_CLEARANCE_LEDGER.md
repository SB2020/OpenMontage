# Fragment clearance ledger

This ledger makes the initialization list finite and executable. The preserved
source is `docs/intake/repoMASTERLINKFILE.txt`; it currently contains **105
unique SB2020 GitHub repositories**, plus several external product and reference
links.

The row-level working queue is `docs/intake/fragment-clearance.csv`: **109
unique sources** (105 repositories and 4 external references), all initially
marked `queued`. The preserved initialization file has SHA-256
`C30925B46DB0F8260AD91939C4BFF8BBF8DB3CCF6A93A4F9879C453EAB8B423D`.

Current clearance: **1 integrated, 108 queued**. `SB2020/browser` is the first
cleared nerve: its source document now persists as canonical ANIMILL context
and is consumed by generators, assets, rights reporting, save/restore, and
downstream adapters.

## Locked outcome

Clear every listed source by integrating or absorbing its distinct value into
ANIMILL, or by recording a specific duplicate, rejection, or dependency. Do not
turn the list into 105 mini-apps and do not let inventory work replace connected
delivery.

## What the sources mean

| Source class | Valuable payload | ANIMILL destination |
| --- | --- | --- |
| Functional repository | scraping, browsing, acquisition, generation, editing, rendering, audio, automation, publishing, local runtime, or storage logic | A shared capability port with canonical state, standardized controls, progress/errors, provenance, and a downstream consumer |
| Competition/niche folder | genre, title, niche, format, prompt, workflow, provider, and market maps | An attributable knowledge pack consumed by generators, presets, discovery, workflow routing, or validation |
| UI/reference implementation | a genuinely useful interaction or presentation pattern | The ANIMILL design system only when it improves the existing standard; never a parallel shell |
| Duplicate or unsuitable source | no distinct capability, broken path, unsafe behavior, or incompatible rights | Named replacement or evidence-backed rejection |

## Working state machine

`queued -> runnable -> spline-defined -> connected -> freshly-proven -> cleared`

Terminal variants are `integrated`, `absorbed`, `duplicate`, `rejected`, and
`parked-with-dependency`. A source is not cleared by cloning, reading, cataloging,
reskinning, or opening its HTML in a browser.

## Required record per source

| Field | Meaning |
| --- | --- |
| Source | Repository URL or local folder path |
| Class | Functional nerve, intelligence pack, UI reference, duplicate, or unsuitable |
| Distinct value | The capability or data unavailable elsewhere |
| ANIMILL port | Input/output/state boundary it connects to |
| Consumer | The component or creator action that benefits |
| Mutual benefit | What it receives from existing ANIMILL state/components |
| Offline contract | What works locally and what explicitly requires a service |
| Provenance/rights | Origin and any use constraint that must survive the spline |
| Proof | Fresh input, observed result, and affected visible surface |
| Status | One state from the working state machine or terminal variants |

Update the CSV row when evidence changes a source's state. Never regenerate it
in a way that erases classification, evidence, or terminal decisions.

## Execution order

Work by connected capability lane, not alphabetically and not one repository at
a time in isolation:

1. **Acquire:** browser, scraping, research, and import nerves feed attributable
   source material into the project.
2. **Generate:** prompt, image, video, talking-head, music, voice, and content
   generation nerves create reviewable assets—not hidden final output.
3. **Author:** ANIMILL remains the canonical scene, timeline, transport,
   inspector, and project-state surface.
4. **Render:** HyperFrames, Remotion, FFmpeg, and other render nerves consume the
   reviewed project through explicit adapters.
5. **Publish and learn:** packaging, scheduling, posting, analytics, and domain
   intelligence feed results and better choices back into the same project.

The first thin proof for a lane must cross the whole usable path. MoneyPrinter-
style generation, for example, is cleared only when its research/prompt/media
outputs become editable ANIMILL project material and continue to a declared
render or publishing consumer.

## Immediate queue operation

For each lane, choose the smallest set of repositories that completes one real
path. Exercise their existing function before changing presentation; select one
winner per duplicated role; spline it into ANIMILL; prove the fresh path; then
mark the losing alternatives duplicate or keep them parked for a named missing
capability. This converts the large initialization list into a shrinking queue
instead of a permanent backlog.
