"use client";

import type { VariantBinding } from "@showcase/core";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Color, Group, Material, Object3D } from "three";

export interface BindingDiagnostic {
  level: "warning" | "error";
  code: "missing-target" | "missing-handler" | "apply-failed";
  binding: VariantBinding;
  message: string;
}

export interface SceneBindingContext {
  registry: SceneRegistry;
}

export interface SceneBindingHandlers {
  replaceAsset?: (
    binding: Extract<VariantBinding, { type: "asset-replacement" }>,
    context: SceneBindingContext,
  ) => void | (() => void);
  setAnimationState?: (
    binding: Extract<VariantBinding, { type: "animation-state" }>,
    context: SceneBindingContext,
  ) => void | (() => void);
}

function appendIndexed<T>(index: Map<string, T[]>, key: string, value: T) {
  if (!key) {
    return;
  }

  const existing = index.get(key);
  if (existing) {
    existing.push(value);
    return;
  }

  index.set(key, [value]);
}

function objectMaterials(object: Object3D): Material[] {
  const material = (object as Object3D & {
    material?: Material | Material[];
  }).material;

  if (!material) {
    return [];
  }

  return Array.isArray(material) ? material : [material];
}

function isColorMaterial(
  material: Material,
): material is Material & { color: Color } {
  return (material as Material & { color?: unknown }).color instanceof Color;
}

export class SceneRegistry {
  private readonly objects = new Map<string, Object3D[]>();
  private readonly materials = new Map<string, Material[]>();
  private readonly anchors = new Map<string, Object3D>();

  constructor(private readonly root: Object3D) {
    this.reindex();
  }

  reindex() {
    this.objects.clear();
    this.materials.clear();
    this.anchors.clear();

    this.root.traverse((object) => {
      if (object.name) {
        appendIndexed(this.objects, object.name, object);
      }

      const semanticId = object.userData.showcaseId;
      if (typeof semanticId === "string" && semanticId) {
        appendIndexed(this.objects, semanticId, object);
      }

      const explicitAnchor = object.userData.showcaseAnchor;
      if (typeof explicitAnchor === "string" && explicitAnchor) {
        this.anchors.set(explicitAnchor, object);
      }

      if (object.name.startsWith("anchor:")) {
        this.anchors.set(object.name.slice("anchor:".length), object);
      }

      for (const material of objectMaterials(object)) {
        if (material.name) {
          appendIndexed(this.materials, material.name, material);
        }

        const materialSemanticId = material.userData.showcaseId;
        if (typeof materialSemanticId === "string" && materialSemanticId) {
          appendIndexed(this.materials, materialSemanticId, material);
        }
      }
    });
  }

  getObjects(target: string): Object3D[] {
    return [...(this.objects.get(target) ?? [])];
  }

  getMaterials(target: string): Material[] {
    const resolved = new Set<Material>(this.materials.get(target) ?? []);

    for (const object of this.objects.get(target) ?? []) {
      for (const material of objectMaterials(object)) {
        resolved.add(material);
      }
    }

    return [...resolved];
  }

  getAnchor(anchorId: string): Object3D | undefined {
    return this.anchors.get(anchorId);
  }
}

class SceneBindingEngine {
  private cleanup: Array<() => void> = [];

  constructor(
    private readonly registry: SceneRegistry,
    private readonly handlers?: SceneBindingHandlers,
  ) {}

  reset() {
    for (const restore of this.cleanup.reverse()) {
      restore();
    }

    this.cleanup = [];
  }

  apply(bindings: readonly VariantBinding[]): BindingDiagnostic[] {
    this.reset();
    this.registry.reindex();

    const diagnostics: BindingDiagnostic[] = [];

    for (const binding of bindings) {
      try {
        const diagnostic = this.applyBinding(binding);
        if (diagnostic) {
          diagnostics.push(diagnostic);
        }
      } catch (error) {
        diagnostics.push({
          level: "error",
          code: "apply-failed",
          binding,
          message:
            error instanceof Error
              ? error.message
              : `Failed to apply ${binding.type} binding`,
        });
      }
    }

    return diagnostics;
  }

  private applyBinding(binding: VariantBinding): BindingDiagnostic | undefined {
    switch (binding.type) {
      case "material-color": {
        const materials = this.registry
          .getMaterials(binding.target)
          .filter(isColorMaterial);

        if (materials.length === 0) {
          return {
            level: "warning",
            code: "missing-target",
            binding,
            message: `No color-capable material found for target '${binding.target}'`,
          };
        }

        for (const material of materials) {
          const previousColor = material.color.clone();
          material.color.set(binding.value);
          material.needsUpdate = true;

          this.cleanup.push(() => {
            material.color.copy(previousColor);
            material.needsUpdate = true;
          });
        }

        return undefined;
      }

      case "node-visibility": {
        const objects = this.registry.getObjects(binding.target);

        if (objects.length === 0) {
          return {
            level: "warning",
            code: "missing-target",
            binding,
            message: `No scene node found for target '${binding.target}'`,
          };
        }

        for (const object of objects) {
          const previousVisibility = object.visible;
          object.visible = binding.visible;
          this.cleanup.push(() => {
            object.visible = previousVisibility;
          });
        }

        return undefined;
      }

      case "asset-replacement": {
        if (!this.handlers?.replaceAsset) {
          return {
            level: "warning",
            code: "missing-handler",
            binding,
            message: `Asset replacement target '${binding.target}' has no runtime handler`,
          };
        }

        const cleanup = this.handlers.replaceAsset(binding, {
          registry: this.registry,
        });
        if (cleanup) {
          this.cleanup.push(cleanup);
        }

        return undefined;
      }

      case "animation-state": {
        if (!this.handlers?.setAnimationState) {
          return {
            level: "warning",
            code: "missing-handler",
            binding,
            message: `Animation target '${binding.target}' has no runtime handler`,
          };
        }

        const cleanup = this.handlers.setAnimationState(binding, {
          registry: this.registry,
        });
        if (cleanup) {
          this.cleanup.push(cleanup);
        }

        return undefined;
      }
    }
  }
}

export interface ShowcaseRuntimeProps {
  bindings: readonly VariantBinding[];
  children: ReactNode;
  handlers?: SceneBindingHandlers;
  onDiagnostics?: (diagnostics: BindingDiagnostic[]) => void;
}

export function ShowcaseRuntime({
  bindings,
  children,
  handlers,
  onDiagnostics,
}: ShowcaseRuntimeProps) {
  const rootRef = useRef<Group | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const registry = new SceneRegistry(root);
    const engine = new SceneBindingEngine(registry, handlers);
    const diagnostics = engine.apply(bindings);

    onDiagnostics?.(diagnostics);

    return () => {
      engine.reset();
    };
  }, [bindings, handlers, onDiagnostics]);

  return <group ref={rootRef}>{children}</group>;
}
