"use client";

import {
  assertValidShowcaseManifest,
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
} from "@showcase/core";
import type { AssetRuntimeEvent } from "@showcase/three";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

const ShowcaseViewport = dynamic(() => import("./ShowcaseViewport"), {
  ssr: false,
  loading: () => (
    <div className="showcase-loading" role="status" aria-live="polite">
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
    assets: [
      {
        id: "astra-base",
        kind: "gltf",
        slot: "subject",
        default: true,
        url: "/models/astra-one-base.gltf",
        fallbackImage: "/showcase/astra-one-poster.svg",
        lod: [
          {
            maxViewportWidth: 720,
            url: "/models/astra-one-base.gltf",
          },
        ],
      },
      {
        id: "astra-sport",
        kind: "gltf",
        slot: "subject",
        url: "/models/astra-one-sport.gltf",
        fallbackImage: "/showcase/astra-one-poster.svg",
        lod: [
          {
            maxViewportWidth: 720,
            url: "/models/astra-one-sport.gltf",
          },
        ],
      },
    ],
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
    {
      id: "trim",
      label: "Trim",
      selection: "single",
      defaultOptionIds: ["trim-touring"],
      options: [
        {
          id: "trim-touring",
          label: "Touring",
          bindings: [
            {
              type: "asset-replacement",
              target: "subject",
              assetId: "astra-base",
            },
          ],
        },
        {
          id: "trim-sport",
          label: "Sport aero",
          bindings: [
            {
              type: "asset-replacement",
              target: "subject",
              assetId: "astra-sport",
            },
          ],
        },
      ],
    },
    {
      id: "lighting",
      label: "Lighting",
      selection: "single",
      defaultOptionIds: ["lighting-on"],
      options: [
        {
          id: "lighting-on",
          label: "Signature on",
          bindings: [
            { type: "node-visibility", target: "front-light", visible: true },
            { type: "node-visibility", target: "rear-light", visible: true },
          ],
        },
        {
          id: "lighting-off",
          label: "Signature off",
          bindings: [
            { type: "node-visibility", target: "front-light", visible: false },
            { type: "node-visibility", target: "rear-light", visible: false },
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
      anchorId: "front-light",
      contentKey: "lighting",
      cameraPresetId: "front-detail",
    },
    {
      id: "cabin",
      label: "Cabin",
      position: [-0.2, 1.5, 0],
      anchorId: "cabin",
      contentKey: "cabin",
      cameraPresetId: "cabin-detail",
    },
    {
      id: "rear",
      label: "Rear profile",
      position: [-2.1, 0.95, 0.7],
      anchorId: "rear",
      contentKey: "rear",
      cameraPresetId: "rear-detail",
    },
  ],
  cameraPresets: [
    {
      id: "hero",
      label: "Hero",
      position: [5.2, 2.7, 6.3],
      target: [0, 0.85, 0],
      fov: 38,
      mobile: {
        position: [5.8, 3.0, 7.2],
        target: [0, 0.9, 0],
        fov: 45,
      },
    },
    {
      id: "front-detail",
      label: "Front lighting",
      position: [4.5, 1.8, 3.2],
      target: [1.35, 0.95, 0.2],
      fov: 34,
      mobile: {
        position: [5.3, 2.2, 4.3],
        target: [1.15, 0.95, 0.15],
        fov: 42,
      },
    },
    {
      id: "cabin-detail",
      label: "Cabin",
      position: [2.5, 2.35, 4.25],
      target: [-0.15, 1.25, 0],
      fov: 32,
      mobile: {
        position: [3.4, 2.8, 5.1],
        target: [-0.1, 1.2, 0],
        fov: 42,
      },
    },
    {
      id: "rear-detail",
      label: "Rear",
      position: [-4.6, 1.8, 3.2],
      target: [-1.35, 0.95, 0.2],
      fov: 34,
      mobile: {
        position: [-5.4, 2.2, 4.3],
        target: [-1.15, 0.95, 0.15],
        fov: 42,
      },
    },
  ],
  metadata: {
    vertical: "automotive",
    prototype: true,
    engineVersion: "0.3",
  },
};

assertValidShowcaseManifest(manifest);

const hotspotCopy: Record<string, { title: string; body: string }> = {
  lighting: {
    title: "Signature lighting",
    body: "A guided detail state proves that hotspots can own camera framing without coupling the renderer to automotive business objects.",
  },
  cabin: {
    title: "Cabin volume",
    body: "The hotspot follows a semantic anchor inside the loaded asset, so future assets can move the cabin without rewriting DOM coordinates.",
  },
  rear: {
    title: "Rear profile",
    body: "Direct manipulation can interrupt the camera flight at any time. The experience immediately yields control back to the visitor.",
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

export interface ShowcaseExperienceProps {
  onSelectionSnapshot?: (snapshot: ShowcaseSelectionSnapshot) => void;
}

type CopyStatus = "idle" | "copied" | "unsupported" | "error";

export function ShowcaseExperience({
  onSelectionSnapshot,
}: ShowcaseExperienceProps = {}) {
  const [selection, setSelection] = useState(() =>
    createDefaultSelection(manifest),
  );
  const [renderPolicy, setRenderPolicy] = useState(initialPolicy);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [mode, setMode] = useState<ExperienceMode>("arrival");
  const [activeHotspotId, setActiveHotspotId] = useState<string>();
  const [activeCameraPresetId, setActiveCameraPresetId] = useState(
    manifest.scene.defaultCameraPresetId,
  );
  const [cameraRequestKey, setCameraRequestKey] = useState(0);
  const [assetStatus, setAssetStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [assetError, setAssetError] = useState<string>();
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    const nav = navigator as ExtendedNavigator;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePolicy = () => {
      setViewportWidth(window.innerWidth);
      setRenderPolicy(
        resolveRenderPolicy({
          viewportWidth: window.innerWidth,
          devicePixelRatio: window.devicePixelRatio || 1,
          deviceMemoryGb: nav.deviceMemory,
          hardwareConcurrency: nav.hardwareConcurrency,
          saveData: nav.connection?.saveData,
          prefersReducedMotion: motionQuery.matches,
        }),
      );
    };

    updatePolicy();
    window.addEventListener("resize", updatePolicy);
    motionQuery.addEventListener("change", updatePolicy);

    return () => {
      window.removeEventListener("resize", updatePolicy);
      motionQuery.removeEventListener("change", updatePolicy);
    };
  }, []);

  const resolvedBindings = useMemo(
    () => resolveSelectionBindings(manifest, selection),
    [selection],
  );
  const bindings = useMemo(
    () => resolvedBindings.map((resolved) => resolved.binding),
    [resolvedBindings],
  );
  const snapshot = useMemo(
    () => createSelectionSnapshot(manifest, selection),
    [selection],
  );

  useEffect(() => {
    onSelectionSnapshot?.(snapshot);
  }, [onSelectionSnapshot, snapshot]);

  useEffect(() => {
    setCopyStatus("idle");
  }, [snapshot]);

  const activeHotspot = manifest.hotspots.find(
    (candidate) => candidate.id === activeHotspotId,
  );
  const activeHotspotContent = activeHotspot?.contentKey
    ? hotspotCopy[activeHotspot.contentKey]
    : undefined;
  const fallbackImage = manifest.scene.assets.find((asset) => asset.default)
    ?.fallbackImage;

  const handleHotspotSelect = useCallback((hotspot: Hotspot) => {
    setActiveHotspotId(hotspot.id);
    setActiveCameraPresetId(
      hotspot.cameraPresetId ?? manifest.scene.defaultCameraPresetId,
    );
    setMode("detail");
    setCameraRequestKey((current) => current + 1);
  }, []);

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
    setActiveCameraPresetId(manifest.scene.defaultCameraPresetId);
    setMode("explore");
    setCameraRequestKey((current) => current + 1);
  }, []);

  const copySnapshot = useCallback(async () => {
    if (!navigator.clipboard) {
      setCopyStatus("unsupported");
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }, [snapshot]);

  const copyAnnouncement =
    copyStatus === "copied"
      ? "Configuration JSON copied to clipboard."
      : copyStatus === "unsupported"
        ? "Clipboard access is not available in this browser."
        : copyStatus === "error"
          ? "Configuration JSON could not be copied."
          : "";

  return (
    <main className="experience-shell">
      <a className="skip-link" href="#showcase-configuration">
        Skip to configuration
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="3D Showcase home">
          <span className="brand-mark" aria-hidden="true" />
          <span>3D / SHOWCASE</span>
        </a>
        <div className="header-meta">
          <span>CORE 0.3</span>
          <span className="quality-chip" aria-label={`${renderPolicy.quality} rendering quality`}>
            {renderPolicy.quality} render
          </span>
        </div>
      </header>

      <section className="showcase-layout" id="top">
        <div className="showcase-copy">
          <p className="eyebrow">SHOWCASE ENGINE V1 / AUTOMOTIVE PROOF</p>
          <h1 id="showcase-title">{manifest.title}</h1>
          <p className="lede">{manifest.subtitle}</p>
          <div className="proof-row" aria-label="Platform principles">
            <span>Asset driven</span>
            <span>Interruptible camera</span>
            <span>Commerce optional</span>
          </div>
        </div>

        <div
          className="stage-frame"
          role="region"
          aria-labelledby="showcase-title"
          aria-describedby="showcase-stage-description"
        >
          <p id="showcase-stage-description" className="sr-only">
            Interactive 3D preview. Use the labeled hotspot buttons for guided details
            or skip to the product configuration controls to change the scene.
          </p>

          {fallbackImage ? (
            <div
              className="showcase-poster"
              data-visible={assetStatus !== "ready"}
              style={{ backgroundImage: `url(${fallbackImage})` }}
              aria-hidden="true"
            />
          ) : null}

          <ShowcaseViewport
            manifest={manifest}
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
            <section
              className="stage-detail-card"
              aria-live="polite"
              aria-labelledby="showcase-detail-title"
            >
              <p className="panel-kicker">Guided detail</p>
              <h2 id="showcase-detail-title" className="stage-detail-title">
                {activeHotspotContent.title}
              </h2>
              <p>{activeHotspotContent.body}</p>
              <button type="button" onClick={resetCamera}>
                Return to free explore
              </button>
            </section>
          ) : null}

          <div className="stage-corner stage-corner-left" aria-hidden="true">
            Drag to orbit<br />Scroll to inspect
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
            {manifest.optionGroups.map((group) => {
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
                            setMode("configure");
                            setSelection((current) =>
                              selectOption(manifest, current, group.id, option.id),
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
                              {group.id === "trim" ? "↔" : "◉"}
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
            <button type="button" onClick={copySnapshot}>
              Copy JSON
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {copyAnnouncement}
            </span>
          </div>

          <div className="architecture-note">
            <span>Engine boundary</span>
            <p>
              The UI emits generic bindings; asset selection, node/material mutation,
              hotspots and camera direction are resolved by the showcase runtime.
              A commerce adapter can consume the snapshot without owning the renderer.
            </p>
          </div>
        </aside>
      </section>

      <footer className="site-footer">
        <span>SHOWCASE ENGINE / NEXT.JS + THREE.JS</span>
        <span>MODE: {mode} / COMMERCE LAYER: DECOUPLED</span>
      </footer>
    </main>
  );
}
