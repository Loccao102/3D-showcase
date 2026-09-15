"use client";

import type { VariantBinding } from "@showcase/core";
import { useThree } from "@react-three/fiber";
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

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
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
    private readonly handlers: SceneBindingHandlers | undefined,
    private readonly materialTransitionMs: number,
    private readonly requestRender: (() => void) | undefined,
  ) {}

  reset() {
    for (const restore of this.cleanup.reverse()) {
      restore();
    }

    this.cleanup = [];
  }

  apply(bindings: readonly VariantBinding[]): BindingDiagnostic[] {
    this.registry.reindex();

    const visibleColors = new Map<Material, Color>();
    for (const binding of bindings) {
      if (binding.type !== "material-color") {
        continue;
      }

      for (const material of this.registry
        .getMaterials(binding.target)
        .filter(isColorMaterial)) {
        visibleColors.set(material, material.color.clone());
      }
    }

    this.reset();
    this.registry.reindex();

    const diagnostics: BindingDiagnostic[] = [];

    for (const binding of bindings) {
      try {
        const diagnostic = this.applyBinding(binding, visibleColors);
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

  private applyBinding(
    binding: VariantBinding,
    visibleColors: ReadonlyMap<Material, Color>,
  ): BindingDiagnostic | undefined {
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
          const fromColor = visibleColors.get(material)?.clone() ?? previousColor.clone();
          const nextColor = new Color(binding.value);
          let frameId: number | undefined;
          let cancelled = false;

          material.color.copy(fromColor);
          material.needsUpdate = true;

          if (this.materialTransitionMs <= 0) {
            material.color.copy(nextColor);
            material.needsUpdate = true;
            this.requestRender?.();
          } else {
            const startedAt = performance.now();

            const tick = (now: number) => {
              if (cancelled) {
                return;
              }

              const rawProgress = Math.min(
                1,
                (now - startedAt) / this.materialTransitionMs,
              );
              material.color.lerpColors(
                fromColor,
                nextColor,
                easeOutCubic(rawProgress),
              );
              material.needsUpdate = true;
              this.requestRender?.();

              if (rawProgress < 1) {
                frameId = requestAnimationFrame(tick);
              }
            };

            frameId = requestAnimationFrame(tick);
          }

          this.cleanup.push(() => {
            cancelled = true;
            if (frameId !== undefined) {
              cancelAnimationFrame(frameId);
            }
            material.color.copy(previousColor);
            material.needsUpdate = true;
            this.requestRender?.();
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
          this.requestRender?.();
          this.cleanup.push(() => {
            object.visible = previousVisibility;
            this.requestRender?.();
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
  handlers?: SceneBindingHandlers | undefined;
  materialTransitionMs?: number | undefined;
  onDiagnostics?: ((diagnostics: BindingDiagnostic[]) => void) | undefined;
}

interface RuntimeConfig {
  handlers: SceneBindingHandlers | undefined;
  materialTransitionMs: number;
  invalidate: () => void;
}

export function ShowcaseRuntime({
  bindings,
  children,
  handlers,
  materialTransitionMs = 220,
  onDiagnostics,
}: ShowcaseRuntimeProps) {
  const rootRef = useRef<Group | null>(null);
  const engineRef = useRef<SceneBindingEngine | null>(null);
  const configRef = useRef<RuntimeConfig | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const previousConfig = configRef.current;
    const configChanged =
      !previousConfig ||
      previousConfig.handlers !== handlers ||
      previousConfig.materialTransitionMs !== materialTransitionMs ||
      previousConfig.invalidate !== invalidate;

    if (!engineRef.current || configChanged) {
      engineRef.current?.reset();
      engineRef.current = new SceneBindingEngine(
        new SceneRegistry(root),
        handlers,
        materialTransitionMs,
        invalidate,
      );
      configRef.current = {
        handlers,
        materialTransitionMs,
        invalidate,
      };
    }

    const diagnostics = engineRef.current.apply(bindings);
    onDiagnostics?.(diagnostics);
  }, [bindings, handlers, invalidate, materialTransitionMs, onDiagnostics]);

  useLayoutEffect(
    () => () => {
      engineRef.current?.reset();
      engineRef.current = null;
      configRef.current = null;
    },
    [],
  );

  return <group ref={rootRef}>{children}</group>;
}
