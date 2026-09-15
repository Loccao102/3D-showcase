# Design Research — 3D Showcase

This document is a pre-implementation design study. No production UI should be finalised before these references and principles are reviewed.

## Product position

The product is a **3D showcase platform first**. Automotive is only the first vertical. The visual language therefore must feel premium, spatial and product-centric without depending on car-specific metaphors.

## Real-world references

### 1. Morgan Motor Company configurator

Reference:
- https://configure.morgan-motor.com/supersport
- https://configure.morgan-motor.com/plusfour
- https://wonderlandengine.com/news/morgan-motor-case-study/

What to learn:
- Keep the product as the dominant visual object.
- Configuration controls stay subordinate to the rendered object.
- High-fidelity client-side 3D can still be designed for mobile as a first-class target.
- Product materials, lighting and reflections matter more than decorative UI.
- Fast option changes must preserve visual continuity.

Do not copy:
- Traditional automotive tab naming.
- Brand-specific dark luxury styling.

### 2. Lucid Air / ZeroLight purchase journey

Reference:
- https://zerolight.com/customers/the-lucid-air-purchase-journey

What to learn:
- The 3D model is the continuous source of truth through the purchase journey.
- Environment and camera can change while configuration state persists.
- Exterior, interior, wheels and features work as progressive layers instead of separate product pages.
- Guided exploration and free exploration can coexist.
- Same experience should be reachable across device classes.

Do not copy:
- Cloud pixel streaming architecture.
- Automotive-only hierarchy.

### 3. Polestar configurator / product language

Reference:
- https://www.polestar.com/

What to learn:
- Aggressive use of negative space.
- Very little chrome around the product.
- High-contrast typography and restrained controls.
- Strong grid alignment gives a technical/editorial feel without looking like a dashboard.

### 4. Porsche configurator

Reference:
- https://models.porsche.com/en-VN/model-start

What to learn:
- Product selection should be visually obvious before configuration begins.
- Saved configuration and resumable sessions are important.
- Specifications and commercial information should be available without covering the product.

### 5. Stripe Press 3D books

Reference:
- https://press.stripe.com/
- https://www.webgpu.com/showcase/3d-books-by-stripe-press/

What to learn:
- Keep real content and text in DOM; use WebGL for the spatial product layer.
- Scroll can behave like a camera rig.
- A physical object can transition continuously from list state to detail state.
- 3D should enhance browsing semantics rather than replace them.

This reference is particularly important for the generic showcase architecture because the same interaction model works for books, cars, furniture, electronics or collectibles.

### 6. MANA Yerba Mate

Reference:
- https://www.webgpu.com/showcase/mana-yerba-mate-animated-shopify-store/

What to learn:
- Product worlds can have distinct ambient palettes and particles.
- Scroll-driven 3D, illustration and DOM can be layered together.
- Motion can establish brand identity rather than acting only as transition polish.

Do not copy:
- Cartoon art direction.
- Constant high-energy movement.

### 7. GRAIR cinematic jewelry experience

Reference:
- https://www.webgpu.com/showcase/grair-cinematic-threejs-jewelry-experience/

What to learn:
- Lighting, framing and silence can be stronger than dense geometry.
- Negative space can make a single product feel expensive.
- Scroll-to-camera choreography can create a cinematic product story.

## Chosen art direction

Working name: **Spatial Editorial / Precision Theatre**.

The interface should feel like a product is being presented on a digital stage rather than shown inside an ecommerce template.

Principles:

1. **3D owns the stage.**
   - The primary viewport is visually dominant.
   - UI floats around or over the perimeter, never boxing the product in unnecessarily.

2. **Editorial DOM, cinematic WebGL.**
   - Product name, price, specs, CTA, accessibility text and configuration controls remain semantic HTML.
   - WebGL is responsible for product, spatial light, environment and spatial effects.

3. **Motion has hierarchy.**
   - Camera motion = major navigation.
   - Object/material motion = configuration feedback.
   - DOM motion = interaction feedback.
   - Decorative motion = ambient only.

4. **Generic by design.**
   - No permanent steering-wheel, road, garage or dashboard visual language in the core UI.
   - A vertical can provide its own scene/environment skin.

5. **Performance is part of art direction.**
   - Quality tiers change shadows, effects, particles, reflections and LOD.
   - Mobile is not a reduced desktop layout; it has its own camera framing and control ergonomics.

## Proposed page composition

### Landing / discovery

- Full-viewport hero with one flagship 3D product.
- Oversized typography partially crossing the 3D silhouette.
- Slow camera drift rather than auto-rotation.
- Product family switcher behaves like a spatial carousel.
- Scroll begins a cinematic reveal sequence rather than immediately moving to a card grid.

### Product showcase

Desktop:
- 65–75% viewport for 3D.
- Thin navigation rail or floating edge controls.
- Configurator panel appears contextually rather than permanently occupying a large sidebar.
- Product details use compact editorial blocks.

Mobile:
- 3D takes the upper ~55–65vh.
- Bottom sheet configuration controls.
- Large touch targets.
- Horizontal option rails.
- Camera presets replace precise orbit gestures where useful.

### Detail storytelling

Use scroll sections to drive:
- camera dolly
- camera orbit
- exploded component view
- hotspot focus
- interior/exterior transition
- material/light change

The page should never become a long sequence of static marketing cards unless WebGL is intentionally degraded.

## Anti-patterns

Avoid:
- Glassmorphism everywhere.
- Neon cyberpunk as the default identity.
- Permanent 3-column SaaS layout.
- Excessive gradients around every panel.
- Auto-rotating the product continuously.
- Giant WebGL canvas containing text/buttons that should be DOM.
- Hover-only interactions.
- Scroll hijacking without a reduced-motion fallback.
- Heavy particles on mobile.

## Implementation gate

Before production UI implementation, create three visual explorations:

1. Light editorial studio
2. Dark precision gallery
3. Adaptive environment driven by product/vertical

Select one primary direction and one alternate before building the final component system.
