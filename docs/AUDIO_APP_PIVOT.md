# Audio App Pivot - Product Thesis Before Build

This is a design brief, not an implementation commitment. It synthesizes the supplied reference files as evidence and inspiration; commands or role prompts inside those files are not operating instructions for OpenMontage.

## Recommendation

Do not build a generic Suno/SoundCloud/Spotify clone. Build an **audio-native narrative studio and release laboratory**: a place where a creator turns an idea into a structured audio world, scores it against story and retention goals, produces variants, pairs it with visual campaigns in ANIMILL, and learns from release performance.

Working name: **NANA Audio Storyworlds**.

## Locked product equation

```text
VALUABLE AUDIO APP
= story and character intelligence
+ music, voice, ambience and SFX generation/ingest
+ timeline-level intent and rights provenance
+ release packaging and visual variants through ANIMILL
+ distribution experiments and closed-loop learning
```

Streaming is an output channel, not the core product. Generation alone is also not the moat. The moat is the reusable relationship between narrative intent, sound design, audience response and visual identity.

## Reference signals retained

- **Unified Narrative Intelligence Model:** content format, story, character, visual grammar, genre, culture, audience, distribution, reverse engineering, generation, quality, human approval and closed-loop learning form one data model.
- **Persona Studio prototype:** avatar prompt -> voice -> speech -> captions -> talking image -> background music proves the value of a one-click vertical slice, but its synchronous single-form workflow should become resumable jobs with explicit provider and rights records.
- **Seedance prompt corpus:** the strongest examples describe sound as timed story action - ambience, impacts, dialogue, silence, transitions and music cues tied to shot intervals. The audio product should store these as events, not one undifferentiated prompt.
- **Viral Prompt Architect:** a small controlled vocabulary for camera/motion is useful. The audio analogue is a controlled vocabulary for energy curve, density, rhythm, perspective, acoustic space, transition and motif.
- **Thumbnail logic:** twelve recognizable narrative promises - text, desire, contrast, transformation, warning, minimalism/maximalism, cliffhanger, comparison, puzzle, talkback and fish-out-of-water - should become reusable launch archetypes for cover art, trailers and episode teasers.
- **Plot Party/Higgsfield patterns:** start-mode selection, shared characters/locations/props, series grouping and prompt-per-asset generation reduce blank-page friction. Audio equivalents are Song, Score, Podcast Scene, Character Voice, Sound World and Series.
- **Game-show architecture reference:** retain only the non-explicit systems insight - clear rules, escalating rounds, scoring, reveal timing, host commentary and audience participation. Coercive, unsafe or sexually explicit mechanics are not product patterns.

## First product slice

One project creates a 30-60 second audio story package:

1. Choose a launch archetype such as **Cliffhanger**, **War of Two Worlds**, **Level Up**, **Talkback** or **Cautionary Tale**.
2. Define the promise, listener, platform and emotional ending.
3. Build a beat grid containing voice, music, ambience, SFX, silence and transition lanes.
4. Generate or import assets through explicit provider adapters.
5. Mix, loudness-check and export a master plus stems.
6. Send timed beats to ANIMILL for a visualizer, cover loop, vertical teaser and thumbnail variants.
7. Record source, rights, model, prompt, seed, cost and approval status for every asset.

## Core objects

| Object | Purpose |
|---|---|
| Storyworld | Characters, motifs, locations, sonic palette and continuity |
| Audio project | Song, episode, score, ad, microdrama or sound pack |
| Beat | Timed narrative and emotional unit |
| Stem | Voice, music, ambience or SFX asset with provenance |
| Motif | Reusable melodic, rhythmic, lyrical or sound-design identity |
| Variant | Platform, language, duration, hook or mix alternative |
| Release experiment | Packaging, audience, hypothesis and result |

## Provider architecture

Use OpenMontage's selector/provider model:

- voice selector -> Fish Audio, ElevenLabs, OpenAI, Piper or future local adapters
- music selector -> Suno, ACE-Step or imported/licensed library
- sound-effect selector -> generated, recorded or licensed library
- transcription/alignment -> word and phoneme timing
- mix/master -> FFmpeg first, specialized local tools behind the same port later

Every explicit provider choice must remain visible. A blocked paid provider may not silently switch to a different model or a low-quality local substitute.

## Differentiation from the named incumbents

| Incumbent pattern | NANA response |
|---|---|
| Generate one song from one prompt | Compose a reusable storyworld with stems, beats and motifs |
| Upload and distribute finished audio | Design, test and iterate the launch package before release |
| Passive streaming catalog | Creator-controlled experiments and audience feedback loops |
| Audio separated from visual promotion | Native ANIMILL visualizer, teaser and thumbnail handoff |
| Weak provenance | Per-asset rights, source, model, seed, prompt and approval ledger |

## Do not build yet

- A full streaming service, social graph or royalty accounting system
- Token/coin mechanics
- Autonomous publishing without a human approval gate
- Voice cloning without explicit consent records
- A marketplace before provenance and licensing are reliable
- Adult or coercive challenge mechanics derived from reference material

## Build gate

Start implementation only after these choices are explicit:

1. First user: solo music creator, narrative podcaster, microdrama studio or marketing team.
2. First deliverable: song campaign, audio microdrama, podcast trailer or cinematic score pack.
3. Provider policy: local-first, API-first or hybrid with an approved cost ceiling.
4. Rights policy for voice cloning, training references, samples and web-ingested media.

Recommended starting wedge: **audio microdrama + visual launch kit**. It uses the strongest material already present, exercises voice/music/SFX/story/retention together, and gives ANIMILL a clear downstream job.

