"use client";

import {
  resolveSceneAssets,
  type ShowcaseManifest,
  type VariantBinding,
} from "@showcase/core";
import { useMemo } from "react";
import {
  ShowcaseAsset,
  type AssetRuntimeEvent,
} from "./ShowcaseAsset";

export interface ShowcaseSceneProps {
  manifest: ShowcaseManifest;
  bindings: readonly VariantBinding[];
  viewportWidth: number;
  reducedMotion?: boolean | undefined;
  onAssetRuntimeEvent?: ((event: AssetRuntimeEvent) => void) | undefined;
}

export function ShowcaseScene({
  manifest,
  bindings,
  viewportWidth,
  reducedMotion = false,
  onAssetRuntimeEvent,
}: ShowcaseSceneProps) {
  const assets = useMemo(
    () => resolveSceneAssets(manifest, bindings),
    [bindings, manifest],
  );
  const animationBindings = useMemo(
    () =>
      bindings.filter(
        (
          binding,
        ): binding is Extract<VariantBinding, { type: "animation-state" }> =>
          binding.type === "animation-state",
      ),
    [bindings],
  );

  return (
    <group name="showcase-assets">
      {assets.map((asset) => (
        <ShowcaseAsset
          key={asset.id}
          asset={asset}
          viewportWidth={viewportWidth}
          reducedMotion={reducedMotion}
          animationBindings={animationBindings}
          onRuntimeEvent={onAssetRuntimeEvent}
        />
      ))}
    </group>
  );
}
