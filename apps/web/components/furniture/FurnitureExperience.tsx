"use client";

import {
  createDefaultSelection,
  createSelectionSnapshot,
  resolveRenderPolicy,
  resolveSelectionBindings,
  selectOption,
  type ExperienceMode,
  type Hotspot,
  type RenderPolicy,
  type ShowcaseManifest,
  type ShowcaseSelectionSnapshot,
  type VariantBinding,
} from "@showcase/core";
import type { AssetRuntimeEvent } from "@showcase/three";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommerceModal, type CommerceTab } from "../commerce/CommerceModal";

const ShowcaseViewport = dynamic(() => import("../showcase/ShowcaseViewport"), {
  ssr: false,
  loading: () => (
    <div className="showcase-loading" role="status">
      <span>Preparing 3D furniture view</span>
    </div>
  ),
});

const furnitureManifest: ShowcaseManifest = {
  id: "furniture-kroma-chair-01",
  slug: "furniture-kroma-chair-01",
  title: "Kroma Lounge Chair",
  subtitle:
    "Architectural ergonomics engineered for high-performance focus and active postural support. Proves the 3D showcase engine is 100% domain-neutral and reusable.",
  scene: {
    assets: [
      {
        id: "kroma-chair-base",
        kind: "gltf",
        slot: "subject",
        default: true,
        url: "/models/kroma-chair-lod0.glb",
        fallbackImage: "/showcase/astra-one-poster.svg",
        lod: [
          {
            maxViewportWidth: 720,
            url: "/models/kroma-chair-lod2.glb",
          },
          {
            maxViewportWidth: 1200,
            url: "/models/kroma-chair-lod1.glb",
          },
        ],
        metadata: {
          provenance: "self-authored-kroma",
          generator: "scripts/generate-kroma-chair.mjs",
        },
      },
    ],
    environment: {
      preset: "studio",
      intensity: 0.9,
      background: "#090b0f",
    },
    defaultCameraPresetId: "hero",
  },
  optionGroups: [
    {
      id: "upholstery",
      label: "Upholstery",
      selection: "single",
      defaultOptionIds: ["upholstery-obsidian"],
      options: [
        {
          id: "upholstery-obsidian",
          label: "Obsidian Nappa",
          bindings: [
            { type: "material-color", target: "upholstery", value: "#1e2124" },
          ],
        },
        {
          id: "upholstery-cognac",
          label: "Cognac Heritage",
          bindings: [
            { type: "material-color", target: "upholstery", value: "#8a4f28" },
          ],
        },
        {
          id: "upholstery-forest",
          label: "Nordic Forest",
          bindings: [
            { type: "material-color", target: "upholstery", value: "#2d4a3e" },
          ],
        },
        {
          id: "upholstery-boucle",
          label: "Oatmeal Bouclé",
          bindings: [
            { type: "material-color", target: "upholstery", value: "#c8c3ba" },
          ],
        },
      ],
    },
    {
      id: "base-finish",
      label: "Architectural Base",
      selection: "single",
      defaultOptionIds: ["base-aluminum"],
      options: [
        {
          id: "base-aluminum",
          label: "Polished Aluminum",
          bindings: [
            { type: "material-color", target: "metal", value: "#d8dce2" },
          ],
        },
        {
          id: "base-obsidian",
          label: "Matte Obsidian",
          bindings: [
            { type: "material-color", target: "metal", value: "#1c1e22" },
          ],
        },
        {
          id: "base-gold",
          label: "Champagne Gold",
          bindings: [
            { type: "material-color", target: "metal", value: "#c8a876" },
          ],
        },
      ],
    },
    {
      id: "ergonomics",
      label: "Postural Mode",
      selection: "single",
      defaultOptionIds: ["ergo-focus"],
      options: [
        {
          id: "ergo-focus",
          label: "Upright Focus",
          bindings: [],
        },
        {
          id: "ergo-recline",
          label: "Dynamic Recline",
          bindings: [
            {
              type: "node-transform",
              target: "backrest",
              positionOffset: [0, -0.04, -0.08],
              rotationOffset: [-0.18, 0, 0],
            },
            {
              type: "node-transform",
              target: "headrest",
              positionOffset: [0, -0.08, -0.12],
              rotationOffset: [-0.22, 0, 0],
            },
            {
              type: "node-transform",
              target: "lumbar",
              positionOffset: [0, 0.03, 0.04],
            },
          ],
        },
      ],
    },
    {
      id: "atmosphere",
      label: "Atmosphere",
      selection: "single",
      defaultOptionIds: ["atmosphere-studio"],
      options: [
        {
          id: "atmosphere-studio",
          label: "Studio Day",
          bindings: [],
        },
        {
          id: "atmosphere-night",
          label: "Night Gallery",
          bindings: [],
        },
      ],
    },
  ],
  hotspots: [
    {
      id: "lumbar",
      label: "Active lumbar system",
      position: [0.35, 0.72, -0.15],
      anchorId: "lumbar",
      contentKey: "lumbar",
      cameraPresetId: "lumbar-detail",
    },
    {
      id: "base",
      label: "5-Star die-cast base",
      position: [0.35, 0.15, 0.25],
      anchorId: "base",
      contentKey: "base",
      cameraPresetId: "base-detail",
    },
    {
      id: "headrest",
      label: "Cervical headrest",
      position: [0.28, 1.42, -0.2],
      anchorId: "headrest",
      contentKey: "headrest",
      cameraPresetId: "headrest-detail",
    },
  ],
  cameraPresets: [
    {
      id: "hero",
      label: "Hero perspective",
      position: [1.9, 1.4, 2.2],
      target: [0, 0.75, 0],
      fov: 36,
      mobile: {
        position: [2.3, 1.7, 2.7],
        target: [0, 0.75, 0],
        fov: 42,
      },
    },
    {
      id: "lumbar-detail",
      label: "Lumbar support",
      position: [1.1, 0.95, 0.9],
      target: [0, 0.72, -0.15],
      fov: 28,
      mobile: {
        position: [1.3, 1.1, 1.1],
        target: [0, 0.72, -0.15],
        fov: 34,
      },
    },
    {
      id: "base-detail",
      label: "Cast aluminum base",
      position: [1.3, 0.42, 1.3],
      target: [0, 0.12, 0],
      fov: 28,
      mobile: {
        position: [1.6, 0.5, 1.6],
        target: [0, 0.12, 0],
        fov: 34,
      },
    },
    {
      id: "headrest-detail",
      label: "Headrest articulation",
      position: [0.8, 1.6, 1.1],
      target: [0, 1.4, -0.2],
      fov: 28,
      mobile: {
        position: [1.0, 1.8, 1.3],
        target: [0, 1.4, -0.2],
        fov: 34,
      },
    },
  ],
  metadata: {
    vertical: "furniture",
    prototype: true,
    engineVersion: "0.4",
  },
};

const furnitureHotspotCopy: Record<string, { title: string; body: string }> = {
  lumbar: {
    title: "Continuous Lumbar Suspension",
    body: "Self-adjusting active lumbar arch dynamically balances lumbar and thoracic posture without manual lever adjustments.",
  },
  base: {
    title: "5-Star Die-Cast Aluminum Swivel Base",
    body: "Precision high-pressure cast alloy with low-friction casters, supporting 360-degree silent swivel and pneumatic height modulation.",
  },
  headrest: {
    title: "Articulated Cervical Headrest",
    body: "Sculpted dual-density foam core contours to cervical vertebrae curvature during deep focus or relaxed contemplation.",
  },
};

const initialPolicy: RenderPolicy = {
  quality: "medium",
  maxDpr: 1.5,
  enableShadows: true,
  enablePostProcessing: false,
  preferReducedMotion: false,
};

export function FurnitureExperience() {
  const [selection, setSelection] = useState(() =>
    createDefaultSelection(furnitureManifest),
  );
  const [renderPolicy, setRenderPolicy] = useState(initialPolicy);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [mode, setMode] = useState<ExperienceMode>("arrival");
  const [activeHotspotId, setActiveHotspotId] = useState<string>();
  const [activeCameraPresetId, setActiveCameraPresetId] = useState(
    furnitureManifest.scene.defaultCameraPresetId,
  );
  const [cameraRequestKey, setCameraRequestKey] = useState(0);
  const [assetStatus, setAssetStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [assetError, setAssetError] = useState<string>();
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // Commerce state
  const [isCommerceOpen, setIsCommerceOpen] = useState(false);
  const [commerceInitialTab, setCommerceInitialTab] = useState<CommerceTab>("reserve");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const updatePolicy = () => {
      setViewportWidth(window.innerWidth);
      setRenderPolicy(
        resolveRenderPolicy({
          viewportWidth: window.innerWidth,
          devicePixelRatio: window.devicePixelRatio || 1,
        }),
      );
    };

    updatePolicy();
    window.addEventListener("resize", updatePolicy);
    return () => window.removeEventListener("resize", updatePolicy);
  }, []);

  const effectiveManifest = useMemo<ShowcaseManifest>(() => {
    const isNight = selection.atmosphere?.includes("atmosphere-night");
    return {
      ...furnitureManifest,
      scene: {
        ...furnitureManifest.scene,
        environment: {
          ...furnitureManifest.scene.environment,
          preset: isNight ? "night" : "studio",
        },
      },
    };
  }, [selection.atmosphere]);

  const resolvedBindings = useMemo(
    () => resolveSelectionBindings(effectiveManifest, selection),
    [effectiveManifest, selection],
  );
  const bindings = useMemo(
    () => resolvedBindings.map((resolved) => resolved.binding),
    [resolvedBindings],
  );
  const snapshot = useMemo(
    () => createSelectionSnapshot(effectiveManifest, selection),
    [effectiveManifest, selection],
  );

  const activeHotspot = effectiveManifest.hotspots.find(
    (candidate) => candidate.id === activeHotspotId,
  );
  const activeHotspotContent = activeHotspot?.contentKey
    ? furnitureHotspotCopy[activeHotspot.contentKey]
    : undefined;

  const handleHotspotSelect = useCallback((hotspot: Hotspot) => {
    setActiveHotspotId(hotspot.id);
    setActiveCameraPresetId(
      hotspot.cameraPresetId ?? effectiveManifest.scene.defaultCameraPresetId,
    );
    setMode("detail");
    setCameraRequestKey((current) => current + 1);
  }, [effectiveManifest.scene.defaultCameraPresetId]);

  const handleDirectInteraction = useCallback(() => {
    setUserHasInteracted(true);
    setMode("explore");
  }, []);

  const handleAssetRuntimeEvent = useCallback((event: AssetRuntimeEvent) => {
    setAssetStatus(event.status);
    if (event.status === "ready") {
      setMode((current) => (current === "arrival" ? "explore" : current));
      setAssetError(undefined);
    }
    if (event.status === "error") {
      setAssetError(event.error?.message ?? "The 3D asset could not be loaded.");
    }
  }, []);

  const resetCamera = useCallback(() => {
    setActiveHotspotId(undefined);
    setActiveCameraPresetId(effectiveManifest.scene.defaultCameraPresetId);
    setMode("explore");
    setCameraRequestKey((current) => current + 1);
  }, [effectiveManifest.scene.defaultCameraPresetId]);

  const copySnapshot = useCallback(async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setToastMessage("Furniture snapshot JSON copied");
    setTimeout(() => setToastMessage(null), 2800);
  }, [snapshot]);

  const openCommerce = useCallback((tab: CommerceTab = "reserve") => {
    setCommerceInitialTab(tab);
    setIsCommerceOpen(true);
  }, []);

  return (
    <main className="experience-shell">
      <a className="skip-link" href="#showcase-configuration">
        Skip to configuration
      </a>

      <header className="site-header">
        <div className="header-left">
          <Link className="brand" href="/" aria-label="3D Showcase home">
            <span className="brand-mark" aria-hidden="true" />
            <span>3D / SHOWCASE</span>
          </Link>

          <nav className="vertical-switcher" aria-label="Showcase vertical switcher">
            <Link href="/" className="vertical-switch-btn">
              Astra One (Auto)
            </Link>
            <span className="vertical-switch-btn" data-active="true" aria-current="page">
              Kroma Chair (Furniture)
            </span>
          </nav>
        </div>

        <div className="header-meta">
          <span>PROOF VERTICAL 02</span>
          <button
            type="button"
            className="header-cta-btn"
            onClick={() => openCommerce("reserve")}
          >
            Inquire / Reserve
          </button>
        </div>
      </header>

      <section className="showcase-layout" id="top">
        <div className="showcase-copy">
          <p className="eyebrow">SHOWCASE ENGINE V1 / FURNITURE VERTICAL PROOF</p>
          <h1 id="showcase-title">{effectiveManifest.title}</h1>
          <p className="lede">{effectiveManifest.subtitle}</p>

          <div className="proof-row" aria-label="Platform principles">
            <span>Domain-neutral core</span>
            <span>Semantic node transforms</span>
            <span>Decoupled commerce</span>
          </div>

          <section className="specs-panel" aria-label="Chair ergonomic specifications">
            <div className="specs-header">
              <span className="specs-title">Architectural Engineering</span>
              <span className="specs-variant-badge">EXECUTIVE GRADE</span>
            </div>
            <div className="specs-grid">
              <div className="spec-cell">
                <span className="spec-metric">BIFMA X5.1</span>
                <span className="spec-caption">Safety Certification</span>
              </div>
              <div className="spec-cell">
                <span className="spec-metric">4D Active</span>
                <span className="spec-caption">Dynamic Lumbar</span>
              </div>
              <div className="spec-cell">
                <span className="spec-metric">98%</span>
                <span className="spec-caption">Recyclable Alloy</span>
              </div>
              <div className="spec-cell">
                <span className="spec-metric">12 Years</span>
                <span className="spec-caption">Warranty Coverage</span>
              </div>
            </div>
          </section>
        </div>

        <div
          className="stage-frame"
          aria-label="Interactive 3D furniture showcase"
          aria-labelledby="showcase-title"
        >
          <ShowcaseViewport
            manifest={effectiveManifest}
            renderPolicy={renderPolicy}
            bindings={bindings}
            viewportWidth={viewportWidth}
            activeHotspotId={activeHotspotId}
            activeCameraPresetId={activeCameraPresetId}
            cameraRequestKey={cameraRequestKey}
            onHotspotSelect={handleHotspotSelect}
            onUserInteract={handleDirectInteraction}
            onAssetRuntimeEvent={handleAssetRuntimeEvent}
          />

          <div
            className="stage-status"
            data-status={assetStatus}
            role="status"
            aria-live="polite"
          >
            <span>{assetStatus === "ready" ? mode : assetStatus}</span>
            {assetError ? <span>{assetError}</span> : null}
          </div>

          {activeHotspotContent ? (
            <div className="stage-detail-card" role="dialog" aria-live="polite">
              <p className="panel-kicker">Ergonomic detail</p>
              <h2 className="stage-detail-title">{activeHotspotContent.title}</h2>
              <p>{activeHotspotContent.body}</p>
              <button type="button" onClick={resetCamera}>
                Return to free explore
              </button>
            </div>
          ) : null}

          <div className="stage-corner stage-corner-left" aria-hidden="true">
            Drag to orbit<br />Scroll to zoom
          </div>
          <div className="stage-corner stage-corner-right" aria-hidden="true">
            {userHasInteracted ? "DIRECT CONTROL" : "GUIDED / FREE"}
          </div>
        </div>

        <aside
          id="showcase-configuration"
          className="config-panel"
          aria-labelledby="showcase-config-title"
          tabIndex={-1}
        >
          <div className="config-heading">
            <div>
              <p className="panel-kicker">Configuration</p>
              <h2 id="showcase-config-title">Scene bindings</h2>
            </div>
            <span aria-label={`${snapshot.optionIds.length} active options`}>
              {snapshot.optionIds.length} active
            </span>
          </div>

          <div className="config-groups">
            {effectiveManifest.optionGroups.map((group) => {
              const groupHeadingId = `config-group-${group.id}`;

              return (
                <section
                  className="config-group"
                  key={group.id}
                  aria-labelledby={groupHeadingId}
                >
                  <div className="config-group-heading">
                    <h3 id={groupHeadingId}>{group.label}</h3>
                    <span aria-hidden="true">{group.selection}</span>
                  </div>
                  <div className="finish-options" role="group" aria-labelledby={groupHeadingId}>
                    {group.options.map((option) => {
                      const colorBinding = option.bindings.find(
                        (binding) => binding.type === "material-color",
                      );
                      const swatch =
                        colorBinding?.type === "material-color"
                          ? colorBinding.value
                          : undefined;
                      const active = selection[group.id]?.includes(option.id) ?? false;

                      return (
                        <button
                          className="finish-option"
                          data-active={active}
                          key={option.id}
                          onClick={() => {
                            setUserHasInteracted(true);
                            setMode("configure");
                            setSelection((current) =>
                              selectOption(effectiveManifest, current, group.id, option.id),
                            );
                          }}
                          aria-pressed={active}
                          type="button"
                        >
                          {swatch ? (
                            <span
                              className="finish-swatch"
                              style={{ background: swatch }}
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="binding-icon" aria-hidden="true">
                              {group.id === "ergonomics" ? "⤭" : "◉"}
                            </span>
                          )}
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="panel-divider" aria-hidden="true" />

          <div className="selection-snapshot">
            <div>
              <span>Selection snapshot</span>
              <code>{snapshot.optionIds.join(" · ")}</code>
            </div>
            <div className="selection-actions">
              <button
                type="button"
                className="reserve-action-btn"
                onClick={() => openCommerce("reserve")}
              >
                Inquire / Order
              </button>
              <button
                type="button"
                onClick={copySnapshot}
                aria-label="Copy JSON selection snapshot"
              >
                Copy JSON
              </button>
            </div>
          </div>

          <div className="architecture-note">
            <span>Domain-neutral verification</span>
            <p>
              This entire furniture showcase runs on the identical <code>@showcase/core</code> and{" "}
              <code>@showcase/three</code> code without a single automotive dependency.
            </p>
          </div>
        </aside>
      </section>

      <CommerceModal
        isOpen={isCommerceOpen}
        onClose={() => setIsCommerceOpen(false)}
        snapshot={snapshot}
        manifest={effectiveManifest}
        initialTab={commerceInitialTab}
      />

      {toastMessage ? (
        <div className="share-toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <span>{toastMessage}</span>
        </div>
      ) : null}

      <footer className="site-footer">
        <span>SHOWCASE ENGINE / VERTICAL 02 (FURNITURE)</span>
        <span>MODE: {mode} / ARCHITECTURE: 100% REUSABLE</span>
      </footer>
    </main>
  );
}
