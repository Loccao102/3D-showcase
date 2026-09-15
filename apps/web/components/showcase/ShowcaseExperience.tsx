"use client";

import {
  createDefaultSelection,
  resolveRenderPolicy,
  resolveSelectionBindings,
  selectOption,
  type RenderPolicy,
  type ShowcaseManifest,
} from "@showcase/core";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const ShowcaseViewport = dynamic(() => import("./ShowcaseViewport"), {
  ssr: false,
  loading: () => (
    <div className="showcase-loading" role="status">
      <span>Preparing 3D view</span>
    </div>
  ),
});

const manifest: ShowcaseManifest = {
  id: "automotive-concept-01",
  slug: "automotive-concept-01",
  title: "Astra One",
  subtitle: "Automotive is the first vertical. The engine is not car-specific.",
  scene: {
    assets: [],
    environment: {
      preset: "studio",
      intensity: 0.8,
      background: "#090b0f",
    },
    defaultCameraPresetId: "hero",
  },
  optionGroups: [
    {
      id: "finish",
      label: "Finish",
      selection: "single",
      defaultOptionIds: ["finish-graphite"],
      options: [
        {
          id: "finish-graphite",
          label: "Graphite",
          bindings: [
            { type: "material-color", target: "body", value: "#2b3038" },
          ],
        },
        {
          id: "finish-silver",
          label: "Liquid silver",
          bindings: [
            { type: "material-color", target: "body", value: "#a9afb7" },
          ],
        },
        {
          id: "finish-blue",
          label: "Ion blue",
          bindings: [
            { type: "material-color", target: "body", value: "#164f8c" },
          ],
        },
        {
          id: "finish-red",
          label: "Signal red",
          bindings: [
            { type: "material-color", target: "body", value: "#8d1f26" },
          ],
        },
      ],
    },
  ],
  hotspots: [
    {
      id: "front-light",
      label: "Lighting system",
      position: [2.1, 0.95, 0.7],
    },
    {
      id: "cabin",
      label: "Cabin",
      position: [-0.2, 1.5, 0],
    },
  ],
  cameraPresets: [
    {
      id: "hero",
      label: "Hero",
      position: [5.2, 2.7, 6.3],
      target: [0, 0.85, 0],
      fov: 38,
    },
  ],
  metadata: {
    vertical: "automotive",
    prototype: true,
  },
};

const initialPolicy: RenderPolicy = {
  quality: "medium",
  maxDpr: 1.5,
  enableShadows: true,
  enablePostProcessing: false,
  preferReducedMotion: false,
};

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
  };
}

export function ShowcaseExperience() {
  const finishGroup = manifest.optionGroups[0];
  const [selection, setSelection] = useState(() =>
    createDefaultSelection(manifest),
  );
  const [renderPolicy, setRenderPolicy] = useState(initialPolicy);

  useEffect(() => {
    const nav = navigator as ExtendedNavigator;

    setRenderPolicy(
      resolveRenderPolicy({
        viewportWidth: window.innerWidth,
        devicePixelRatio: window.devicePixelRatio || 1,
        deviceMemoryGb: nav.deviceMemory,
        hardwareConcurrency: nav.hardwareConcurrency,
        saveData: nav.connection?.saveData,
        prefersReducedMotion: window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches,
      }),
    );
  }, []);

  const resolvedBindings = useMemo(
    () => resolveSelectionBindings(manifest, selection),
    [selection],
  );
  const bindings = useMemo(
    () => resolvedBindings.map((resolved) => resolved.binding),
    [resolvedBindings],
  );
  const selectedFinish = finishGroup
    ? (selection[finishGroup.id]?.[0] ?? "")
    : "";

  return (
    <main className="experience-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="3D Showcase home">
          <span className="brand-mark" aria-hidden="true" />
          <span>3D / SHOWCASE</span>
        </a>
        <div className="header-meta">
          <span>CORE 0.2</span>
          <span className="quality-chip">{renderPolicy.quality} render</span>
        </div>
      </header>

      <section className="showcase-layout" id="top">
        <div className="showcase-copy">
          <p className="eyebrow">FIRST VERTICAL / AUTOMOTIVE</p>
          <h1>{manifest.title}</h1>
          <p className="lede">{manifest.subtitle}</p>
          <div className="proof-row" aria-label="Platform principles">
            <span>Product agnostic</span>
            <span>Adaptive rendering</span>
            <span>Commerce optional</span>
          </div>
        </div>

        <div className="stage-frame" aria-label="Interactive 3D product showcase">
          <ShowcaseViewport
            manifest={manifest}
            renderPolicy={renderPolicy}
            bindings={bindings}
          />
          <div className="stage-corner stage-corner-left">
            Drag to orbit<br />Scroll to inspect
          </div>
          <div className="stage-corner stage-corner-right" aria-hidden="true">
            01 / PROTOTYPE
          </div>
        </div>

        <aside className="config-panel" aria-label="Product configuration">
          <div className="config-heading">
            <div>
              <p className="panel-kicker">Configuration</p>
              <h2>{finishGroup?.label ?? "Options"}</h2>
            </div>
            <span>{finishGroup?.options.length ?? 0} choices</span>
          </div>

          <div className="finish-options" role="group" aria-label="Choose finish">
            {finishGroup?.options.map((option) => {
              const colorBinding = option.bindings.find(
                (binding) => binding.type === "material-color",
              );
              const swatch =
                colorBinding?.type === "material-color"
                  ? colorBinding.value
                  : "#777";
              const active = option.id === selectedFinish;

              return (
                <button
                  className="finish-option"
                  data-active={active}
                  key={option.id}
                  onClick={() =>
                    setSelection((current) =>
                      selectOption(manifest, current, finishGroup.id, option.id),
                    )
                  }
                  aria-pressed={active}
                  type="button"
                >
                  <span
                    className="finish-swatch"
                    style={{ background: swatch }}
                    aria-hidden="true"
                  />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="panel-divider" />

          <div className="architecture-note">
            <span>Why this matters</span>
            <p>
              The configurator now emits generic manifest bindings. Scene targets
              are resolved by the showcase runtime instead of being wired to a
              car-specific React prop.
            </p>
          </div>
        </aside>
      </section>

      <footer className="site-footer">
        <span>SHOWCASE ENGINE / NEXT.JS + THREE.JS</span>
        <span>COMMERCE LAYER: NOT COUPLED</span>
      </footer>
    </main>
  );
}
