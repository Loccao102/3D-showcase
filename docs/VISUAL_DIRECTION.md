# Visual Direction — Dark Precision Gallery + Adaptive Environment

## Decision

The default visual language combines two directions:

- **Dark Precision Gallery** — the product is presented like an object in a premium exhibition space rather than a card inside an ecommerce layout.
- **Adaptive Environment** — light, atmosphere, accent color and environmental treatment may change with the showcased product or vertical without changing the core UI system.

This is the baseline for the automotive prototype, but it must remain reusable for furniture, electronics, footwear, industrial products, collectibles and other 3D-first verticals.

## Product hierarchy

The visual hierarchy is deliberately asymmetric:

1. **3D product / spatial scene** — primary.
2. Product identity and current context — secondary.
3. Exploration controls / configuration — tertiary.
4. Commerce actions — optional and visually subordinate.

The page must never look like a conventional ecommerce product-detail page with a 3D viewer inserted into an image slot.

## Desktop composition

Target behavior:

```text
┌──────────────────────────────────────────────────────────────┐
│ Brand / nav                                      01 / 05     │
│                                                              │
│        LARGE EDITORIAL TYPE                                  │
│                                                              │
│                    3D PRODUCT                                │
│                dominant visual field                         │
│                                                              │
│  mode / hotspot                                configuration │
│  selector                                      contextual UI │
│                                                              │
│                    EXPLORE →                                  │
└──────────────────────────────────────────────────────────────┘
```

Guidelines:

- 3D scene should receive roughly **65–75% of visual attention**.
- Avoid permanent heavy sidebars.
- Configuration UI appears contextually and can collapse.
- Large text may visually intersect the 3D composition, but DOM text remains accessible and selectable.
- Navigation should feel editorial, not dashboard-like.

## Mobile composition

Mobile is a separate composition, not a compressed desktop layout.

```text
┌─────────────────────────┐
│ minimal header          │
│                         │
│      3D PRODUCT         │
│       ~55–65vh          │
│                         │
├─────────────────────────┤
│ color / variant chips   │
│ horizontal controls     │
│                         │
│ contextual bottom sheet │
│                         │
│ primary action          │
└─────────────────────────┘
```

Use bottom sheets, horizontal option rails and gesture-friendly interaction zones. Never force the desktop inspector panel into a narrow column.

## Typography

### Display

Primary candidate: **Darker Grotesque**.

Use for:

- hero copy,
- section titles,
- product identity,
- large numerals,
- cinematic scene labels.

Reasons:

- distinctive enough to become part of the visual identity,
- supports Vietnamese,
- strong at oversized display scales,
- avoids the generic geometric-SaaS look.

Suggested weights: 700–900.

### UI / body

Primary candidate: **Be Vietnam Pro**.

Use for:

- labels,
- configuration options,
- product metadata,
- body copy,
- technical specifications,
- prices and commerce UI.

The UI font must preserve clarity for Vietnamese diacritics at small sizes.

### Optional technical alternate

**Space Grotesk** can be evaluated for technical/industrial verticals, but should not replace the Vietnamese body face unless readability remains equal or better.

## Color system

The default shell should remain neutral and dark:

- near-black / graphite background,
- soft off-white text,
- subtle neutral borders,
- product-driven accent colors.

Do **not** hardcode an automotive brand palette into the core design system.

Each showcase manifest may provide optional ambience tokens such as:

```ts
interface ShowcaseTheme {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  glow?: string;
  environmentTone?: string;
}
```

These values affect atmosphere and UI accents but must not compromise text contrast.

## Depth layers

The page is composed in four conceptual layers:

1. **Environment** — background, fog, lighting and atmospheric effects.
2. **3D subject** — the showcased object.
3. **Spatial editorial layer** — oversized type, scene labels, counters and decorative guides.
4. **Interaction layer** — accessible DOM controls, configurator, CTA, dialogs and bottom sheets.

Do not move critical interactive text into WebGL merely to achieve depth.

## Surface language

Preferred:

- transparent or near-transparent overlays,
- hairline borders,
- subtle blur only when content requires separation,
- large negative space,
- deliberately oversized typography,
- small technical labels and counters,
- asymmetric alignment.

Avoid:

- card grids around the hero,
- excessive rounded rectangles,
- neon cyberpunk styling by default,
- glassmorphism everywhere,
- permanent floating dashboards,
- gradients used as decoration without relation to the scene.

## Motion relationship

Visual design and motion are inseparable in this project. Motion should communicate changes in state or space:

- camera travel communicates a new product context,
- light sweep confirms a material change,
- exploded motion explains construction,
- depth/parallax reinforces spatial hierarchy,
- scene transition communicates a vertical/product change.

See `MOTION_TYPOGRAPHY.md` for the detailed motion rules.

## Adaptive environment examples

### Automotive

- glossy studio floor,
- long area lights,
- controlled reflections,
- slow moving highlights,
- low ambient fog where appropriate.

### Furniture

- warmer light,
- softer environment,
- room-scale spatial anchors,
- less aggressive reflections.

### Electronics

- tighter macro camera language,
- controlled rim lighting,
- technical labels,
- optional exploded-component presentation.

The environment changes; the showcase runtime and interaction grammar do not.

## Accessibility and fallbacks

- All critical controls remain DOM-based.
- Keyboard and touch interactions are first-class.
- `prefers-reduced-motion` disables nonessential movement.
- Low capability devices receive a simplified render policy.
- If WebGL is unavailable, provide image/video fallback plus equivalent product information and configuration controls.

## Design acceptance checklist

A screen is not ready for implementation unless:

- the product remains the dominant element,
- the layout works at phone, tablet and desktop sizes,
- Vietnamese diacritics are tested in display and UI fonts,
- the design can accept a non-automotive product without structural redesign,
- motion has a defined functional purpose,
- low-performance and reduced-motion behavior are specified,
- commerce UI can be removed without breaking the experience.
