# Next Tasks — Showcase Engine V1

Showcase Engine V1 core is now functionally complete. This file separates completed engine work from production asset/device hardening and vertical-specific work.

## V1 Core — Asset runtime

- [x] load manifest assets by stable IDs
- [x] select responsive asset URLs from manifest LOD entries
- [x] resolve asset slots and `asset-replacement` generically
- [x] create semantic node/material lookup
- [x] expose named anchors
- [x] provide asset loading / ready / failure states
- [x] emit per-asset readiness/error duration for host telemetry
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
- [x] semantic animation clip committed in both reference assets for `animation-state` testing

## Production asset hardening — next

The runtime plumbing and CI gate for production delivery are now present, but browser/device validation stays open until a real asset exists.

- [x] keep Meshopt enabled through the generic Drei `useGLTF` path
- [x] support optional KTX2/Basis textures through manifest delivery metadata
- [x] self-host the Basis transcoder from the installed Three.js version before dev/build
- [x] keep Draco explicit opt-in so normal assets do not create a hidden decoder dependency
- [x] validate configured `.gltf` / `.glb` assets against semantic node, material, animation and byte-budget contracts in CI
- [ ] replace the tiny reference glTF with a production-quality licensed/self-created vehicle asset
- [ ] produce real LOD0 / LOD1 / LOD2 geometry
- [ ] validate KTX2/Basis texture delivery on representative browsers using the production asset
- [ ] validate Meshopt compression/decode tradeoffs on representative devices
- [ ] document measured texture/geometry/network budgets for the production asset
- [ ] validate semantic naming against the production asset
- [ ] provide a production animation clip and bind it through the vertical manifest

## Device / performance QA — next

- [ ] record loading timings for the production asset
- [x] expose per-asset load/readiness durations to the host
- [x] add active-frame telemetry for demand rendering
- [x] add sustained frame-time adaptive quality degradation with cooldown
- [x] degrade DPR/shadows/post-processing without touching selection or camera state
- [ ] profile a representative mid-range Android device
- [ ] profile iOS Safari
- [ ] profile tablet landscape/portrait
- [ ] verify production HDR/environment assets have mobile budgets

## Visual/motion polish — next

- [x] integrate Darker Grotesque + Be Vietnam Pro as self-hosted Vietnamese-capable display/body fonts
- [x] light-cut arrival reveal with reduced-motion fallback
- [x] perceptual material color morph instead of instant mutation
- [x] generic spatial asset replacement entrance with reduced-motion fallback
- [x] high-tier ambient drift implemented as CSS-only presentation so `frameloop="demand"` stays idle
- [x] keyboard focus-visible and increased/forced-contrast fallbacks
- [ ] manual accessibility audit for screen-reader announcements, keyboard order and measured contrast

## Explicitly deferred

Commerce must consume a generic `ShowcaseSelectionSnapshot`; it must not own the renderer.

Do not prioritize these as Showcase Engine work:

- cart,
- payment,
- order tracking,
- dealer inventory,
- test-drive booking backend,
- enterprise commerce workflows.
