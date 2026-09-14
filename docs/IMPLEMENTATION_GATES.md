# Implementation Gates

These gates prevent the project from drifting into a conventional ecommerce build before the reusable showcase engine is mature.

## Gate 1 — Design before production UI

Before implementing a production-facing showcase screen:

- identify the scene/state it represents,
- define desktop/tablet/mobile composition,
- define reduced-motion behavior,
- define renderer quality fallback,
- verify Vietnamese typography,
- confirm the layout still makes sense for at least one non-automotive product.

If these are not defined, implementation should remain a prototype.

## Gate 2 — Asset contract before vertical code

Before adding product-specific rendering logic:

- normalize semantic node names,
- normalize configurable material names,
- define anchors/hotspots,
- define LOD strategy,
- define fallback asset/poster,
- express the product through the generic manifest first.

If a vertical requires custom renderer code, first check whether the requirement can become a generic engine capability.

## Gate 3 — Motion purpose

Every major animation must answer at least one question:

- What state changed?
- What spatial relationship is being explained?
- What hierarchy cue is being reinforced?
- What user feedback is being communicated?

Animations that answer none of these should be removed.

## Gate 4 — Direct interaction wins

Cinematic motion must never fight user input.

Required behavior:

- camera tweens are interruptible,
- orbit/zoom handoff is clean,
- touch remains responsive,
- active transitions cannot lock the user into long sequences,
- ambient effects are the first thing to degrade under load.

## Gate 5 — Mobile is not a fallback

A showcase feature is incomplete until tested as a first-class mobile interaction.

Check:

- touch target size,
- gesture conflicts,
- bottom-sheet behavior,
- scene framing,
- GLB/texture tier,
- DPR limits,
- hotspot usability,
- orientation changes,
- loading on constrained connections.

## Gate 6 — Core remains domain-neutral

Reject changes to `showcase-core` that introduce concepts such as:

- car,
- wheel,
- dealer,
- test drive,
- cart,
- checkout,
- furniture,
- sneaker,
- electronics.

Core types should describe generic scene, option, asset, binding, camera and interaction concepts.

## Gate 7 — Commerce cannot own the scene

Commerce receives a snapshot of the current showcase selection/configuration.

It must not:

- traverse Three.js nodes,
- mutate renderer state directly,
- own camera state,
- own material bindings,
- require checkout concepts inside `showcase-core`.

## Gate 8 — Performance before decorative expansion

Before adding new visual effects:

- measure current load size,
- measure frame behavior on representative devices,
- identify the effect's quality-tier behavior,
- define how it turns off or simplifies,
- ensure product manipulation stays responsive.

## Gate 9 — Real vertical proof before SDK claims

Do not market the architecture as a generic platform until at least two meaningfully different verticals use the same core successfully.

Automotive is proof #1. A later furniture/electronics/footwear or industrial vertical should be proof #2.

## Gate 10 — Definition of done

A showcase feature is done only when:

- it works in the intended scene,
- it is represented through generic contracts where possible,
- desktop/tablet/mobile behavior is defined,
- reduced motion is supported,
- fallback behavior exists,
- performance impact is acceptable,
- CI remains green,
- documentation is updated when the public contract changes.
