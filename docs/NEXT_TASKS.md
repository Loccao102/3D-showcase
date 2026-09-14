# Next Tasks — Showcase Engine V1

This file is the short operational backlog. The full sequence and rationale live in `ROADMAP.md`.

## P0 — First real asset

- [ ] select a legal/reusable vehicle GLB or create one
- [ ] inspect geometry/material structure
- [ ] normalize node/material names
- [ ] create fallback poster
- [ ] define LOD0 / LOD1 / LOD2 strategy
- [ ] test KTX2 texture workflow
- [ ] test Meshopt compression
- [ ] record final asset budget

## P0 — Runtime asset registry

- [ ] load manifest assets by stable IDs
- [ ] create semantic node/material lookup
- [ ] expose named anchors
- [ ] provide asset loading states and failures
- [ ] keep product-specific traversal out of UI components

## P0 — Binding engine

- [ ] apply `material-color`
- [ ] apply `node-visibility`
- [ ] apply `asset-replacement`
- [ ] apply `animation-state`
- [ ] restore defaults safely
- [ ] validate missing targets without crashing the scene

## P0 — Camera director

- [ ] resolve named camera presets
- [ ] tween camera + target
- [ ] cancel tween on direct user input
- [ ] restore orbit controls cleanly
- [ ] support alternate mobile framing
- [ ] reduced-motion behavior

## P0 — Hotspots

- [ ] anchor hotspot to object/node
- [ ] project anchor to DOM overlay coordinates
- [ ] active/inactive states
- [ ] guided camera transition
- [ ] mobile interaction
- [ ] basic occlusion strategy

## P1 — Visual shell

- [ ] Dark Precision Gallery base tokens
- [ ] Darker Grotesque display integration
- [ ] Be Vietnam Pro UI/body integration
- [ ] editorial hero composition
- [ ] contextual desktop configurator
- [ ] mobile bottom sheet
- [ ] accessible focus/keyboard states

## P1 — Motion vocabulary

- [ ] light-cut arrival reveal
- [ ] material morph
- [ ] depth typography choreography
- [ ] spatial product/variant swap
- [ ] ambient drift for high tier
- [ ] reduced-motion equivalents

## P1 — Performance

- [ ] quality-tier telemetry
- [ ] loading timings
- [ ] measure FPS/frame time during direct interaction
- [ ] enforce DPR policy
- [ ] test mid-range Android device profile
- [ ] test iOS Safari profile
- [ ] test tablet layout
- [ ] verify no ambient effect outranks direct interaction

## P2 — Automotive vertical proof

- [ ] exterior paint configuration
- [ ] wheel/trim replacement
- [ ] three exterior hotspots
- [ ] interior camera preset
- [ ] specification panel
- [ ] configuration share state

## Explicitly deferred

Do not prioritize these until Showcase Engine V1 is convincing:

- cart,
- payment,
- order tracking,
- dealer inventory,
- test-drive booking backend,
- enterprise commerce workflows.
