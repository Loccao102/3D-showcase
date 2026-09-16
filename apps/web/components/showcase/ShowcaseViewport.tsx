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
import { useCallback, useEffect, useMemo, useState } from "react";

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

interface DeviceDiagnosticsSnapshot {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  deviceMemoryGb?: number | undefined;
  hardwareConcurrency?: number | undefined;
  saveData?: boolean | undefined;
  effectiveType?: string | undefined;
  downlinkMbps?: number | undefined;
  rttMs?: number | undefined;
  prefersReducedMotion: boolean;
  userAgent: string;
}

interface AssetTelemetryEntry {
  assetId: string;
  status: AssetRuntimeEvent["status"];
  url?: string | undefined;
  durationMs?: number | undefined;
  error?: string | undefined;
}

function readPageTimings() {
  if (typeof performance === "undefined") {
    return {};
  }

  const paints = performance.getEntriesByType("paint");
  const navigation = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;
  const paintTime = (name: string) =>
    paints.find((entry) => entry.name === name)?.startTime;

  return {
    firstPaintMs: paintTime("first-paint"),
    firstContentfulPaintMs: paintTime("first-contentful-paint"),
    domContentLoadedMs: navigation?.domContentLoadedEventEnd,
    loadEventMs: navigation?.loadEventEnd,
  };
}

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
  const [deviceDiagnostics, setDeviceDiagnostics] =
    useState<DeviceDiagnosticsSnapshot>();
  const [rendererDiagnostics, setRendererDiagnostics] =
    useState<RendererDiagnostics>();
  const [frameSample, setFrameSample] = useState<FramePerformanceSample>();
  const [qualitySuggestion, setQualitySuggestion] = useState<RenderQuality>();
  const [assetTelemetry, setAssetTelemetry] = useState<
    Record<string, AssetTelemetryEntry>
  >({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">(
    "idle",
  );

  useEffect(() => {
    const nav = navigator as ExtendedNavigator;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const capture = () => {
      setDeviceDiagnostics({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        deviceMemoryGb: nav.deviceMemory,
        hardwareConcurrency: nav.hardwareConcurrency,
        saveData: nav.connection?.saveData,
        effectiveType: nav.connection?.effectiveType,
        downlinkMbps: nav.connection?.downlink,
        rttMs: nav.connection?.rtt,
        prefersReducedMotion: motionQuery.matches,
        userAgent: navigator.userAgent,
      });
    };

    capture();
    window.addEventListener("resize", capture);
    motionQuery.addEventListener("change", capture);

    return () => {
      window.removeEventListener("resize", capture);
      motionQuery.removeEventListener("change", capture);
    };
  }, []);

  const sceneMutationBindings = useMemo(
    () =>
      bindings.filter(
        (binding) =>
          binding.type === "material-color" || binding.type === "node-visibility",
      ),
    [bindings],
  );

  const handleAssetRuntimeEvent = useCallback(
    (event: AssetRuntimeEvent) => {
      onAssetRuntimeEvent?.(event);
      const key = event.url ?? event.assetId;
      setAssetTelemetry((current) => ({
        ...current,
        [key]: {
          assetId: event.assetId,
          status: event.status,
          url: event.url,
          durationMs: event.durationMs,
          error: event.error?.message,
        },
      }));
    },
    [onAssetRuntimeEvent],
  );

  const handlePerformanceSample = useCallback(
    (sample: FramePerformanceSample) => {
      setFrameSample(sample);
      onPerformanceSample?.(sample);
    },
    [onPerformanceSample],
  );

  const handleQualitySuggestion = useCallback(
    (quality: RenderQuality) => {
      setQualitySuggestion(quality);
      onQualitySuggestion?.(quality);
    },
    [onQualitySuggestion],
  );

  const handleRendererDiagnostics = useCallback(
    (diagnostics: RendererDiagnostics) => {
      setRendererDiagnostics(diagnostics);
      onRendererDiagnostics?.(diagnostics);
    },
    [onRendererDiagnostics],
  );

  const assetEntries = Object.values(assetTelemetry);
  const latestAsset = assetEntries.at(-1);

  const createDiagnosticsSnapshot = useCallback(
    () => ({
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      manifest: {
        id: manifest.id,
        slug: manifest.slug,
        assetStage: manifest.metadata?.assetStage,
        engineVersion: manifest.metadata?.engineVersion,
      },
      device: deviceDiagnostics,
      renderer: rendererDiagnostics,
      baseRenderPolicy: renderPolicy,
      qualitySuggestion,
      latestFrameSample: frameSample,
      pageTimings: readPageTimings(),
      assets: Object.values(assetTelemetry),
      experience: {
        viewportWidth,
        activeHotspotId,
        activeCameraPresetId,
        bindings,
      },
    }),
    [
      activeCameraPresetId,
      activeHotspotId,
      assetTelemetry,
      bindings,
      deviceDiagnostics,
      frameSample,
      manifest.id,
      manifest.metadata,
      manifest.slug,
      qualitySuggestion,
      renderPolicy,
      rendererDiagnostics,
      viewportWidth,
    ],
  );

  const copyDiagnostics = useCallback(async () => {
    if (!navigator.clipboard) {
      setCopyState("unavailable");
      return;
    }

    await navigator.clipboard.writeText(
      JSON.stringify(createDiagnosticsSnapshot(), null, 2),
    );
    setCopyState("copied");
  }, [createDiagnosticsSnapshot]);

  return (
    <>
      <ShowcaseCanvas
        manifest={manifest}
        renderPolicy={renderPolicy}
        className="showcase-canvas"
        activeCameraPresetId={activeCameraPresetId}
        cameraRequestKey={cameraRequestKey}
        onUserInteract={onUserInteract}
        onPerformanceSample={handlePerformanceSample}
        onQualitySuggestion={handleQualitySuggestion}
        onRendererDiagnostics={handleRendererDiagnostics}
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
            onAssetRuntimeEvent={handleAssetRuntimeEvent}
          />
        </ShowcaseRuntime>
        <ShowcaseHotspots
          hotspots={manifest.hotspots}
          activeHotspotId={activeHotspotId}
          onSelect={onHotspotSelect}
        />
      </ShowcaseCanvas>

      <details className="runtime-diagnostics">
        <summary>Device diagnostics</summary>
        <div className="diagnostics-grid">
          <span>Viewport</span>
          <strong>
            {deviceDiagnostics
              ? `${deviceDiagnostics.viewportWidth}×${deviceDiagnostics.viewportHeight} @ ${deviceDiagnostics.devicePixelRatio.toFixed(2)}x`
              : "Collecting…"}
          </strong>

          <span>WebGL</span>
          <strong>
            {rendererDiagnostics
              ? `${rendererDiagnostics.webglVersion} · ${rendererDiagnostics.renderer}`
              : "Collecting…"}
          </strong>

          <span>Frame sample</span>
          <strong>
            {frameSample
              ? `${frameSample.fps.toFixed(0)} fps · p95 ${frameSample.p95FrameTimeMs.toFixed(1)} ms`
              : "Interact to sample 45 active frames"}
          </strong>

          <span>Asset</span>
          <strong>
            {latestAsset
              ? `${latestAsset.status}${latestAsset.durationMs === undefined ? "" : ` · ${latestAsset.durationMs.toFixed(0)} ms`}`
              : "Waiting for asset event"}
          </strong>

          <span>Quality</span>
          <strong>
            {qualitySuggestion
              ? `${renderPolicy.quality} → ${qualitySuggestion}`
              : renderPolicy.quality}
          </strong>
        </div>

        <div className="diagnostics-actions">
          <button type="button" onClick={copyDiagnostics}>
            {copyState === "copied"
              ? "Diagnostics copied"
              : copyState === "unavailable"
                ? "Clipboard unavailable"
                : "Copy diagnostics JSON"}
          </button>
          <span>Orbit or run Signature pulse before exporting frame metrics.</span>
        </div>
      </details>
    </>
  );
}
