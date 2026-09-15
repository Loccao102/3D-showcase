import type {
  AssetSource,
  ShowcaseManifest,
  ShowcaseSelection,
  ShowcaseSelectionSnapshot,
  VariantBinding,
} from "./types";

export function resolveAssetUrl(
  asset: AssetSource,
  viewportWidth: number,
): string | undefined {
  const sortedLods = [...(asset.lod ?? [])].sort(
    (left, right) => left.maxViewportWidth - right.maxViewportWidth,
  );

  const responsiveLod = sortedLods.find(
    (candidate) => viewportWidth <= candidate.maxViewportWidth,
  );

  return responsiveLod?.url ?? asset.url ?? sortedLods.at(-1)?.url;
}

export function resolveSceneAssets(
  manifest: ShowcaseManifest,
  bindings: readonly VariantBinding[],
): AssetSource[] {
  const replacementBySlot = new Map<string, string>();

  for (const binding of bindings) {
    if (binding.type === "asset-replacement") {
      replacementBySlot.set(binding.target, binding.assetId);
    }
  }

  const slotAssets = new Map<string, AssetSource[]>();
  const alwaysMounted: AssetSource[] = [];

  for (const asset of manifest.scene.assets) {
    if (!asset.slot) {
      alwaysMounted.push(asset);
      continue;
    }

    const assets = slotAssets.get(asset.slot) ?? [];
    assets.push(asset);
    slotAssets.set(asset.slot, assets);
  }

  const selected: AssetSource[] = [...alwaysMounted];

  for (const [slot, assets] of slotAssets) {
    const replacementId = replacementBySlot.get(slot);
    const replacement = replacementId
      ? assets.find((candidate) => candidate.id === replacementId)
      : undefined;
    const fallback = assets.find((candidate) => candidate.default) ?? assets[0];
    const resolved = replacement ?? fallback;

    if (resolved) {
      selected.push(resolved);
    }
  }

  return selected;
}

export function createSelectionSnapshot(
  manifest: ShowcaseManifest,
  selection: ShowcaseSelection,
): ShowcaseSelectionSnapshot {
  const normalized: ShowcaseSelection = {};
  const optionIds: string[] = [];

  for (const group of manifest.optionGroups) {
    const selected = [...(selection[group.id] ?? [])];
    normalized[group.id] = selected;
    optionIds.push(...selected);
  }

  return {
    manifestId: manifest.id,
    slug: manifest.slug,
    selection: normalized,
    optionIds,
  };
}
