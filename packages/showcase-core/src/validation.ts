import type { ShowcaseManifest } from "./types";

export type ManifestValidationSeverity = "error" | "warning";

export interface ManifestValidationIssue {
  severity: ManifestValidationSeverity;
  code:
    | "duplicate-id"
    | "missing-default-asset"
    | "multiple-default-assets"
    | "missing-reference"
    | "invalid-default-option"
    | "invalid-lod-order";
  path: string;
  message: string;
}

function findDuplicates(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

export function validateShowcaseManifest(
  manifest: ShowcaseManifest,
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  const assetIds = new Set(manifest.scene.assets.map((asset) => asset.id));
  const cameraIds = new Set(manifest.cameraPresets.map((camera) => camera.id));

  for (const duplicate of findDuplicates(
    manifest.scene.assets.map((asset) => asset.id),
  )) {
    issues.push({
      severity: "error",
      code: "duplicate-id",
      path: "scene.assets",
      message: `Duplicate asset id '${duplicate}'`,
    });
  }

  for (const duplicate of findDuplicates(
    manifest.cameraPresets.map((camera) => camera.id),
  )) {
    issues.push({
      severity: "error",
      code: "duplicate-id",
      path: "cameraPresets",
      message: `Duplicate camera preset id '${duplicate}'`,
    });
  }

  for (const duplicate of findDuplicates(manifest.hotspots.map((hotspot) => hotspot.id))) {
    issues.push({
      severity: "error",
      code: "duplicate-id",
      path: "hotspots",
      message: `Duplicate hotspot id '${duplicate}'`,
    });
  }

  const defaults = manifest.scene.assets.filter((asset) => asset.default);
  if (defaults.length === 0) {
    issues.push({
      severity: "error",
      code: "missing-default-asset",
      path: "scene.assets",
      message: "A showcase manifest must define one default asset",
    });
  } else if (defaults.length > 1) {
    issues.push({
      severity: "error",
      code: "multiple-default-assets",
      path: "scene.assets",
      message: "A showcase manifest must not define more than one default asset",
    });
  }

  if (
    manifest.scene.defaultCameraPresetId &&
    !cameraIds.has(manifest.scene.defaultCameraPresetId)
  ) {
    issues.push({
      severity: "error",
      code: "missing-reference",
      path: "scene.defaultCameraPresetId",
      message: `Unknown camera preset '${manifest.scene.defaultCameraPresetId}'`,
    });
  }

  for (const [assetIndex, asset] of manifest.scene.assets.entries()) {
    if (asset.lod && asset.lod.length > 1) {
      for (let index = 1; index < asset.lod.length; index += 1) {
        if (asset.lod[index]!.maxViewportWidth <= asset.lod[index - 1]!.maxViewportWidth) {
          issues.push({
            severity: "error",
            code: "invalid-lod-order",
            path: `scene.assets[${assetIndex}].lod`,
            message: `LOD viewport widths for asset '${asset.id}' must be strictly ascending`,
          });
          break;
        }
      }
    }
  }

  for (const [groupIndex, group] of manifest.optionGroups.entries()) {
    const optionIds = group.options.map((option) => option.id);
    const optionIdSet = new Set(optionIds);

    for (const duplicate of findDuplicates(optionIds)) {
      issues.push({
        severity: "error",
        code: "duplicate-id",
        path: `optionGroups[${groupIndex}].options`,
        message: `Duplicate option id '${duplicate}' in group '${group.id}'`,
      });
    }

    for (const defaultOptionId of group.defaultOptionIds ?? []) {
      if (!optionIdSet.has(defaultOptionId)) {
        issues.push({
          severity: "error",
          code: "invalid-default-option",
          path: `optionGroups[${groupIndex}].defaultOptionIds`,
          message: `Default option '${defaultOptionId}' does not exist in group '${group.id}'`,
        });
      }
    }

    for (const [optionIndex, option] of group.options.entries()) {
      for (const [bindingIndex, binding] of option.bindings.entries()) {
        if (binding.type === "asset-replacement" && !assetIds.has(binding.assetId)) {
          issues.push({
            severity: "error",
            code: "missing-reference",
            path: `optionGroups[${groupIndex}].options[${optionIndex}].bindings[${bindingIndex}]`,
            message: `Asset replacement references unknown asset '${binding.assetId}'`,
          });
        }
      }
    }
  }

  for (const [hotspotIndex, hotspot] of manifest.hotspots.entries()) {
    if (hotspot.cameraPresetId && !cameraIds.has(hotspot.cameraPresetId)) {
      issues.push({
        severity: "error",
        code: "missing-reference",
        path: `hotspots[${hotspotIndex}].cameraPresetId`,
        message: `Hotspot '${hotspot.id}' references unknown camera preset '${hotspot.cameraPresetId}'`,
      });
    }
  }

  return issues;
}

export function assertValidShowcaseManifest(manifest: ShowcaseManifest) {
  const errors = validateShowcaseManifest(manifest).filter(
    (issue) => issue.severity === "error",
  );

  if (errors.length === 0) return;

  throw new Error(
    `Invalid showcase manifest:\n${errors
      .map((issue) => `- ${issue.path}: ${issue.message}`)
      .join("\n")}`,
  );
}
