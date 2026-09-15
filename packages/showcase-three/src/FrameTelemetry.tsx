"use client";

import {
  lowerRenderQuality,
  type FramePerformanceSample,
  type RenderQuality,
} from "@showcase/core";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export interface FrameTelemetryProps {
  quality: RenderQuality;
  enabled?: boolean | undefined;
  onSample?: ((sample: FramePerformanceSample) => void) | undefined;
  onQualitySuggestion?: ((quality: RenderQuality) => void) | undefined;
}

export function FrameTelemetry({
  quality,
  enabled = true,
  onSample,
  onQualitySuggestion,
}: FrameTelemetryProps) {
  const valuesRef = useRef<number[]>([]);
  const lastChangeAtRef = useRef(0);

  useFrame((_, delta) => {
    if (!enabled) return;

    const frameMs = delta * 1000;
    if (frameMs < 1 || frameMs > 100) return;

    valuesRef.current.push(frameMs);
    if (valuesRef.current.length < 45) return;

    const values = valuesRef.current.splice(0, valuesRef.current.length);
    const averageFrameTimeMs =
      values.reduce((total, value) => total + value, 0) / values.length;
    const sorted = [...values].sort((left, right) => left - right);
    const p95FrameTimeMs = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
    const fps = averageFrameTimeMs > 0 ? 1000 / averageFrameTimeMs : 0;

    onSample?.({
      averageFrameTimeMs,
      p95FrameTimeMs,
      fps,
      sampleCount: values.length,
      quality,
    });

    const now = performance.now();
    if (
      quality !== "low" &&
      (averageFrameTimeMs >= 24 || p95FrameTimeMs >= 34) &&
      now - lastChangeAtRef.current >= 5000
    ) {
      lastChangeAtRef.current = now;
      onQualitySuggestion?.(lowerRenderQuality(quality));
    }
  });

  return null;
}
