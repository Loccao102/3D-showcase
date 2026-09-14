# Typography & Motion Direction

## Typography goal

The type system must support Vietnamese correctly and still feel distinctive enough for a premium creative-tech product.

### Primary recommendation

#### Display / hero: Darker Grotesque

Why:
- Original Vietnamese typeface.
- Supports Vietnamese natively.
- Post-modern / brutalist grotesque personality gives the showcase a recognisable voice.
- Works well at oversized display sizes and tight tracking.
- Open-source.

Use for:
- Hero titles
- Product names
- Section statements
- Large numeric moments

Recommended weights:
- 700–900 for hero
- 600–700 for section titles

Do not use it as the only body font at very small sizes.

#### Body / UI: Be Vietnam Pro

Why:
- Designed specifically around Vietnamese readability and diacritics.
- Stable for dense UI, specifications, configuration labels and long-form text.
- Large family with italic support.
- Open-source and web-friendly.

Use for:
- Navigation
- Buttons
- Configurator controls
- Specs
- Body copy
- Forms

### Alternate pair

**Space Grotesk + Be Vietnam Pro** if the selected visual direction becomes more technical and less editorial. Space Grotesk explicitly includes Vietnamese language support and has an engineering/creative-tech personality.

### Optional experimental display candidate

**Bricolage Grotesque** may be tested for campaign headings because its variable axes and irregular grotesque details are visually expressive and it supports Vietnamese. It should not be added as a third production font without a clear reason.

## Typographic behaviour

Hero typography should be spatial rather than decorative:
- Responsive `clamp()` scale.
- Tight tracking at large sizes.
- Lines can move behind/in front of the 3D silhouette using DOM/WebGL depth composition.
- Character or word reveal should be used only on major scene transitions.
- Product values/numbers should use tabular figures where possible.

Example tone:

> KHÔNG CHỈ NHÌN.
> CHẠM VÀO THIẾT KẾ.

Avoid uppercase Vietnamese for all body copy; keep uppercase mostly for short display statements.

---

# Motion system

Motion should feel authored and spatial, not like a collection of random animation presets.

## Layer 1 — Cinematic scene motion

Technology:
- React Three Fiber / Three.js
- GSAP timelines for deterministic camera choreography

Effects:
- Camera dolly from macro detail to full-product reveal.
- Orbit transitions between named camera presets.
- Focus pull using depth-of-field only on capable devices.
- Light sweep across material during configuration change.
- Product reveal from controlled darkness instead of generic fade-in.
- Exploded-view component separation for technical storytelling.
- Scene/environment crossfade through shader or exposure/light transitions.

## Layer 2 — Product response

Configuration must visibly affect the object within ~100–200 ms of input.

Effects:
- Material interpolation instead of hard colour pops where physically plausible.
- Wheel/component replacement with a short scale/opacity/rotation handoff.
- Selected component gets a restrained rim-light or emissive pulse.
- Camera subtly reframes the affected area when the user requests detail mode.

Never animate a configuration in a way that makes the user uncertain about the final selected option.

## Layer 3 — DOM / UI motion

Effects:
- Magnetic CTA on pointer devices only.
- Floating panel with tiny perspective/parallax response.
- Direction-aware hover underline or edge reveal.
- Configurator bottom sheet using spring motion.
- Shared-layout transition from product card → showcase.
- Price/spec changes using masked number transitions, not bouncing counters.
- Cursor-follow labels for hotspots on desktop only.

## Layer 4 — Ambient motion

Optional scene ambience:
- Fine suspended dust / micro-particles.
- Reflection movement.
- Slow volumetric light variation.
- Very subtle floor caustics or moving gradient light.
- Environment-specific effects supplied by vertical themes.

Particles are never a permanent requirement of the core engine.

## Signature transitions

### 1. Light-cut reveal

A thin light travels over the object and progressively reveals materials/geometry from darkness. Used once during initial flagship reveal.

### 2. Spatial portal product switch

When switching products, the old product moves backward and dissolves through a depth/stencil/shader mask while the new product enters from the same camera composition. Avoid page reload feeling.

### 3. Hotspot flight

Click hotspot → camera eases to a composed detail shot → DOM annotation enters after camera reaches ~70% progress → back action returns to the saved camera pose.

### 4. Configuration pulse

Changing material/part gives a 250–450 ms controlled visual confirmation: reflection sweep, local light pulse or micro camera adjustment.

### 5. Scroll choreography

Scroll controls a bounded sequence of named scenes rather than continuously mapping every pixel to arbitrary camera coordinates.

Example:
- Scene 0: hero
- Scene 1: silhouette
- Scene 2: material detail
- Scene 3: component/exploded view
- Scene 4: free explore

## Device policy

### High tier
- Full particles
- Post-processing
- DOF when useful
- Higher reflection quality
- Complex shader transitions

### Medium tier
- Reduced particles
- Simplified post FX
- Same camera choreography
- Lower reflection/shadow quality

### Low tier / constrained mobile
- No ambient particles
- No DOF
- Minimal shader transitions
- Prefer camera cuts/eases and material fades
- Static poster fallback available before 3D loads

## Accessibility

Respect `prefers-reduced-motion`:
- Camera transitions become short crossfades or direct preset changes.
- Disable parallax, magnetic buttons, ambient particles and depth zooms.
- Keep all configuration functionality intact.

Motion may enhance comprehension, but no critical feature may require motion to be understood.

## Libraries

Preferred:
- GSAP for scene timelines / ScrollTrigger where needed.
- Framer Motion / Motion for DOM shared-layout and spring interactions.
- R3F `useFrame` only for true frame-loop animation, never as a general UI state mechanism.

Do not add a smooth-scroll library by default. Native scrolling remains the baseline; introduce one only if the selected art direction demonstrably benefits and mobile/reduced-motion behaviour remains clean.
