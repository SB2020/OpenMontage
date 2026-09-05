# NANA Studio archive audit

Date: 2026-09-05
Source reviewed: `E:\e-drives\nana_master_suite.html`

This is a triage record, not a redesign. The archive remains recoverable in the source, but it is not part of the active authoring surface.

## Keep in the active product

- **NANA Generator** — review-first output preview; provider state is visible.
- **Wav2Lip Lip-Sync** — real local `/api/lipsync` upload and job-polling path. This was not removed.

## Salvage as content, not as active UI

- **Prompt Vault, Drama Studio, Brand Story, Branding, Spec Studio, Spec Ads, Viral, Competitor, SEO** — useful genre/workflow/content maps, but the current controls are mostly local presentation or simulated feedback. Preserve the ideas and prompt data for later ANIMILL-native workflows.
- **Music Hub** — useful release metadata concept; the current “connected” platform badges and track rows are not verified integrations.

## Park until a real local/API contract exists

- **ACE-Step, ACE-Step DAW, Audio Editor/Audacity** — potentially valuable offline audio paths, but the current source contains fake waveform generation, simulated pipe responses, and external-service assumptions. They should return only with a tested service/pipe contract and a real file/job round trip.
- **AI Avatar / Stylist** — potentially useful generation lanes, but no verified local execution path in this source.

## Discard from the active product surface

- **Advanced Scheduling, Platform Linking, Automation Engine, AdSense Monitor, Pricing** — business/operations mockups, not authoring primitives. Keep as reference only until separately rebuilt against real connectors.

## Standardization gate

Do not re-expose an archived module until it has: (1) a real input/output contract, (2) an observable success/failure state, and (3) one verified end-to-end test. The active surface stays intentionally small while ANIMILL UI standards are applied.
