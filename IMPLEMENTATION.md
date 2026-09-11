# Implementation checkpoint

The earlier technical audit was not present in the supplied context or repository. Work continued in dependency order from the existing config.js.

## Completed and verified

1. Added the missing test runner and loaded config before its consumers. Fixed-step simulation remains 120 Hz with the original frame cap.
2. Added car selection, balanced/grip/speed tuning, setup summaries and distinct body styles. Vehicle parameters scale the existing physics; default GT calibration is compared directly with the original committed implementation. Collision geometry and checkpoint/recovery rules remain intact. AI retains predictive corner braking, traffic avoidance and lookahead steering, with setup and road-width awareness.
3. Added Coastal Circuit, Mountain Pass and Desert Highway selection, procedural environment differences, width-correct roads, bounds-fitted maps and dynamic labels. Replaced world/car GPU buffers are released.
4. Added versioned local profiles, finish-only XP, level unlocks, saved selection and per-track best laps. Existing coastal records migrate. Invalid saves and unavailable storage do not prevent racing; session-only status is visible. Each race can award XP only once.

## Progression

- Level 1: APEX GT, Comet S, Coastal Circuit.
- Level 2 (500 XP): Vortex R, Mountain Pass.
- Level 3 (1,000 XP): Titan V8, Desert Highway.
- A completed race earns `(200 + (7 - position) * 50) * track multiplier`, rounded to whole XP. No XP for abandoned races. Levels cap at 50.

## Verification

`npm test` and `npm run check` run syntax checks for all root JavaScript files and 12 regression/integration groups. Coverage includes deterministic simulation, original GT calibration, ordered checkpoints, reverse movement, recovery, predictive braking, all-track AI race completion, finite generated geometry, profile validation/migration, and application lifecycle integration.

The application integration test uses DOM/WebGL doubles. Real-browser visual quality, shader execution, audio and touch behavior still require manual verification. The original-GT comparison currently requires Git and the repository's initial commit c24b67b.

## Suggested next verification

In a WebGL-capable browser, check each environment and vehicle, narrow/short viewport scrolling, touch driving, audio, and storage persistence across reloads. The configured reference-lap values remain content metadata; time-based rewards and additional race modes have not been implemented.
