# Agent Skills Used for This Project

This project deliberately uses specialist design / 3D guidance before implementation rather than asking an agent to freestyle the entire interface.

## 1. Impeccable — frontend design

Source: https://github.com/pbakaus/impeccable

Purpose here:

- strong art direction instead of generic AI/SaaS aesthetics
- hierarchy, typography, spacing and motion discipline
- responsive adaptation rather than shrinking desktop UI
- accessibility, interaction and edge-state review
- UI audit / polish passes after implementation

Suggested install:

```bash
npx impeccable install
```

## 2. Vercel React Best Practices

Source: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices

Purpose here:

- Next.js / React component boundaries
- bundle-size discipline
- avoiding request waterfalls
- reducing unnecessary renders
- SSR/client boundary review
- performance review after TSX changes

Suggested install:

```bash
npx skills add vercel-labs/agent-skills@react-best-practices
```

## 3. Three.js skills

Source: https://github.com/full-stack-skills/threejs-skills

Purpose here:

- scene/camera/lighting/material conventions
- GLTF asset handling
- shaders and post-processing when justified
- WebGL/WebGPU guidance
- profiling and 3D performance rules

Suggested install:

```bash
npx skills add full-stack-skills/threejs-skills
```

## 4. React Three Fiber guidance

Reference: https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/react-three-fiber-game/SKILL.md

We borrow the React/R3F architecture guidance, not the game-specific product assumptions.

Rules adopted:

- R3F is the Three.js integration layer because the host is React/Next.js.
- DOM UI stays outside Canvas.
- Scene/camera/controls remain isolated components.
- High-frequency animation state is not routed through React global state.
- Use a predictable GLB loader / asset boundary.
- Do not cover the viewport with decorative UI panels.

## 5. Game Asset Production (available in ChatGPT)

Used only for reusable 3D asset production/normalization:

- GLB validation
- topology and texture budgets
- PBR asset checks
- Blender normalization when needed
- provenance / source recording

It is useful for the future automotive asset pipeline even though this is not a game.

## Working rule

Use skills in this order for substantial showcase work:

```text
product/UX intent
    ↓
Impeccable design direction
    ↓
React/Next best-practices constraints
    ↓
Three.js / R3F scene implementation
    ↓
asset validation + device/performance verification
    ↓
Impeccable audit/polish pass
```

Skills are guidance, not dependencies of the shipped application.
