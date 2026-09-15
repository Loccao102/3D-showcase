import type { RenderPolicy, RenderQuality } from "./types";

export interface FramePerformanceSample {
  averageFrameTimeMs: number;
  p95FrameTimeMs: number;
  fps: number;
  sampleCount: number;
  quality: RenderQuality;
}

export function lowerRenderQuality(quality: RenderQuality): RenderQuality {
  if (quality === "high") return "medium";
  if (quality === "medium") return "low";
  return "low";
}

export function resolveAdaptiveRenderPolicy(
  basePolicy: RenderPolicy,
  quality: RenderQuality,
): RenderPolicy {
  if (quality === "low") {
    return {
      ...basePolicy,
      quality,
      maxDpr: Math.min(basePolicy.maxDpr, 1),
      enableShadows: false,
      enablePostProcessing: false,
    };
  }

  if (quality === "medium") {
    return {
      ...basePolicy,
      quality,
      maxDpr: Math.min(basePolicy.maxDpr, 1.5),
      enablePostProcessing: false,
    };
  }

  return { ...basePolicy, quality };
}
