# Defaults chosen within the closed specification

The 100 decisions remain binding. No new requirements questionnaire was opened.

* Keep: one administrative seat permits taxation. A replacement costs 50 wood, 50 stone and 250 gold; decisions 91–99 did not actually quote a replacement Keep price despite saying the schedule was complete. The initial Keep is free and cannot be demolished.
* Treasury: +5 administrative popularity when a Keep is operational.
* Chapel: up to +10 popularity, scaled against 200 residents per chapel.
* Tavern: up to +10 popularity, scaled against 200 residents per tavern. Consumes 1 ale per 100 residents per minute with integer accumulation.
* Fairground: up to +10 popularity, scaled against 500 residents per fairground.
* Baseline popularity: 50. Migration accumulates distance from 50 per tick and changes one resident per 120 accumulated points, equivalent to 2 × distance from 50 residents per minute. Housing bounds immigration.
* Food shortage at nonzero selected rations gives the same −50 food modifier as no rations. Whole food units are consumed with a rational accumulator, denominator 4,800. Round-robin selection distributes consumption across available types; diversity begins with actual consumption.
* Goods and buffers use whole units. Gold uses 1/12,000 gold increments. Taxes add tax × residents per tick, exactly.
* Local forest reserves: 80; minerals: 200; fish: 120; wildlife: 60. Regeneration uses integer remainders.
* Extraction requires a matching node within 12 Manhattan tiles. Fixed nearest node selection breaks ties by stable ID. The specification did not quote an extraction radius.
* Crop maturity accumulates in spring/summer, up to 720,000 integer hundredths of a tick. Maturity proportion scales autumn harvest credit; late farms get a partial harvest.
* Pickup/unloading each take two ticks. Source inventory is physically reserved when a job begins and is represented by that job until transfer.
* A* direction order: north, west, east, south; equal scores prefer smaller remaining heuristic, then insertion sequence. Roads cost one tick per tile; off-road two. Route costs and stable IDs break logistics ties.
* Buildings/walls block their footprints; gatehouses are traversable. Inventory is pooled, with deliveries selecting physical storage.
* Demolition gives no construction refund. Buffered goods enter storage where space permits; excess is lost. Final Keep, granary and stockpile are protected. Travelling production buildings cannot be demolished.
* Rivers use world-coordinate functions; guaranteed initial/adjacent resources are seed-stable. No elevation.
* Fixed buy/sell prices are listed in src/sim/catalog.ts; sell prices are lower.
* Speed/pause are presentation preferences, not canonical save state. Save state preserves authoritative ticks, PRNG, clocks and partial progress.
* Built-in imagegen created original raster artwork. Prompts and originals are supplied. Repeated model calls are not pixel-identical; export/packing from supplied sources is deterministic.
* OpenRaster retains editable raster art and transparency, not reconstructed vector architectural components.
