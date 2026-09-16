"use client";

import type {
  FramePerformanceSample,
  Hotspot,
  RenderPolicy,
  RenderQuality,
  ShowcaseManifest,
  VariantBinding,
} from "@showcase/core";
import {
  ShowcaseCanvas,
  ShowcaseHotspots,
  ShowcaseRuntime,
  ShowcaseScene,
  type AssetRuntimeEvent,
  type RendererDiagnostics,
} from "@showcase/three";
import { useMemo } from "react";

export interface ShowcaseViewportProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  bindings: readonly VariantBinding[];
  viewportWidth: number;
  activeHotspotId?: string | undefined;
  activeCameraPresetId?: string | undefined;
  cameraRequestKey?: number | undefined;
  onHotspotSelect?: ((hotspot: Hotspot) => void) | undefined;
  onUserInteract?: (() => void) | undefined;
  onAssetRuntimeEvent?: ((event: AssetRuntimeEvent) => void) | undefined;
  onPerformanceSample?: ((sample: FramePerformanceSample) => void) | undefined;
  onQualitySuggestion?: ((quality: RenderQuality) => void) | undefined;
  onRendererDiagnostics?: ((diagnostics: RendererDiagnostics) => void) | undefined;
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
  onPerformanceSample,
  onQualitySuggestion,
  onRendererDiagnostics,
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
      onPerformanceSample={onPerformanceSample}
      onQualitySuggestion={onQualitySuggestion}
      onRendererDiagnostics={onRendererDiagnostics}
    >
      <ShowcaseRuntime
        bindings={sceneMutationBindings}
        materialTransitionMs={renderPolicy.preferReducedMotion ? 0 : 220}
      >
        <ShowcaseScene
          manifest={manifest}
          bindings={bindings}
          viewportWidth={viewportWidth}
          reducedMotion={renderPolicy.preferReducedMotion}
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
