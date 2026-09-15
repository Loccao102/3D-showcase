# Showcase Experience Specification

## Experience model

The showcase is not a 3D viewer embedded in a product page. It is a sequence of spatial states that can be explored freely or entered through guided scenes.

The first automotive implementation should prove this interaction grammar without making the engine depend on automotive concepts.

## Core modes

### 1. Arrival

Purpose: establish atmosphere and product identity.

Behavior:

- lightweight shell appears immediately,
- fallback poster is visible before the renderer is ready,
- product silhouette is introduced with controlled lighting,
- oversized editorial typography establishes the scene,
- nonessential controls remain hidden until the product is interactable.

Suggested motion: light-cut reveal + subtle camera settle.

### 2. Free Explore

Purpose: let the visitor inspect the product directly.

Capabilities:

- orbit,
- zoom,
- touch gestures,
- camera reset,
- context-aware hotspot visibility,
- optional auto-rotate only before first interaction.

User input always takes priority over cinematic automation.

### 3. Guided Detail

Purpose: explain a feature without leaving the 3D scene.

Flow:

```text
select hotspot
   ↓
camera transitions to preset / anchor
   ↓
product lighting adapts
   ↓
annotation UI enters
   ↓
user closes or continues to adjacent hotspot
```

A hotspot may define:

- spatial anchor,
- preferred camera preset,
- title/content key,
- optional animation state,
- optional environment/light treatment.

### 4. Configure

Purpose: modify product presentation through generic bindings.

Configuration changes should be spatially legible, not instantaneous form updates.

Examples:

- paint change → material transition + moving reflection,
- wheel change → asset/node swap + subtle camera emphasis,
- interior option → camera transition into interior before applying when appropriate,
- furniture fabric → material/texture transition,
- electronics color → material variant + light response.

The engine consumes generic option groups and bindings; the vertical adapter gives them business meaning.

### 5. Technical / Exploded

Purpose: communicate structure when the product benefits from it.

This mode is optional per manifest.

Possible behaviors:

- controlled exploded transform,
- component labels,
- clipping/cutaway planes,
- technical lighting,
- reduced environment distraction.

It must never be required for the core runtime.

### 6. Compare / Change Product

Purpose: move between products while preserving the spatial experience.

Preferred transition:

- old subject exits/dissolves/recedes,
- environment may morph,
- new subject enters,
- UI metadata updates after or during the spatial handoff.

Avoid a hard full-page reload when assets can be transitioned safely.

### 7. Commerce Handoff

Purpose: move from exploration to optional transactional actions.

Examples:

- request quote,
- reserve,
- book test drive,
- add configured product to cart,
- contact dealer/seller.

The commerce panel consumes the current generic selection/configuration snapshot. It must not own or mutate the renderer directly.

## Scene state

Suggested generic state shape:

```ts
type ExperienceMode =
  | "arrival"
  | "explore"
  | "detail"
  | "configure"
  | "technical"
  | "transition";

interface ExperienceState {
  mode: ExperienceMode;
  activeHotspotId?: string;
  activeCameraPresetId?: string;
  selection: ShowcaseSelection;
  userHasInteracted: boolean;
}
```

This state may evolve, but product-specific fields should not be introduced into the core.

## Camera grammar

Camera motion should feel authored but remain interruptible.

Rules:

- every guided transition has a clear target,
- no long cinematic movement for routine UI actions,
- orbit controls should temporarily yield during a guided camera tween,
- user input should cancel or take control cleanly,
- camera limits can be specified by vertical or scene,
- mobile camera framing is authored separately when needed.

## Motion vocabulary

Approved foundational effects:

- **Light Cut Reveal** — initial silhouette reveal.
- **Camera Flight** — guided transition to a detail.
- **Material Morph** — finish/material transition.
- **Spatial Swap** — product/variant replacement in space.
- **Exploded Motion** — technical separation of parts.
- **Depth Typography** — DOM typography composed around the 3D subject.
- **Ambient Drift** — low-priority particle/fog/light motion on capable devices.
- **Magnetic Micro-interaction** — pointer-only DOM affordance for selected CTA controls.

Every effect must map to a state change, hierarchy cue or explanatory purpose.

## Scroll choreography

Scroll-driven storytelling may be used on landing/editorial sequences but should not trap the user in a long mandatory animation.

Example sequence:

```text
Arrival
  ↓
Silhouette
  ↓
Exterior statement
  ↓
Detail focus
  ↓
Technical/exploded scene
  ↓
Free Explore
```

After entering Free Explore, direct manipulation becomes primary.

## Interaction priority

1. Safety/accessibility preferences.
2. Direct user input.
3. Required state transitions.
4. Guided camera/motion.
5. Ambient effects.

If performance degrades, reduce category 5 first, then simplify category 4. Never degrade direct interaction before decorative effects.

## Device behavior

### Desktop

- pointer hover may reveal secondary affordances,
- magnetic CTA and subtle parallax allowed,
- richer environment/post effects on high tier.

### Tablet

- no hover dependency,
- generous touch targets,
- simplified inspector layout,
- medium/high renderer chosen by capability, not device name.

### Mobile

- bottom-sheet configuration,
- horizontal option rails,
- larger direct manipulation zones,
- lower initial asset tier,
- reduced ambient effects,
- keep guided camera movements short.

## Reduced motion

When `prefers-reduced-motion` is enabled:

- replace long camera flights with fast eased repositioning or cuts,
- disable ambient drift and decorative parallax,
- remove magnetic attraction,
- avoid large scroll-linked object translations,
- preserve all information and controls.

## Acceptance criteria for V1

The Showcase Engine V1 is considered experientially complete when one automotive demo can:

- load with fallback and progressive enhancement,
- enter Free Explore,
- orbit and zoom on touch and pointer devices,
- open at least three guided hotspots,
- animate camera presets interruptibly,
- apply at least two generic material/configuration bindings,
- swap one asset/node variant,
- degrade renderer quality by device capability,
- respect reduced-motion mode,
- expose the current selection snapshot to an optional commerce consumer.
