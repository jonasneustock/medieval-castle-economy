# Release status — development build 0.9.0

This is not the acceptance-verified complete first release.

Implemented: deterministic simulation, all 31 functional building definitions and construction commands, all 18 resources and seven recipes, worker logistics, seeded terrain/territory, food/population/taxes/trade/civic services, progression, seasons/events, versioned save/import/export, React UI, Phaser scene, original artwork/pose frames, atlas pipeline and static PWA distribution.

Verified:
* 29 deterministic simulation tests pass.
* Scripted starting-Hamlet-to-City progression passes using ordinary player commands, with all 31 building types present. City unlocked after 250 simulation minutes; all types constructed by minute 348.
* Save roundtrip passes including in-transit recovery.
* Asset export integrity passes: 294 frames, 61 editable OpenRaster sources, no reported errors.
* TypeScript compilation and production Vite/PWA build pass.

Measured synthetic Node simulation performance:
* 5000 residents, 1667 structures: p95 1.63 ms; worst tick 423.95 ms. Cold pathfinding spikes exceed the 250 ms budget.
* 10000 residents, 3292 structures: p95 3.15 ms; worst tick 1090.68 ms. Cold pathfinding spikes exceed the 250 ms budget.

Incomplete/unvalidated release gates:
* Browser startup, critical-console-error and integrated visual checks.
* Actual tutorial-to-City manual playthrough.
* Fresh installation, offline/PWA reload and IndexedDB across Chromium/Firefox/Safari.
* Actual tablet gestures and responsive usability.
* Sustained browser renderer/worker FPS, memory and long-session performance at 5,000–10,000 residents. Node benchmarks exclude browser overhead and natural-resource regeneration.
* Final original-art audit, animation integration and automatic wall/corner/gatehouse connection graphics. Base wall/gatehouse artwork exists, but full connection treatment is unfinished.
* Broader balancing review and elimination of cold-route spikes.

GitHub status: source, tests, build scripts, compiled distribution and runtime artwork have been pushed to https://github.com/jonasneustock/medieval-castle-economy on main. This repository is public. The remaining images are packaged losslessly in art/runtime/remaining-images.json.gz and restored by npm ci; a clean extraction restored 510 image paths and passed validation for 294 assets. Editable high-resolution masters remain in the saved development ZIP. This is still development build 0.9.0; the acceptance gates below remain open.

The reserved private Site has not been deployed; release publication is held because the user's acceptance gates are unmet.

Known art detail gap: fishing, livestock and textile-specific work loops still reuse generic farmer/processor actions; dedicated activity animations and the final integrated art audit remain incomplete.
