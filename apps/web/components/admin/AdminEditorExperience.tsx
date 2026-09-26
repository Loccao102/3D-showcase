"use client";

import {
  createDefaultSelection,
  createSelectionSnapshot,
  resolveRenderPolicy,
  resolveSelectionBindings,
  type CameraPreset,
  type Hotspot,
  type RenderPolicy,
  type ShowcaseManifest,
  type Vec3,
} from "@showcase/core";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const ShowcaseViewport = dynamic(() => import("../showcase/ShowcaseViewport"), {
  ssr: false,
  loading: () => (
    <div className="showcase-loading" role="status">
      <span>Loading 3D Editor Canvas…</span>
    </div>
  ),
});

const defaultAutomotiveManifest: ShowcaseManifest = {
  id: "automotive-concept-01",
  slug: "automotive-concept-01",
  title: "Astra One",
  subtitle: "Visual Editor Studio — Automotive Vertical",
  scene: {
    assets: [
      {
        id: "astra-base",
        kind: "gltf",
        slot: "subject",
        default: true,
        url: "/models/astra-one-touring-lod0.glb",
        fallbackImage: "/showcase/astra-one-poster.svg",
      },
    ],
    environment: { preset: "studio", intensity: 0.85, background: "#090b0f" },
    defaultCameraPresetId: "hero",
  },
  optionGroups: [
    {
      id: "finish",
      label: "Finish",
      selection: "single",
      defaultOptionIds: ["finish-graphite"],
      options: [
        { id: "finish-graphite", label: "Graphite", bindings: [{ type: "material-color", target: "body", value: "#424c58" }] },
        { id: "finish-silver", label: "Liquid silver", bindings: [{ type: "material-color", target: "body", value: "#a9afb7" }] },
        { id: "finish-blue", label: "Ion blue", bindings: [{ type: "material-color", target: "body", value: "#164f8c" }] },
      ],
    },
  ],
  hotspots: [
    { id: "front-light", label: "Lighting system", position: [2.1, 0.95, 0.7], anchorId: "front-light", cameraPresetId: "front-detail" },
    { id: "cabin", label: "Cabin", position: [-0.2, 1.5, 0], anchorId: "cabin", cameraPresetId: "cabin-detail" },
    { id: "rear", label: "Rear profile", position: [-2.1, 0.95, 0.7], anchorId: "rear", cameraPresetId: "rear-detail" },
  ],
  cameraPresets: [
    { id: "hero", label: "Hero perspective", position: [5.2, 2.7, 6.3], target: [0, 0.85, 0], fov: 38 },
    { id: "front-detail", label: "Front lighting", position: [4.5, 1.8, 3.2], target: [1.35, 0.95, 0.2], fov: 34 },
    { id: "cabin-detail", label: "Cabin volume", position: [2.5, 2.35, 4.25], target: [-0.15, 1.25, 0], fov: 32 },
    { id: "rear-detail", label: "Rear profile", position: [-4.6, 1.8, 3.2], target: [-1.35, 0.95, 0.2], fov: 34 },
  ],
};

const defaultFurnitureManifest: ShowcaseManifest = {
  id: "furniture-kroma-chair-01",
  slug: "furniture-kroma-chair-01",
  title: "Kroma Lounge Chair",
  subtitle: "Visual Editor Studio — Furniture Vertical",
  scene: {
    assets: [
      {
        id: "kroma-chair-base",
        kind: "gltf",
        slot: "subject",
        default: true,
        url: "/models/kroma-chair-lod0.glb",
        fallbackImage: "/showcase/kroma-chair-poster.svg",
      },
    ],
    environment: { preset: "studio", intensity: 0.9, background: "#090b0f" },
    defaultCameraPresetId: "hero",
  },
  optionGroups: [
    {
      id: "upholstery",
      label: "Upholstery",
      selection: "single",
      defaultOptionIds: ["upholstery-obsidian"],
      options: [
        { id: "upholstery-obsidian", label: "Obsidian", bindings: [{ type: "material-color", target: "upholstery", value: "#1e2124" }] },
        { id: "upholstery-cognac", label: "Cognac", bindings: [{ type: "material-color", target: "upholstery", value: "#8a4f28" }] },
      ],
    },
  ],
  hotspots: [
    { id: "lumbar", label: "Active lumbar", position: [0.35, 0.72, -0.15], anchorId: "lumbar", cameraPresetId: "lumbar-detail" },
    { id: "base", label: "5-Star base", position: [0.35, 0.15, 0.25], anchorId: "base", cameraPresetId: "base-detail" },
  ],
  cameraPresets: [
    { id: "hero", label: "Hero view", position: [1.9, 1.4, 2.2], target: [0, 0.75, 0], fov: 36 },
    { id: "lumbar-detail", label: "Lumbar focus", position: [1.1, 0.95, 0.9], target: [0, 0.72, -0.15], fov: 28 },
    { id: "base-detail", label: "Base focus", position: [1.3, 0.42, 1.3], target: [0, 0.12, 0], fov: 28 },
  ],
};

const initialPolicy: RenderPolicy = {
  quality: "medium",
  maxDpr: 1.5,
  enableShadows: true,
  enablePostProcessing: false,
  preferReducedMotion: false,
};

export function AdminEditorExperience() {
  const [selectedVertical, setSelectedVertical] = useState<"auto" | "furniture">("auto");
  const [manifest, setManifest] = useState<ShowcaseManifest>(defaultAutomotiveManifest);
  const [selection, setSelection] = useState(() => createDefaultSelection(defaultAutomotiveManifest));
  const [renderPolicy] = useState(initialPolicy);
  const [viewportWidth, setViewportWidth] = useState(1280);

  const [activeTab, setActiveTab] = useState<"hotspots" | "camera" | "json">("hotspots");
  const [activeCameraPresetId, setActiveCameraPresetId] = useState<string>("hero");
  const [cameraRequestKey, setCameraRequestKey] = useState(0);

  // Hotspot authoring form state
  const [newHotspotId, setNewHotspotId] = useState("");
  const [newHotspotLabel, setNewHotspotLabel] = useState("");
  const [newHotspotPos, setNewHotspotPos] = useState<Vec3>([0, 1.0, 0]);
  const [newHotspotPreset, setNewHotspotPreset] = useState("hero");

  // Camera preset authoring form state
  const [newPresetId, setNewPresetId] = useState("");
  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [currentCameraPos, setCurrentCameraPos] = useState<Vec3>([5.2, 2.7, 6.3]);
  const [currentCameraTarget, setCurrentCameraTarget] = useState<Vec3>([0, 0.85, 0]);
  const [currentCameraFov, setCurrentCameraFov] = useState(38);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setViewportWidth(window.innerWidth);
  }, []);

  const switchVertical = (vert: "auto" | "furniture") => {
    setSelectedVertical(vert);
    const m = vert === "auto" ? defaultAutomotiveManifest : defaultFurnitureManifest;
    setManifest(m);
    setSelection(createDefaultSelection(m));
    setActiveCameraPresetId(m.scene.defaultCameraPresetId ?? "hero");
    setCameraRequestKey((c) => c + 1);
  };

  const resolvedBindings = useMemo(
    () => resolveSelectionBindings(manifest, selection),
    [manifest, selection],
  );
  const bindings = useMemo(
    () => resolvedBindings.map((r) => r.binding),
    [resolvedBindings],
  );

  const handleAddHotspot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotspotId || !newHotspotLabel) return;

    const newSpot: Hotspot = {
      id: newHotspotId.trim().toLowerCase().replace(/\s+/g, "-"),
      label: newHotspotLabel.trim(),
      position: newHotspotPos,
      cameraPresetId: newHotspotPreset,
    };

    setManifest((prev) => ({
      ...prev,
      hotspots: [...prev.hotspots.filter((h) => h.id !== newSpot.id), newSpot],
    }));

    setNewHotspotId("");
    setNewHotspotLabel("");
    setToastMessage(`Hotspot '${newSpot.label}' added to manifest`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteHotspot = (id: string) => {
    setManifest((prev) => ({
      ...prev,
      hotspots: prev.hotspots.filter((h) => h.id !== id),
    }));
    setToastMessage(`Hotspot '${id}' removed`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddCameraPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetId || !newPresetLabel) return;

    const newPreset: CameraPreset = {
      id: newPresetId.trim().toLowerCase().replace(/\s+/g, "-"),
      label: newPresetLabel.trim(),
      position: currentCameraPos,
      target: currentCameraTarget,
      fov: currentCameraFov,
    };

    setManifest((prev) => ({
      ...prev,
      cameraPresets: [...prev.cameraPresets.filter((p) => p.id !== newPreset.id), newPreset],
    }));

    setNewPresetId("");
    setNewPresetLabel("");
    setToastMessage(`Camera preset '${newPreset.label}' captured & saved`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteCameraPreset = (id: string) => {
    setManifest((prev) => ({
      ...prev,
      cameraPresets: prev.cameraPresets.filter((p) => p.id !== id),
    }));
  };

  const handleSaveToApi = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/showcases/${manifest.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifest),
      });

      if (res.ok) {
        setToastMessage(`✓ Manifest successfully saved to Go API backend`);
      } else {
        setToastMessage(`API responded with status ${res.status} (local export ready)`);
      }
    } catch {
      setToastMessage(`API offline — Manifest updated in-memory & ready for export`);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyJson = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
      setToastMessage("Manifest JSON copied to clipboard");
      setTimeout(() => setToastMessage(null), 2800);
    }
  };

  return (
    <div className="admin-studio-shell">
      <header className="admin-header">
        <div className="admin-header-left">
          <Link href="/" className="admin-back-btn">
            ← Back to Showcase
          </Link>
          <span className="admin-divider">/</span>
          <h1 className="admin-title">Visual CMS Studio</h1>
          <span className="admin-chip">MANIFEST EDITOR</span>
        </div>

        <div className="admin-vertical-switcher">
          <button
            type="button"
            className="admin-switch-btn"
            data-active={selectedVertical === "auto"}
            onClick={() => switchVertical("auto")}
          >
            Astra One (Auto)
          </button>
          <button
            type="button"
            className="admin-switch-btn"
            data-active={selectedVertical === "furniture"}
            onClick={() => switchVertical("furniture")}
          >
            Kroma Chair (Furniture)
          </button>
        </div>

        <div className="admin-header-actions">
          <button type="button" className="secondary-btn" onClick={handleCopyJson}>
            Copy JSON
          </button>
          <button type="button" className="admin-save-btn" onClick={handleSaveToApi}>
            Save to Backend (Go API)
          </button>
        </div>
      </header>

      <div className="admin-workspace-grid">
        {/* 3D Viewport Column */}
        <section className="admin-viewport-panel">
          <div className="viewport-overlay-hint">
            <span>● Visual Camera Preset & Hotspot Placement Stage</span>
          </div>

          <ShowcaseViewport
            manifest={manifest}
            renderPolicy={renderPolicy}
            bindings={bindings}
            viewportWidth={viewportWidth}
            activeCameraPresetId={activeCameraPresetId}
            cameraRequestKey={cameraRequestKey}
          />

          <div className="admin-stage-toolbar">
            <span className="toolbar-label">Active Preset:</span>
            {manifest.cameraPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="admin-preset-tag"
                data-active={activeCameraPresetId === preset.id}
                onClick={() => {
                  setActiveCameraPresetId(preset.id);
                  setCameraRequestKey((c) => c + 1);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* Sidebar Controls Column */}
        <aside className="admin-sidebar">
          <nav className="admin-tabs" role="tablist">
            <button
              type="button"
              className="admin-tab-btn"
              data-active={activeTab === "hotspots"}
              onClick={() => setActiveTab("hotspots")}
            >
              Hotspots ({manifest.hotspots.length})
            </button>
            <button
              type="button"
              className="admin-tab-btn"
              data-active={activeTab === "camera"}
              onClick={() => setActiveTab("camera")}
            >
              Camera Presets ({manifest.cameraPresets.length})
            </button>
            <button
              type="button"
              className="admin-tab-btn"
              data-active={activeTab === "json"}
              onClick={() => setActiveTab("json")}
            >
              JSON Manifest
            </button>
          </nav>

          <div className="admin-tab-content">
            {/* TAB: HOTSPOTS */}
            {activeTab === "hotspots" && (
              <div className="admin-section">
                <form className="admin-form" onSubmit={handleAddHotspot}>
                  <h3>Add Semantic 3D Hotspot</h3>
                  <p className="form-sub">Anchor interactive markers to 3D world coordinates.</p>

                  <div className="form-field-group">
                    <label htmlFor="spot-id">Hotspot ID (slug)</label>
                    <input
                      id="spot-id"
                      type="text"
                      required
                      placeholder="e.g. aero-splitter"
                      value={newHotspotId}
                      onChange={(e) => setNewHotspotId(e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="spot-label">Display Label</label>
                    <input
                      id="spot-label"
                      type="text"
                      required
                      placeholder="e.g. Active Carbon Splitter"
                      value={newHotspotLabel}
                      onChange={(e) => setNewHotspotLabel(e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Position Coordinates [X, Y, Z] (meters)</label>
                    <div className="coord-inputs">
                      <input
                        type="number"
                        step="0.05"
                        value={newHotspotPos[0]}
                        onChange={(e) => setNewHotspotPos([parseFloat(e.target.value) || 0, newHotspotPos[1], newHotspotPos[2]])}
                        title="X Coordinate"
                      />
                      <input
                        type="number"
                        step="0.05"
                        value={newHotspotPos[1]}
                        onChange={(e) => setNewHotspotPos([newHotspotPos[0], parseFloat(e.target.value) || 0, newHotspotPos[2]])}
                        title="Y Coordinate"
                      />
                      <input
                        type="number"
                        step="0.05"
                        value={newHotspotPos[2]}
                        onChange={(e) => setNewHotspotPos([newHotspotPos[0], newHotspotPos[1], parseFloat(e.target.value) || 0])}
                        title="Z Coordinate"
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="spot-preset">Camera Angle on Select</label>
                    <select
                      id="spot-preset"
                      value={newHotspotPreset}
                      onChange={(e) => setNewHotspotPreset(e.target.value)}
                    >
                      {manifest.cameraPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="admin-action-btn">
                    + Insert Hotspot to Manifest
                  </button>
                </form>

                <div className="admin-items-list">
                  <h4>Configured Hotspots</h4>
                  {manifest.hotspots.map((h) => (
                    <div className="admin-item-card" key={h.id}>
                      <div className="admin-item-info">
                        <strong>{h.label}</strong>
                        <code>{h.id} · [{h.position.join(", ")}]</code>
                      </div>
                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={() => handleDeleteHotspot(h.id)}
                        title="Delete hotspot"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CAMERA PRESETS */}
            {activeTab === "camera" && (
              <div className="admin-section">
                <form className="admin-form" onSubmit={handleAddCameraPreset}>
                  <h3>Capture Viewport Camera Framing</h3>
                  <p className="form-sub">Define guided cinematic camera angles with position, target & FOV.</p>

                  <div className="form-field-group">
                    <label htmlFor="preset-id">Preset ID</label>
                    <input
                      id="preset-id"
                      type="text"
                      required
                      placeholder="e.g. cockpit-top-view"
                      value={newPresetId}
                      onChange={(e) => setNewPresetId(e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="preset-label">Preset Label</label>
                    <input
                      id="preset-label"
                      type="text"
                      required
                      placeholder="e.g. Cockpit Top View"
                      value={newPresetLabel}
                      onChange={(e) => setNewPresetLabel(e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Camera Position [X, Y, Z]</label>
                    <div className="coord-inputs">
                      <input
                        type="number"
                        step="0.1"
                        value={currentCameraPos[0]}
                        onChange={(e) => setCurrentCameraPos([parseFloat(e.target.value) || 0, currentCameraPos[1], currentCameraPos[2]])}
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={currentCameraPos[1]}
                        onChange={(e) => setCurrentCameraPos([currentCameraPos[0], parseFloat(e.target.value) || 0, currentCameraPos[2]])}
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={currentCameraPos[2]}
                        onChange={(e) => setCurrentCameraPos([currentCameraPos[0], currentCameraPos[1], parseFloat(e.target.value) || 0])}
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label>Look-At Target [X, Y, Z]</label>
                    <div className="coord-inputs">
                      <input
                        type="number"
                        step="0.1"
                        value={currentCameraTarget[0]}
                        onChange={(e) => setCurrentCameraTarget([parseFloat(e.target.value) || 0, currentCameraTarget[1], currentCameraTarget[2]])}
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={currentCameraTarget[1]}
                        onChange={(e) => setCurrentCameraTarget([currentCameraTarget[0], parseFloat(e.target.value) || 0, currentCameraTarget[2]])}
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={currentCameraTarget[2]}
                        onChange={(e) => setCurrentCameraTarget([currentCameraTarget[0], currentCameraTarget[1], parseFloat(e.target.value) || 0])}
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="cam-fov">Field of View (FOV): {currentCameraFov}°</label>
                    <input
                      id="cam-fov"
                      type="range"
                      min="20"
                      max="60"
                      value={currentCameraFov}
                      onChange={(e) => setCurrentCameraFov(parseInt(e.target.value, 10))}
                    />
                  </div>

                  <button type="submit" className="admin-action-btn">
                    + Capture & Save Camera Preset
                  </button>
                </form>

                <div className="admin-items-list">
                  <h4>Configured Camera Angles</h4>
                  {manifest.cameraPresets.map((p) => (
                    <div className="admin-item-card" key={p.id}>
                      <div className="admin-item-info">
                        <strong>{p.label}</strong>
                        <code>pos: [{p.position.join(", ")}] · fov: {p.fov}°</code>
                      </div>
                      <button
                        type="button"
                        className="admin-test-btn"
                        onClick={() => {
                          setActiveCameraPresetId(p.id);
                          setCameraRequestKey((c) => c + 1);
                        }}
                      >
                        Fly To
                      </button>
                      {p.id !== "hero" && (
                        <button
                          type="button"
                          className="admin-delete-btn"
                          onClick={() => handleDeleteCameraPreset(p.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: JSON MANIFEST */}
            {activeTab === "json" && (
              <div className="admin-section json-section">
                <div className="json-header">
                  <span>Live Schema v0.4 Document</span>
                  <button type="button" className="secondary-btn" onClick={handleCopyJson}>
                    Copy JSON
                  </button>
                </div>
                <pre className="admin-json-viewer">
                  {JSON.stringify(manifest, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </div>

      {toastMessage && (
        <div className="commerce-toast" role="status" aria-live="polite">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
