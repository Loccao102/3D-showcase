# Next Tasks — Showcase Engine V1

Showcase Engine V1 core is now functionally complete. This file separates completed engine work from production asset/device hardening and vertical-specific work.

## V1 Core — Asset runtime

- [x] load manifest assets by stable IDs
- [x] select responsive asset URLs from manifest LOD entries
- [x] resolve asset slots and `asset-replacement` generically
- [x] create semantic node/material lookup
- [x] expose named anchors
- [x] provide asset loading / ready / failure states
- [x] show a fallback poster before the interactive asset is ready
- [x] keep product-specific traversal out of UI components
- [x] clone runtime materials so configuration does not mutate loader cache
- [x] remove the old procedural automotive renderer path

## V1 Core — Binding engine

- [x] apply `material-color`
- [x] apply `node-visibility`
- [x] apply `asset-replacement`
- [x] apply `animation-state` to semantic asset / slot targets
- [x] restore mutable scene defaults safely
- [x] validate missing mutation targets without crashing the scene
- [x] expose selection snapshot independently from commerce

## V1 Core — Camera director

- [x] resolve named camera presets
- [x] tween camera + target + FOV
- [x] cancel guided motion on direct user input
- [x] hand control back to orbit controls cleanly
- [x] support alternate mobile framing
- [x] provide reduced-motion repositioning
- [x] provide explicit camera reset / return-to-explore flow

## V1 Core — Hotspots

- [x] anchor hotspot to semantic object/node
- [x] project the 3D anchor through a DOM overlay
- [x] active/inactive states
- [x] guided camera transition
- [x] touch-safe/mobile interaction
- [x] basic occlusion through Drei `Html` occlusion
- [x] content remains owned by the host app rather than the renderer

## V1 Core — Device and fallback behavior

- [x] capability-based render quality policy
- [x] enforce DPR policy
- [x] use `frameloop="demand"` for idle efficiency
- [x] reduced-motion behavior
- [x] responsive desktop/tablet/mobile composition
- [x] mobile configurator behaves as a bottom-sheet style surface
- [x] renderer errors keep the DOM shell/fallback available
- [x] direct manipulation outranks guided motion

## V1 Core — Reference vertical proof

The automotive screen is a proof fixture, not part of the engine API.

- [x] manifest-driven exterior color configuration
- [x] manifest-driven whole-asset trim replacement
- [x] three anchored guided hotspots
- [x] multiple camera presets including cabin/detail framing
- [x] node visibility binding example
- [x] configuration snapshot that an optional commerce adapter can consume
- [x] self-owned lightweight glTF reference assets committed in-repo

## Production asset hardening — next

These are content-pipeline/QA tasks and no longer block the generic Showcase Engine V1 architecture:

- [ ] replace the tiny reference glTF with a production-quality licensed/self-created vehicle asset
- [ ] produce real LOD0 / LOD1 / LOD2 geometry
- [ ] validate KTX2/Basis texture delivery on representative browsers
- [ ] validate Meshopt compression/decode tradeoffs on representative devices
- [ ] document measured texture/geometry/network budgets for the production asset
- [ ] validate semantic naming against the production asset
- [ ] provide a real animated clip to exercise the already-implemented `animation-state` runtime path

## Device / performance QA — next

- [ ] record loading timings for the production asset
- [ ] add sustained frame-time telemetry if adaptive degradation is required
- [ ] profile a representative mid-range Android device
- [ ] profile iOS Safari
- [ ] profile tablet landscape/portrait
- [ ] verify production HDR/environment assets have mobile budgets

## Visual/motion polish — next

- [ ] integrate final Vietnamese-capable display/body font pair
- [ ] light-cut arrival reveal
- [ ] perceptual material morph rather than instant color mutation
- [ ] richer spatial product swap transition
- [ ] optional high-tier ambient drift
- [ ] final accessibility audit for contrast, screen reader announcements and keyboard order

## Explicitly deferred

Commerce must consume a generic `ShowcaseSelectionSnapshot`; it must not own the renderer.

Do not prioritize these as Showcase Engine work:

- cart,
- payment,
- order tracking,
- dealer inventory,
- test-drive booking backend,
- enterprise commerce workflows.
