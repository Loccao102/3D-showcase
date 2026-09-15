import type {
  OptionGroup,
  ShowcaseManifest,
  ShowcaseSelection,
  VariantBinding,
} from "./types";

export interface ResolvedVariantBinding {
  groupId: string;
  optionId: string;
  binding: VariantBinding;
}

function uniqueValidOptionIds(group: OptionGroup, optionIds: readonly string[]) {
  const validIds = new Set(group.options.map((option) => option.id));
  const seen = new Set<string>();

  return optionIds.filter((optionId) => {
    if (!validIds.has(optionId) || seen.has(optionId)) {
      return false;
    }

    seen.add(optionId);
    return true;
  });
}

function resolveGroupSelection(
  group: OptionGroup,
  selection: ShowcaseSelection,
): string[] {
  const requested = selection[group.id] ?? group.defaultOptionIds ?? [];
  const valid = uniqueValidOptionIds(group, requested);

  if (group.selection === "single") {
    if (valid[0]) {
      return [valid[0]];
    }

    return group.options[0] ? [group.options[0].id] : [];
  }

  return valid;
}

export function createDefaultSelection(
  manifest: ShowcaseManifest,
): ShowcaseSelection {
  return manifest.optionGroups.reduce<ShowcaseSelection>((selection, group) => {
    selection[group.id] = resolveGroupSelection(group, {});
    return selection;
  }, {});
}

export function setGroupSelection(
  manifest: ShowcaseManifest,
  selection: ShowcaseSelection,
  groupId: string,
  optionIds: readonly string[],
): ShowcaseSelection {
  const group = manifest.optionGroups.find((candidate) => candidate.id === groupId);

  if (!group) {
    return selection;
  }

  const valid = uniqueValidOptionIds(group, optionIds);
  const nextOptionIds = group.selection === "single" ? valid.slice(0, 1) : valid;

  return {
    ...selection,
    [group.id]: nextOptionIds,
  };
}

export function selectOption(
  manifest: ShowcaseManifest,
  selection: ShowcaseSelection,
  groupId: string,
  optionId: string,
): ShowcaseSelection {
  return setGroupSelection(manifest, selection, groupId, [optionId]);
}

export function resolveSelectionBindings(
  manifest: ShowcaseManifest,
  selection: ShowcaseSelection,
): ResolvedVariantBinding[] {
  const bindings: ResolvedVariantBinding[] = [];

  for (const group of manifest.optionGroups) {
    const selectedIds = new Set(resolveGroupSelection(group, selection));

    for (const option of group.options) {
      if (!selectedIds.has(option.id)) {
        continue;
      }

      for (const binding of option.bindings) {
        bindings.push({
          groupId: group.id,
          optionId: option.id,
          binding,
        });
      }
    }
  }

  return bindings;
}
