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

const ShowcaseViewport = dynamic(() => import("./ShowcaseViewport"), {
  ssr: false,
  loading: () => (
    <div className="showcase-loading" role="status">
      <span>Preparing 3D view</span>
    </div>
  ),
});

const assetEncoding =
  process.env.NEXT_PUBLIC_SHOWCASE_ASSET_ENCODING === "ktx2" ? "ktx2" : "png";
const useKtx2Runtime = assetEncoding === "ktx2";
const useMeshoptRuntime = process.env.NEXT_PUBLIC_SHOWCASE_MESHOPT === "1";
const textureProfile = useKtx2Runtime
  ? "ktx2-lod0-lod1-png-lod2"
  : "png";
const runtimeAssetProfile = useMeshoptRuntime
  ? `${textureProfile}+meshopt`
  : textureProfile;

function heroModelUrl(variant: "touring" | "sport", lod: 0 | 1 | 2) {
  const useKtx2ForTier = useKtx2Runtime && lod < 2;
  const textureSuffix = useKtx2ForTier ? "-ktx2" : "";
  const meshoptSuffix = useMeshoptRuntime ? "-meshopt" : "";
  return `/models/astra-one-${variant}-lod${lod}${textureSuffix}${meshoptSuffix}.glb`;
}

const runtimeDeliveryMetadata =
  useKtx2Runtime
    ? {
        delivery: {
          meshopt: true,
          draco: false,
          ktx2TranscoderPath: "/basis/",
        },
      }
    : {};

const manifest: ShowcaseManifest = {
  id: "automotive-concept-01",
  slug: "automotive-concept-01",
  title: "Astra One",
  subtitle:
    "A self-authored, art-directed concept proves the engine with authored silhouette, real GLB LODs and production delivery while commerce remains optional.",
  scene: {
    assets: [
      {
        id: "astra-base",
        kind: "gltf",
        slot: "subject",
        default: true,
        url: heroModelUrl("touring", 0),
        fallbackImage: "/showcase/astra-one-poster.svg",
        lod: [
          {
            maxViewportWidth: 720,
            url: heroModelUrl("touring", 2),
          },
          {
            maxViewportWidth: 1200,
            url: heroModelUrl("touring", 1),
          },
        ],
        metadata: {
          provenance: "self-authored",
          generator: "scripts/generate-astra-concept.mjs",
          assetEncoding: runtimeAssetProfile,
          ...runtimeDeliveryMetadata,
        },
      },
      {
        id: "astra-sport",
        kind: "gltf",
        slot: "subject",
        url: heroModelUrl("sport", 0),
        fallbackImage: "/showcase/astra-one-poster.svg",
        lod: [
          {
            maxViewportWidth: 720,
            url: heroModelUrl("sport", 2),
          },
          {
            maxViewportWidth: 1200,
            url: heroModelUrl("sport", 1),
          },
        ],
        metadata: {
          provenance: "self-authored",
          generator: "scripts/generate-astra-concept.mjs",
          assetEncoding: runtimeAssetProfile,
          ...runtimeDeliveryMetadata,
        },
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
            { type: "material-color", target: "body", value: "#424c58" },
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
    {
      id: "motion",
      label: "Motion",
      selection: "single",
      defaultOptionIds: ["motion-static"],
      options: [
        {
          id: "motion-static",
          label: "Static",
          bindings: [],
        },
        {
          id: "motion-pulse",
          label: "Signature pulse",
          bindings: [
            {
              type: "animation-state",
              target: "subject",
              clip: "ANIM_signature_pulse",
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
    {
      id: "technical",
      label: "Technical inspection",
      position: [5.2, 4.2, 5.6],
      target: [0, 0.7, 0],
      fov: 32,
      mobile: {
        position: [5.8, 4.8, 6.4],
        target: [0, 0.7, 0],
        fov: 38,
      },
    },
  ],
  metadata: {
    vertical: "automotive",
    prototype: true,
    assetStage: "self-authored-hero-v2",
    engineVersion: "0.4",
  },
};

const hotspotCopy: Record<string, { title: string; body: string }> = {
  lighting: {
    title: "Signature lighting",
    body: "The Hero V2 front graphic combines semantic light nodes, a full-width signature bar and an authored animation clip through the generic runtime.",
  },
  cabin: {
    title: "Cabin volume",
    body: "The tapered canopy, pillars and interior detail remain anchored semantically across every LOD, so responsive asset changes do not rewrite DOM coordinates.",
  },
  rear: {
    title: "Rear profile",
    body: "Touring and Sport are complete asset replacements while camera and configuration state remain owned by the generic engine.",
  },
};

interface VehicleSpecs {
  acceleration: string;
  range: string;
  topSpeed: string;
  power: string;
  drivetrain: string;
}

const vehicleSpecifications: Record<"touring" | "sport", VehicleSpecs> = {
  touring: {
    acceleration: "3.8s",
    range: "620 km",
    topSpeed: "250 km/h",
    power: "380 kW / 510 hp",
    drivetrain: "Dual Motor AWD",
  },
  sport: {
    acceleration: "2.9s",
    range: "560 km",
    topSpeed: "285 km/h",
    power: "485 kW / 650 hp",
    drivetrain: "Torque-Vectoring AWD",
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

  const [copyAnnouncement, setCopyAnnouncement] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Restore configuration from URL query params on initial mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Record<string, string[]> = {};
    for (const group of manifest.optionGroups) {
      const val = params.get(group.id);
      if (val && group.options.some((opt) => opt.id === val)) {
        fromUrl[group.id] = [val];
      }
    }
    if (Object.keys(fromUrl).length > 0) {
      setSelection((prev) => ({ ...prev, ...fromUrl }));
    }
  }, []);

  // Sync selection changes to URL query state
  useEffect(() => {
    if (typeof window === "undefined" || !userHasInteracted) return;
    const params = new URLSearchParams();
    for (const [groupId, optionIds] of Object.entries(selection)) {
      if (optionIds[0]) {
        params.set(groupId, optionIds[0]);
      }
    }
    const newSearch = params.toString();
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [selection, userHasInteracted]);

  const effectiveManifest = useMemo<ShowcaseManifest>(() => {
    const isNight = selection.atmosphere?.includes("atmosphere-night");
    return {
      ...manifest,
      scene: {
        ...manifest.scene,
        environment: {
          ...manifest.scene.environment,
          preset: isNight ? "night" : "studio",
        },
      },
    };
  }, [selection.atmosphere]);

  const resolvedBindings = useMemo(
    () => resolveSelectionBindings(effectiveManifest, selection),
    [effectiveManifest, selection],
  );

  const technicalBindings = useMemo<VariantBinding[]>(() => {
    if (mode !== "technical") return [];
    return [
      {
        type: "node-transform",
        target: "cabin",
        positionOffset: [0, 0.35, 0],
      },
      {
        type: "node-transform",
        target: "wheel_fl*",
        positionOffset: [0, 0, 0.28],
      },
      {
        type: "node-transform",
        target: "wheel_rl*",
        positionOffset: [0, 0, 0.28],
      },
      {
        type: "node-transform",
        target: "wheel_fr*",
        positionOffset: [0, 0, -0.28],
      },
      {
        type: "node-transform",
        target: "wheel_rr*",
        positionOffset: [0, 0, -0.28],
      },
    ];
  }, [mode]);

  const bindings = useMemo(
    () => [
      ...resolvedBindings.map((resolved) => resolved.binding),
      ...technicalBindings,
    ],
    [resolvedBindings, technicalBindings],
  );

  const snapshot = useMemo(
    () => createSelectionSnapshot(effectiveManifest, selection),
    [effectiveManifest, selection],
  );

  useEffect(() => {
    onSelectionSnapshot?.(snapshot);
  }, [onSelectionSnapshot, snapshot]);

  const activeHotspot = effectiveManifest.hotspots.find(
    (candidate) => candidate.id === activeHotspotId,
  );
  const activeHotspotContent = activeHotspot?.contentKey
    ? hotspotCopy[activeHotspot.contentKey]
    : undefined;
  const fallbackImage = effectiveManifest.scene.assets.find((asset) => asset.default)
    ?.fallbackImage;

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
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(JSON.stringify(snapshot));
    setToastMessage("Selection snapshot JSON copied");
    setCopyAnnouncement("Selection snapshot JSON copied to clipboard");
    setTimeout(() => {
      setToastMessage(null);
      setCopyAnnouncement(null);
    }, 2800);
  }, [snapshot]);

  const copyShareLink = useCallback(async () => {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    setToastMessage("Configuration link copied to clipboard");
    setCopyAnnouncement("Configuration link copied to clipboard");
    setTimeout(() => {
      setToastMessage(null);
      setCopyAnnouncement(null);
    }, 2800);
  }, []);

  const [isCommerceOpen, setIsCommerceOpen] = useState(false);
  const [commerceInitialTab, setCommerceInitialTab] = useState<CommerceTab>("reserve");

  const openCommerce = useCallback((tab: CommerceTab = "reserve") => {
    setCommerceInitialTab(tab);
    setIsCommerceOpen(true);
  }, []);

  const toggleTechnicalMode = useCallback(() => {
    setUserHasInteracted(true);
    if (mode === "technical") {
      setMode("explore");
      setActiveCameraPresetId(effectiveManifest.scene.defaultCameraPresetId);
      setCameraRequestKey((c) => c + 1);
    } else {
      setMode("technical");
      setActiveCameraPresetId("technical");
      setActiveHotspotId(undefined);
      setCameraRequestKey((c) => c + 1);
    }
  }, [effectiveManifest.scene.defaultCameraPresetId, mode]);

  const activeTrim = selection.trim?.includes("trim-sport") ? "sport" : "touring";
  const currentSpecs = vehicleSpecifications[activeTrim];

  return (
    <main className="experience-shell">
      <a className="skip-link" href="#showcase-configuration">
        Skip to configuration
      </a>

      <header className="site-header">
        <div className="header-left">
          <a className="brand" href="#top" aria-label="3D Showcase home">
            <span className="brand-mark" aria-hidden="true" />
            <span>3D / SHOWCASE</span>
          </a>

          <nav className="vertical-switcher" aria-label="Showcase vertical switcher">
            <span className="vertical-switch-btn" data-active="true" aria-current="page">
              Astra One (Auto)
            </span>
            <Link href="/furniture" className="vertical-switch-btn">
              Kroma Chair
            </Link>
            <Link href="/admin/editor" className="vertical-switch-btn">
              3D Studio
            </Link>
            <Link href="/benchmark" className="vertical-switch-btn">
              Benchmark
            </Link>
            <Link href="/embed?slug=automotive-concept-01" className="vertical-switch-btn">
              Embed
            </Link>
          </nav>
        </div>

        <div className="header-meta">
          <span>CORE 0.4</span>
          <span className="quality-chip">{renderPolicy.quality} render</span>
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
          <p className="eyebrow">SHOWCASE ENGINE V1 / AUTOMOTIVE VERTICAL V1</p>
          <h1 id="showcase-title">{effectiveManifest.title}</h1>
          <p className="lede">{effectiveManifest.subtitle}</p>
          <div className="proof-row" aria-label="Platform principles">
            <span>Responsive GLB LOD</span>
            <span>Semantic animation</span>
            <span>Commerce optional</span>
          </div>

          <section className="specs-panel" aria-label="Vehicle technical specifications">
            <div className="specs-header">
              <span className="specs-title">Astra One Specs</span>
              <span className="specs-variant-badge">{activeTrim.toUpperCase()}</span>
            </div>
            <div className="specs-grid">
              <div className="spec-cell">
                <span className="spec-metric">{currentSpecs.acceleration}</span>
                <span className="spec-caption">0–100 km/h</span>
              </div>
              <div className="spec-cell">
                <span className="spec-metric">{currentSpecs.range}</span>
                <span className="spec-caption">WLTP Range</span>
              </div>
              <div className="spec-cell">
                <span className="spec-metric">{currentSpecs.power}</span>
                <span className="spec-caption">Peak Power</span>
              </div>
              <div className="spec-cell">
                <span className="spec-metric">{currentSpecs.topSpeed}</span>
                <span className="spec-caption">Top Speed</span>
              </div>
            </div>
          </section>
        </div>

        <div
          className="stage-frame"
          aria-label="Interactive 3D product showcase"
          aria-labelledby="showcase-title"
          aria-describedby="showcase-stage-description"
        >
          <p id="showcase-stage-description" className="sr-only">
            Interactive 3D preview. Use the labeled hotspot buttons for guided details
            or skip to the product configuration controls to customize finish, trim and atmosphere.
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

          <div className="stage-top-controls">
            <button
              type="button"
              className="technical-toggle-btn"
              data-active={mode === "technical"}
              onClick={toggleTechnicalMode}
              aria-pressed={mode === "technical"}
            >
              <span className="btn-icon">{mode === "technical" ? "◧" : "◨"}</span>
              <span>{mode === "technical" ? "Exit Technical View" : "Technical Exploded View"}</span>
            </button>
          </div>

          <div
            className="stage-status"
            data-status={assetStatus}
            role="status"
            aria-live="polite"
          >
            <span>{assetStatus === "ready" ? mode : assetStatus}</span>
            {assetError ? <span>{assetError}</span> : null}
          </div>

          {mode === "technical" ? (
            <div className="technical-hud-overlay" role="region" aria-label="Technical inspection readouts">
              <div className="technical-hud-header">
                <div>
                  <span className="hud-badge">EXPLODED TECHNICAL ARCHITECTURE</span>
                  <h2 className="hud-title">Astra One 800V Powertrain & Chassis</h2>
                </div>
                <button
                  type="button"
                  className="hud-exit-btn"
                  onClick={toggleTechnicalMode}
                >
                  ✕ Return to Standard
                </button>
              </div>

              <div className="technical-hud-grid">
                <div className="hud-card">
                  <div className="hud-card-head">
                    <span className="hud-icon">⚡</span>
                    <strong>800V SiC Inverter System</strong>
                  </div>
                  <p>Dual Silicon Carbide inverters deliver 98.4% electrical efficiency with peak 350 kW DC charging (10–80% in 18 min).</p>
                  <span className="hud-metric">380–485 kW Peak Output</span>
                </div>

                <div className="hud-card">
                  <div className="hud-card-head">
                    <span className="hud-icon">🔋</span>
                    <strong>102 kWh Skateboard Pack</strong>
                  </div>
                  <p>Structural liquid-cooled NMC pouch cells integrated into the floorpan, optimizing torsional rigidity and center of gravity.</p>
                  <span className="hud-metric">620 km WLTP Range</span>
                </div>

                <div className="hud-card">
                  <div className="hud-card-head">
                    <span className="hud-icon">🏎️</span>
                    <strong>Adaptive Air Suspension</strong>
                  </div>
                  <p>Continuous damping control (CDC) with multi-chamber air springs and wheel assembly offsets for inspection.</p>
                  <span className="hud-metric">1,000 Hz Road Scanning</span>
                </div>

                <div className="hud-card">
                  <div className="hud-card-head">
                    <span className="hud-icon">🛡️</span>
                    <strong>Carbon-Alloy Spaceframe</strong>
                  </div>
                  <p>Hybrid extruded aluminum chassis with carbon-composite structural canopy ring elevated +0.35m in exploded view.</p>
                  <span className="hud-metric">42,000 Nm/deg Stiffness</span>
                </div>
              </div>

              <div className="hud-callouts-bar">
                <span className="hud-callout-tag">CANOPY ELEVATION: +0.35m</span>
                <span className="hud-callout-tag">TRACK OFFSET: ±0.28m</span>
                <span className="hud-callout-tag">POWERTRAIN: DUAL SIC MOTORS</span>
                <span className="hud-callout-tag">BRAKING: 4-PISTON MONOBLOC</span>
              </div>
            </div>
          ) : null}

          {activeHotspotContent ? (
            <div className="stage-detail-card" role="dialog" aria-live="polite">
              <p className="panel-kicker">Guided detail</p>
              <h2 className="stage-detail-title">{activeHotspotContent.title}</h2>
              <p>{activeHotspotContent.body}</p>
              <button type="button" onClick={resetCamera}>
                Return to free explore
              </button>
            </div>
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
                              {group.id === "trim"
                                ? "↔"
                                : group.id === "motion"
                                  ? "▶"
                                  : group.id === "atmosphere"
                                    ? "☀"
                                    : "◉"}
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
                Inquire / Reserve
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                aria-label="Copy shareable configuration link"
              >
                Share Link
              </button>
              <button
                type="button"
                onClick={copySnapshot}
                aria-label="Copy JSON selection snapshot"
              >
                Copy JSON
              </button>
            </div>
            {copyAnnouncement ? (
              <span className="sr-only" role="status" aria-live="polite">
                {copyAnnouncement}
              </span>
            ) : null}
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
        <span>SHOWCASE ENGINE / NEXT.JS + THREE.JS</span>
        <span>MODE: {mode} / COMMERCE LAYER: DECOUPLED</span>
      </footer>
    </main>
  );
}
