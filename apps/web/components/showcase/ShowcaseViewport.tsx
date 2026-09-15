"use client";

import type {
  Hotspot,
  RenderPolicy,
  ShowcaseManifest,
  VariantBinding,
} from "@showcase/core";
import {
  ShowcaseCanvas,
  ShowcaseHotspots,
  ShowcaseRuntime,
  ShowcaseScene,
  type AssetRuntimeEvent,
} from "@showcase/three";
import { useMemo } from "react";

export interface ShowcaseViewportProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  bindings: readonly VariantBinding[];
  viewportWidth: number;
  activeHotspotId?: string;
  activeCameraPresetId?: string;
  cameraRequestKey?: number;
  onHotspotSelect?: (hotspot: Hotspot) => void;
  onUserInteract?: () => void;
  onAssetRuntimeEvent?: (event: AssetRuntimeEvent) => void;
}

export default function ShowcaseViewport({
  manifest,
  renderPolicy,
  bindings,
  viewportWidth,
  activeHotspotId,
  activeCameraPresetId,
  cameraRequestKey,
  onHotspotSelect,
  onUserInteract,
  onAssetRuntimeEvent,
}: ShowcaseViewportProps) {
  const sceneMutationBindings = useMemo(
    () =>
      bindings.filter(
        (binding) =>
          binding.type === "material-color" || binding.type === "node-visibility",
      ),
    [bindings],
  );

  return (
    <ShowcaseCanvas
      manifest={manifest}
      renderPolicy={renderPolicy}
      className="showcase-canvas"
      activeCameraPresetId={activeCameraPresetId}
      cameraRequestKey={cameraRequestKey}
      onUserInteract={onUserInteract}
    >
      <ShowcaseRuntime bindings={sceneMutationBindings}>
        <ShowcaseScene
          manifest={manifest}
          bindings={bindings}
          viewportWidth={viewportWidth}
          onAssetRuntimeEvent={onAssetRuntimeEvent}
        />
      </ShowcaseRuntime>
      <ShowcaseHotspots
        hotspots={manifest.hotspots}
        activeHotspotId={activeHotspotId}
        onSelect={onHotspotSelect}
      />
    </ShowcaseCanvas>
  );
}
