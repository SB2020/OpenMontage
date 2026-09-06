# Existing app operational pass — 2026-09-06

Goal: make the currently exposed ANIMILL editor, Worlds, NANA Generator and Wav2Lip controls usable, connected, keyboard accessible and honest about backend availability before integrating more fragments.

Source list: C:/Users/sover/Downloads/repoMASTERLINKFILE.txt. Its links are future integration inputs, not instructions to install every repository.

Execution order:

1. Restore the NANA runtime and real input/control behavior.
2. Verify editor/timeline/Worlds and render/handoff boundaries.
3. Fix accessibility and waste in the current paths.
4. Record demonstrated results and external blockers.

## Delivered repairs

- Removed the over-broad cleanup expressions that corrupted NANA's primary script and swallowed upload handlers. Added a regression check against the actual local source suite.
- Replaced fake save/rewrite/import/timeline actions with real local settings history, JSON export, decoded audio import and completed-output handoff. Unconnected AI actions explain their limitation instead of simulating work.
- Audio upload decodes actual samples, draws its waveform, provides playback, clamps selection to track length and closes its temporary AudioContext. Zoom reads the existing sample buffer rather than copying it.
- Quality changes no longer clear unrelated gender/orientation selections. Controls have keyboard semantics and state announcements; the waveform has keyboard selection.
- Wav2Lip checks the actual backend route before enabling generation. Its disclosure remains operable while offline. Removed the unverified RTX hardware claim.
- Shared editor/Worlds fields now receive accessible names, including dynamically rebuilt beat fields. Pointer coordinates update at most once per animation frame.
- Remotion version detection reads installed package metadata instead of invoking an unsupported CLI flag.

## Evidence

- 25 targeted tests passed, including the added NANA regression against the actual E-drive source (not skipped).
- Browser: fresh SVG image and two-second WAV input accepted; prompt history and independent quality selection checked during this pass. No NANA script errors after reopening the repaired page.
- Browser: Wav2Lip opens with Enter, exposes both file inputs, and honestly disables Sync Lips while its service is offline.
- Browser: main editor accepted a 3,600,000ms scene, displayed `1:00:00.000`, updated edited text on stage/timeline, and stepped at 24fps.
- Browser: Worlds exposes nine installed device voices. Fresh text `Fresh operational handoff verified` and a selected preview voice were saved; Build in ANIMILL transferred the edited text into the main timeline. Preview voices are device-dependent auditions, not generated audio assets.
- Browser: editor stage grew after closing side panels. Shared field names appear in both inspector and Worlds accessibility trees.
- Fresh local render: Remotion job `87238c28-c1d9-434d-b600-0859eccfed0e`, H.264, 1920×1080, 24 frames at 24fps; MP4 container 1.045333s including AAC padding.
- Fresh local render: Hyperframes job `2331d7ae-9ae2-4cc1-9d59-e046eedc3a69`, H.264, 1920×1080, 24 frames at 24fps, 1.000000s.
- Both actual output frames inspected. Files remain under `renders/<job-id>/`; extracted proof frames under `artifacts/operational-proof/`.

## Not complete / next work

1. NANA generation and Wav2Lip output cannot be proven: nothing listens on port 8000. The two discovered Downloads `nana_server` scripts lack `/api/lipsync`; the inspected NANA merge ZIP did not contain a backend. Need the compatible backend plus installed model, not a fake success or UI-only replacement. Completed-output handoff is implemented but unverified with a real provider result.
2. Cross-engine font parity: both engines render, but the inspected text metrics differ because their font resolution differs. Bundle and use the same licensed local fonts before claiming matching output or disconnected-network reliability. No internet-disconnection test performed.
3. Full-app accessibility certification, exhaustive controls, long-duration render stress and every external provider have not been verified. This is a substantive hardening pass, not a claim that the entire integration program is finished.
4. Lightpanda is unavailable; existing HTTP source inspection works only as single-page metadata inspection, not interactive browsing.

Keep the repository list and new HTML fragments queued until these current boundaries are settled. ANIMILL remains the UI source of truth; OpenMontage is one integration fragment.

Acceptance: real UI interactions and fresh inputs; no simulated provider completion. A visible UI, installed dependency or HTTP 200 is not proof of generation. Do not spend on provider jobs or install new repositories in this pass.
