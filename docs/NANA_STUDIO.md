# NANA Storyworlds

NANA is the local-first audio microdrama authoring desk connected to ANIMILL and OpenMontage. It is not a streaming clone and it does not pretend an unavailable generation provider succeeded.

## Product equation

```text
audio launch package
= narrative promise
+ timed voice/music/ambience/SFX/silence/transition beats
+ explicit provider and rights state
+ local timing preview
+ OpenMontage artifacts
+ editable ANIMILL visual launch timeline
```

## Run

Start the existing ANIMILL bridge, then open the audio desk:

```powershell
cd animill-studio
npm start
```

- ANIMILL: `http://127.0.0.1:4177/`
- NANA: `http://127.0.0.1:4177/nana.html`

## Current connected slice

1. Choose Cliffhanger, War of Two Worlds, Level Up, Talkback, or Cautionary Tale.
2. Rewrite the project promise, audience, beat text, timing, lane, and energy.
3. Preview timing locally. Voice uses the browser/OS speech voice; the other lanes use temporary Web Audio tones. These previews are intentionally not presented as generated masters.
4. Save or download the editable plan.
5. Send the plan to OpenMontage, which writes `nana-project.json`, `audio-beat-plan.json`, `provider-decisions.json`, and `animill-project.json` under the generated project workspace.
6. Build the visual launch kit. NANA generates a production-safe ANIMILL project, navigates to ANIMILL, and ANIMILL consumes the handoff once.

The transport shares ANIMILL's interaction grammar: a remembered Story Engine panel toggle, play/pause from the current position, stop-to-zero, half-second stepping, loop state, click/drag timeline scrubbing, themed controls, and the shared reticle hover-information layer. Space toggles playback, the arrow keys step, `L` toggles looping, and Home stops.

The generated ANIMILL timeline stays inside the currently verified HyperFrames/Remotion compatibility envelope.

## Provider truth

The header reports current readiness without exposing credentials. Local preview and FFmpeg mixing are available on the current machine. Suno, ElevenLabs, OpenAI, Google, and Piper remain locked unless their existing OpenMontage adapters are configured.

No provider is selected, called, or substituted by this first slice. Actual voice, music, and SFX generation is the next gated module and must retain provider, model, prompt, seed where available, cost, source, rights, and human approval records.

## Boundaries

- This is authoring and planning, not autonomous publishing.
- Voice cloning requires explicit consent records and is not implemented here.
- Browser preview audio is a timing aid, not a distributable master.
- OpenMontage's audio mixer, enhancement, probing, and energy analysis remain the production tools behind the future render connection.
