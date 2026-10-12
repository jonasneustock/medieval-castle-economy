# Medieval Castle & Economy

**Development build 0.9.0 — not an acceptance-verified complete release.**

Peaceful frontend-only city simulation using TypeScript, React and Phaser, with no gameplay backend. The binding 100 decisions are retained in docs/NOTION-SPEC.md.

## Run and build

Requires Node 22+ and npm.

    npm ci
    npm run dev
    npm run build

Serve dist/ over HTTPS or localhost. Example: python -m http.server 4173 --directory dist, then open http://localhost:4173. Direct file:// opening is unsupported; modules, Web Workers and service workers need HTTP.

The service worker precaches the shell, worker modules, atlas, UI icons and event art after initial loading. IndexedDB keeps local saves; export before clearing browser storage.

## Included

* All 31 structures, exact confirmed costs and permanent stage unlocks.
* All 18 resources, seven processing recipes, trade, rations, taxes, population, housing and civic services.
* Dedicated workers, single-resource physical transport, buffers and weighted-road routes.
* Seeded 64×64 chunks, adjacent territory purchases, seasons, reserves and warned environmental events.
* Authoritative 250 ms deterministic ticks and four specialized browser workers.
* Phaser isometric scene; React management UI, minimap, pan/zoom, save/import/export and PWA configuration.
* Original building/world art, animated profession poses, seasonal crop states, PNG and editable OpenRaster sources, prompts and atlas pipeline.

## Verification

    npm test
    node --import tsx tests/progression.ts
    npm run benchmark
    npm run assets
    npm run validate:assets
    npm run build

Python packing uses Pillow. The original world exporter additionally needs NumPy/SciPy. Normal npm builds use committed reviewed exports and need no Python.

Actual results are in reports/. The progression script uses ordinary player commands from exact opening conditions, without granting goods or residents. Benchmarks measure Node simulation time, not browser FPS.

Browser acceptance tests are supplied but **not executed here**. In a supported external QA environment, install @playwright/test and browsers, serve dist/ at localhost:4173, then run npx playwright test. Set GAME_URL for another origin.

## Open release gates

* Real browser startup, console errors, integrated visual review and manual tutorial-to-City playthrough.
* Fresh installation, offline/PWA reload and IndexedDB verification in Chromium, Firefox and Safari/WebKit.
* Actual tablet touch/pinch testing.
* Browser renderer/worker stress checks at 5,000–10,000 residents, including sustained FPS and memory.
* Final in-game animation/art audit, automatic wall/corner/gatehouse connection graphics and long-session balancing review.
* Cold-route spikes still exceed the tick budget despite good typical simulation times.

These gates prevent a complete-release claim. Current code/artwork are substantial implementation work, not a verified final product.

## Layout

src/sim/: pure game rules; src/workers/: kernels; src/coordinator.ts: state owner; src/render/: Phaser; src/main.tsx: React; art/: originals/provenance; public/assets/: reviewed exports; scripts/: pipeline; tests/: checks; dist/: runnable build.

No public open-source license has been selected. Original source and artwork are provided to the project owner.

Known art detail gap: fishing, livestock and textile-specific work loops still reuse generic farmer/processor actions; dedicated activity animations and the final integrated art audit remain incomplete.

## Editable artwork masters

This GitHub code snapshot includes production artwork, prompts and runtime assets. High-resolution editable PNG/OpenRaster masters remain in the owner's saved Medieval_Castle_Economy_0.9.0_Development.zip handoff archive (SHA-256 47e2a86bc295b2f67205fabe318356d9e767e7cec38cfbe5b81667f31161008b). Restore its art/source folder before running original-generation exporters or a full source-art audit. Those masters are excluded from this code push to avoid delaying source delivery.
