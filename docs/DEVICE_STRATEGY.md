# Multi-device Strategy

The showcase must adapt, not merely shrink.

## Input modes

Support all of these from the start:

- mouse / trackpad
- touch
- keyboard
- reduced-motion preference

3D interaction is enhanced interaction. Every critical product action remains available in normal DOM controls.

## Render tiers

The web host resolves a render tier before mounting expensive content.

### Low

Target: older phones, integrated GPUs, battery-sensitive devices.

- DPR cap: 1.0
- no post-processing
- lower texture resolution
- simplified reflections/shadows
- lower-poly LOD where available
- render-on-demand where possible

### Medium

Target: modern phones/tablets and mainstream laptops.

- DPR cap: 1.5
- standard environment lighting
- restrained shadows
- medium texture/mesh LOD
- render-on-demand for static configurator states

### High

Target: capable desktops/laptops.

- DPR cap: 2.0
- highest supplied LOD
- higher-quality environment/reflections
- optional restrained post-processing

Do not infer quality from screen width alone. Width is a layout concern, not a GPU capability signal.

## Layout behavior

### Mobile

- full-width stage
- bottom-sheet controls
- large touch targets
- compact hotspot labels
- progressive disclosure for specifications
- configuration options remain reachable without gestures

### Tablet

- stage-first layout
- docked or collapsible configuration panel
- touch and pointer both supported

### Desktop

- large immersive stage
- side configuration rail / contextual details
- pointer hover enhancements allowed, never required

## Loading strategy

1. Server-render product shell and fallback visual/content.
2. Detect client capabilities.
3. Load the showcase bundle lazily.
4. Load the minimum viable asset first.
5. Upgrade textures/LOD when the device and connection justify it.
6. Keep a poster/gallery fallback if WebGL fails.

## Asset budgets

Initial targets; refine with real assets and telemetry.

- First interactive scene payload: aim for <= 8 MB on mobile.
- Desktop high-quality asset set: aim for <= 20–30 MB initial, stream optional details later.
- Prefer compressed GLB + KTX2 textures.
- Avoid 4K textures where their texel density is invisible.
- Split optional interiors/details into lazy asset chunks if useful.

## Runtime rules

- No React state updates every frame.
- Mutate scene refs inside `useFrame` only for animation-critical values.
- Clamp DPR.
- Avoid unnecessary transparent materials and real-time lights.
- Reuse geometry/material instances where appropriate.
- Keep DOM overlays outside the Canvas.
- Pause or reduce rendering when the page is hidden.
- Respect `prefers-reduced-motion`.

## Accessibility fallback

The product must still be understandable if a user cannot or does not operate the 3D viewport. Provide:

- semantic product title/description
- image/poster fallback
- DOM configuration controls
- DOM hotspot/detail list
- visible focus styles
- keyboard-accessible camera preset controls where meaningful
