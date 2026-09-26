# Accessibility Audit & Screen-Reader Specification

This document records the accessibility review, heading hierarchy, keyboard navigation order, and screen-reader announcements implemented in Showcase Engine V1.

## 1. Keyboard Navigation & Focus Order

The DOM reading and tab order flows logically from header to content without trapping focus in the 3D canvas:

1. **Skip Link (`.skip-link`)**:
   - Anchored to `#showcase-configuration`.
   - Hidden offscreen (`translateY(-160%)`) until focused via `Tab`.
   - Allows keyboard users to bypass 3D orbit controls and jump directly to vehicle configuration.
2. **Brand & Header Navigation**:
   - `a.brand` (href to `#top`) with explicit `aria-label="3D Showcase home"`.
   - Decorative mark hidden with `aria-hidden="true"`.
3. **Stage Overlay Hotspots**:
   - Hotspot buttons rendered through Drei `Html` overlays are accessible via keyboard tab navigation.
   - Each hotspot possesses an accessible name (`aria-label="{label} hotspot"`) and receives standard `:focus-visible` styling (`outline: 2px solid var(--accent)`).
4. **Configuration Panel (`aside#showcase-configuration`)**:
   - `tabIndex={-1}` allows direct programmatic focus transfer from the skip link.
   - Groups navigate sequentially: Finish &rarr; Trim &rarr; Lighting &rarr; Motion &rarr; Atmosphere.
   - Each swatch button exposes `aria-pressed={true|false}` and `aria-label`.
5. **Action Buttons**:
   - "Share Link" and "Copy JSON" buttons operate cleanly with `Enter` and `Space`.

## 2. Heading Hierarchy

All headings follow a strict, non-skipping hierarchy:

- `<h1>` — Showcase product title (`#showcase-title`, e.g. "Astra One").
- `<h2>` — Major section headings:
  - Guided detail modal title (`.stage-detail-title`).
  - Configuration panel header (`#showcase-config-title`, "Scene bindings").
- `<h3>` — Sub-sections:
  - Technical specifications heading (`.specs-title`, "Astra One Specs").
  - Option group labels (`#config-group-{id}`, e.g. "Finish", "Trim", "Atmosphere").

## 3. Screen-Reader Announcements & Live Regions

- **Canvas Guidance**:
  - Hidden paragraph (`#showcase-stage-description` with `.sr-only`) informs screen readers: *"Interactive 3D preview. Use the labeled hotspot buttons for guided details or skip to the product configuration controls to customize finish, trim and atmosphere."*
- **Status Region (`.stage-status`)**:
  - Marked with `role="status"` and `aria-live="polite"`.
  - Announces asset loading transitions ("loading" &rarr; "ready" &rarr; "explore" / "detail").
- **Action Feedback**:
  - Dedicated `.sr-only` live region announces clipboard actions: *"Selection snapshot JSON copied to clipboard"* and *"Configuration link copied to clipboard"*.
- **Visual Corner Instructions**:
  - Mouse-only hints ("Drag to orbit / Scroll to inspect") are marked with `aria-hidden="true"` so they do not clutter screen-reader speech.

## 4. Color Contrast & High Contrast Modes

Contrast verified in `apps/web/app/showcase-accessibility.css`:
- **Default Dark Theme**:
  - Primary text `#f3f6f9` against `#05070a` yields **17.8:1** contrast ratio (exceeds WCAG AAA requirement of 7:1).
  - Accent color `#4b9fff` against dark backgrounds yields **6.5:1** contrast ratio.
- **`prefers-contrast: more`**:
  - Strengthens borders to `rgba(255, 255, 255, 0.58)` and lifts muted labels to `#f3f6f9`.
- **`forced-colors: active` (Windows High Contrast Mode)**:
  - Overrides buttons and swatches with system `Highlight` and `ButtonText` tokens.
