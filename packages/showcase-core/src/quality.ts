import type { DeviceCapabilities, RenderPolicy } from "./types";

export function resolveRenderPolicy(
  capabilities: DeviceCapabilities,
): RenderPolicy {
  const {
    viewportWidth,
    devicePixelRatio,
    deviceMemoryGb,
    hardwareConcurrency,
    saveData,
    prefersReducedMotion,
  } = capabilities;

  const constrainedByMemory = deviceMemoryGb !== undefined && deviceMemoryGb <= 4;
  const constrainedByCpu =
    hardwareConcurrency !== undefined && hardwareConcurrency <= 4;
  const compactViewport = viewportWidth < 768;

  if (saveData || constrainedByMemory || (compactViewport && constrainedByCpu)) {
    return {
      quality: "low",
      maxDpr: Math.min(devicePixelRatio, 1),
      enableShadows: false,
      enablePostProcessing: false,
      preferReducedMotion: Boolean(prefersReducedMotion),
    };
  }

  if (compactViewport || (deviceMemoryGb !== undefined && deviceMemoryGb < 8)) {
    return {
      quality: "medium",
      maxDpr: Math.min(devicePixelRatio, 1.5),
      enableShadows: true,
      enablePostProcessing: false,
      preferReducedMotion: Boolean(prefersReducedMotion),
    };
  }

  return {
    quality: "high",
    maxDpr: Math.min(devicePixelRatio, 2),
    enableShadows: true,
    enablePostProcessing: !prefersReducedMotion,
    preferReducedMotion: Boolean(prefersReducedMotion),
  };
}
