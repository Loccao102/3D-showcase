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
  type ShowcaseInboundAction,
  type ShowcaseManifest,
  type VariantBinding,
} from "@showcase/core";
import type { AssetRuntimeEvent } from "@showcase/three";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const ShowcaseViewport = dynamic(() => import("../showcase/ShowcaseViewport"), {
  ssr: false,
  loading: () => (
    <div className="showcase-loading" role="status">
      <span>Loading 3D asset…</span>
    </div>
  ),
});

// Import automotive manifest definition
const automotiveManifest: ShowcaseManifest = {
  id: "automotive-concept-01",
  slug: "automotive-concept-01",
  title: "Astra One",
  scene: {
    assets: [
      {
        id: "astra-base",
        kind: "gltf",
        slot: "subject",
        default: true,
        url: "/models/astra-one-touring-lod0.glb",
        fallbackImage: "/showcase/astra-one-poster.svg",
        lod: [
          { maxViewportWidth: 720, url: "/models/astra-one-touring-lod2.glb" },
          { maxViewportWidth: 1200, url: "/models/astra-one-touring-lod1.glb" },
        ],
      },
      {
        id: "astra-sport",
        kind: "gltf",
        slot: "subject",
        url: "/models/astra-one-sport-lod0.glb",
        fallbackImage: "/showcase/astra-one-poster.svg",
        lod: [
          { maxViewportWidth: 720, url: "/models/astra-one-sport-lod2.glb" },
          { maxViewportWidth: 1200, url: "/models/astra-one-sport-lod1.glb" },
        ],
      },
    ],
    environment: {
      preset: "studio",
      intensity: 0.85,
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
          bindings: [{ type: "material-color", target: "body", value: "#424c58" }],
        },
        {
          id: "finish-silver",
          label: "Liquid silver",
          bindings: [{ type: "material-color", target: "body", value: "#a9afb7" }],
        },
        {
          id: "finish-blue",
          label: "Ion blue",
          bindings: [{ type: "material-color", target: "body", value: "#164f8c" }],
        },
        {
          id: "finish-red",
          label: "Signal red",
          bindings: [{ type: "material-color", target: "body", value: "#8d1f26" }],
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
          bindings: [{ type: "asset-replacement", target: "subject", assetId: "astra-base" }],
        },
        {
          id: "trim-sport",
          label: "Sport aero",
          bindings: [{ type: "asset-replacement", target: "subject", assetId: "astra-sport" }],
        },
      ],
    },
    {
      id: "atmosphere",
      label: "Atmosphere",
      selection: "single",
      defaultOptionIds: ["atmosphere-studio"],
      options: [
        { id: "atmosphere-studio", label: "Studio Day", bindings: [] },
        { id: "atmosphere-night", label: "Night Gallery", bindings: [] },
      ],
    },
  ],
  hotspots: [
    {
      id: "front-light",
      label: "Lighting system",
      position: [2.1, 0.95, 0.7],
      anchorId: "front-light",
      cameraPresetId: "front-detail",
    },
    {
      id: "cabin",
      label: "Cabin",
      position: [-0.2, 1.5, 0],
      anchorId: "cabin",
      cameraPresetId: "cabin-detail",
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
    {
      id: "front-detail",
      label: "Front detail",
      position: [4.5, 1.8, 3.2],
      target: [1.35, 0.95, 0.2],
      fov: 34,
    },
    {
      id: "cabin-detail",
      label: "Cabin",
      position: [2.5, 2.35, 4.25],
      target: [-0.15, 1.25, 0],
      fov: 32,
    },
    {
      id: "technical",
      label: "Technical inspection",
      position: [5.2, 4.2, 5.6],
      target: [0, 0.7, 0],
      fov: 32,
    },
  ],
};

// Furniture manifest definition
const furnitureManifest: ShowcaseManifest = {
  id: "furniture-kroma-chair-01",
  slug: "furniture-kroma-chair-01",
  title: "Kroma Lounge Chair",
  scene: {
    assets: [
      {
        id: "kroma-chair-base",
        kind: "gltf",
        slot: "subject",
        default: true,
        url: "/models/kroma-chair-lod0.glb",
        fallbackImage: "/showcase/kroma-chair-poster.svg",
        lod: [
          { maxViewportWidth: 720, url: "/models/kroma-chair-lod2.glb" },
          { maxViewportWidth: 1200, url: "/models/kroma-chair-lod1.glb" },
        ],
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
          label: "Obsidian",
          bindings: [{ type: "material-color", target: "upholstery", value: "#1e2124" }],
        },
        {
          id: "upholstery-cognac",
          label: "Cognac",
          bindings: [{ type: "material-color", target: "upholstery", value: "#8a4f28" }],
        },
        {
          id: "upholstery-forest",
          label: "Forest",
          bindings: [{ type: "material-color", target: "upholstery", value: "#2d4a3e" }],
        },
      ],
    },
    {
      id: "base-finish",
      label: "Base",
      selection: "single",
      defaultOptionIds: ["base-aluminum"],
      options: [
        {
          id: "base-aluminum",
          label: "Aluminum",
          bindings: [{ type: "material-color", target: "metal", value: "#d8dce2" }],
        },
        {
          id: "base-gold",
          label: "Gold",
          bindings: [{ type: "material-color", target: "metal", value: "#c8a876" }],
        },
      ],
    },
  ],
  hotspots: [
    {
      id: "lumbar",
      label: "Lumbar support",
      position: [0.35, 0.72, -0.15],
      anchorId: "lumbar",
      cameraPresetId: "lumbar-detail",
    },
  ],
  cameraPresets: [
    {
      id: "hero",
      label: "Hero",
      position: [1.9, 1.4, 2.2],
      target: [0, 0.75, 0],
      fov: 36,
    },
    {
      id: "lumbar-detail",
      label: "Lumbar",
      position: [1.1, 0.95, 0.9],
      target: [0, 0.72, -0.15],
      fov: 28,
    },
  ],
};

const initialPolicy: RenderPolicy = {
  quality: "medium",
  maxDpr: 1.5,
  enableShadows: true,
  enablePostProcessing: false,
  preferReducedMotion: false,
};

export function EmbedExperience() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "automotive-concept-01";
  const showControls = searchParams.get("controls") !== "0";

  const rawManifest = slug.includes("furniture") || slug.includes("chair")
    ? furnitureManifest
    : automotiveManifest;

  const [selection, setSelection] = useState(() => createDefaultSelection(rawManifest));
  const [renderPolicy, setRenderPolicy] = useState(initialPolicy);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [mode, setMode] = useState<ExperienceMode>("explore");
  const [activeHotspotId, setActiveHotspotId] = useState<string>();
  const [activeCameraPresetId, setActiveCameraPresetId] = useState(
    rawManifest.scene.defaultCameraPresetId,
  );
  const [cameraRequestKey, setCameraRequestKey] = useState(0);

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
      ...rawManifest,
      scene: {
        ...rawManifest.scene,
        environment: {
          ...rawManifest.scene.environment,
          preset: isNight ? "night" : "studio",
        },
      },
    };
  }, [rawManifest, selection.atmosphere]);

  const resolvedBindings = useMemo(
    () => resolveSelectionBindings(effectiveManifest, selection),
    [effectiveManifest, selection],
  );

  const technicalBindings = useMemo<VariantBinding[]>(() => {
    if (mode !== "technical") return [];
    return [
      { type: "node-transform", target: "cabin", positionOffset: [0, 0.35, 0] },
      { type: "node-transform", target: "wheel_fl*", positionOffset: [0, 0, 0.28] },
      { type: "node-transform", target: "wheel_rl*", positionOffset: [0, 0, 0.28] },
      { type: "node-transform", target: "wheel_fr*", positionOffset: [0, 0, -0.28] },
      { type: "node-transform", target: "wheel_rr*", positionOffset: [0, 0, -0.28] },
    ];
  }, [mode]);

  const bindings = useMemo(
    () => [...resolvedBindings.map((r) => r.binding), ...technicalBindings],
    [resolvedBindings, technicalBindings],
  );

  const snapshot = useMemo(
    () => createSelectionSnapshot(effectiveManifest, selection),
    [effectiveManifest, selection],
  );

  // Send message to parent window
  const postToParent = useCallback((data: unknown) => {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(data, "*");
    }
  }, []);

  // Post snapshot updates
  useEffect(() => {
    postToParent({ type: "SHOWCASE_SELECTION_CHANGED", snapshot });
  }, [postToParent, snapshot]);

  // Handle inbound postMessage from parent
  useEffect(() => {
    const handleInbound = (event: MessageEvent) => {
      const data = event.data as ShowcaseInboundAction | undefined;
      if (!data || typeof data !== "object" || !("type" in data)) return;

      switch (data.type) {
        case "SHOWCASE_SELECT_OPTION":
          setSelection((curr) => selectOption(effectiveManifest, curr, data.groupId, data.optionId));
          break;
        case "SHOWCASE_SET_CAMERA_PRESET":
          setActiveCameraPresetId(data.presetId);
          setCameraRequestKey((c) => c + 1);
          break;
        case "SHOWCASE_SET_ATMOSPHERE":
          setSelection((curr) =>
            selectOption(
              effectiveManifest,
              curr,
              "atmosphere",
              data.atmosphere === "night" ? "atmosphere-night" : "atmosphere-studio",
            ),
          );
          break;
        case "SHOWCASE_TRIGGER_TECHNICAL":
          if (data.active) {
            setMode("technical");
            setActiveCameraPresetId("technical");
          } else {
            setMode("explore");
            setActiveCameraPresetId("hero");
          }
          setCameraRequestKey((c) => c + 1);
          break;
        case "SHOWCASE_REQUEST_SNAPSHOT":
          postToParent({ type: "SHOWCASE_SELECTION_CHANGED", snapshot });
          break;
      }
    };

    window.addEventListener("message", handleInbound);
    return () => window.removeEventListener("message", handleInbound);
  }, [effectiveManifest, postToParent, snapshot]);

  const handleAssetRuntimeEvent = useCallback(
    (event: AssetRuntimeEvent) => {
      if (event.status === "ready") {
        postToParent({
          type: "SHOWCASE_READY",
          manifestId: effectiveManifest.id,
          slug: effectiveManifest.slug,
        });
      }
    },
    [effectiveManifest.id, effectiveManifest.slug, postToParent],
  );

  const handleHotspotSelect = useCallback(
    (hotspot: Hotspot) => {
      setActiveHotspotId(hotspot.id);
      if (hotspot.cameraPresetId) {
        setActiveCameraPresetId(hotspot.cameraPresetId);
        setCameraRequestKey((c) => c + 1);
      }
      postToParent({
        type: "SHOWCASE_HOTSPOT_CLICKED",
        hotspotId: hotspot.id,
        label: hotspot.label,
      });
    },
    [postToParent],
  );

  return (
    <div className="embed-shell">
      <ShowcaseViewport
        manifest={effectiveManifest}
        renderPolicy={renderPolicy}
        bindings={bindings}
        viewportWidth={viewportWidth}
        activeHotspotId={activeHotspotId}
        activeCameraPresetId={activeCameraPresetId}
        cameraRequestKey={cameraRequestKey}
        onHotspotSelect={handleHotspotSelect}
        onAssetRuntimeEvent={handleAssetRuntimeEvent}
      />

      {showControls && (
        <div className="embed-floating-bar" role="toolbar" aria-label="Embed controls">
          <div className="embed-badge">
            <span>{effectiveManifest.title}</span>
          </div>

          <div className="embed-actions">
            {effectiveManifest.optionGroups[0]?.options.slice(0, 4).map((opt) => {
              const active = selection[effectiveManifest.optionGroups[0]!.id]?.includes(opt.id);
              const color = opt.bindings.find((b) => b.type === "material-color")?.value;
              return (
                <button
                  type="button"
                  key={opt.id}
                  className="embed-pill-btn"
                  data-active={active}
                  onClick={() =>
                    setSelection((curr) =>
                      selectOption(effectiveManifest, curr, effectiveManifest.optionGroups[0]!.id, opt.id),
                    )
                  }
                  title={opt.label}
                >
                  {color && <span className="embed-swatch" style={{ background: color }} />}
                  <span>{opt.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              className="embed-icon-btn"
              onClick={() => {
                setActiveCameraPresetId("hero");
                setActiveHotspotId(undefined);
                setMode("explore");
                setCameraRequestKey((c) => c + 1);
              }}
              title="Reset Camera"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
