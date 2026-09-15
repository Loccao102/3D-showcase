"use client";

import {
  resolveAssetUrl,
  type AssetSource,
  type VariantBinding,
} from "@showcase/core";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  AnimationMixer,
  Material,
  Mesh,
  Object3D,
} from "three";

export type AssetRuntimeStatus = "loading" | "ready" | "error";

export interface AssetRuntimeEvent {
  assetId: string;
  status: AssetRuntimeStatus;
  url?: string | undefined;
  error?: Error | undefined;
}

interface AssetBoundaryProps {
  asset: AssetSource;
  onRuntimeEvent?: ((event: AssetRuntimeEvent) => void) | undefined;
  children: ReactNode;
}

interface AssetBoundaryState {
  failed: boolean;
}

class AssetBoundary extends Component<AssetBoundaryProps, AssetBoundaryState> {
  state: AssetBoundaryState = { failed: false };

  static getDerivedStateFromError(): AssetBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onRuntimeEvent?.({
      assetId: this.props.asset.id,
      status: "error",
      error,
    });
  }

  render() {
    if (this.state.failed) {
      return null;
    }

    return this.props.children;
  }
}

function cloneMaterial(material: Material): Material {
  return material.clone();
}

function cloneScene(source: Object3D): Object3D {
  const cloned = source.clone(true);

  cloned.traverse((object) => {
    const mesh = object as Mesh;
    const material = mesh.material;

    if (!material) {
      return;
    }

    mesh.material = Array.isArray(material)
      ? material.map(cloneMaterial)
      : cloneMaterial(material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  return cloned;
}

function matchesAnimationTarget(asset: AssetSource, target: string) {
  return target === asset.id || target === asset.slot || target === "*";
}

function assetTransformProps(asset: AssetSource) {
  return {
    ...(asset.position
      ? { position: [...asset.position] as [number, number, number] }
      : {}),
    ...(asset.rotation
      ? { rotation: [...asset.rotation] as [number, number, number] }
      : {}),
    ...(asset.scale ? { scale: [...asset.scale] as [number, number, number] } : {}),
  };
}

interface GltfAssetProps {
  asset: AssetSource;
  url: string;
  animationBindings: readonly Extract<
    VariantBinding,
    { type: "animation-state" }
  >[];
  onRuntimeEvent?: ((event: AssetRuntimeEvent) => void) | undefined;
}

function GltfAsset({
  asset,
  url,
  animationBindings,
  onRuntimeEvent,
}: GltfAssetProps) {
  const gltf = useGLTF(url);
  const runtimeScene = useMemo(() => cloneScene(gltf.scene), [gltf.scene]);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const hasActiveAnimationRef = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    onRuntimeEvent?.({ assetId: asset.id, status: "ready", url });
  }, [asset.id, onRuntimeEvent, url]);

  useEffect(() => {
    const binding = animationBindings.find((candidate) =>
      matchesAnimationTarget(asset, candidate.target),
    );

    if (!binding) {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      hasActiveAnimationRef.current = false;
      return;
    }

    const clip = gltf.animations.find((candidate) => candidate.name === binding.clip);
    if (!clip) {
      hasActiveAnimationRef.current = false;
      return;
    }

    const mixer = new AnimationMixer(runtimeScene);
    const action = mixer.clipAction(clip);
    action.reset().play();
    mixerRef.current = mixer;
    hasActiveAnimationRef.current = true;
    invalidate();

    return () => {
      action.stop();
      mixer.stopAllAction();
      mixer.uncacheRoot(runtimeScene);
      mixerRef.current = null;
      hasActiveAnimationRef.current = false;
    };
  }, [animationBindings, asset, gltf.animations, invalidate, runtimeScene]);

  useFrame((_, delta) => {
    if (!hasActiveAnimationRef.current || !mixerRef.current) {
      return;
    }

    mixerRef.current.update(delta);
    invalidate();
  });

  return (
    <group
      name={`asset-slot:${asset.slot ?? asset.id}`}
      {...assetTransformProps(asset)}
      userData={{ showcaseAssetId: asset.id, showcaseSlot: asset.slot }}
    >
      <primitive object={runtimeScene} />
    </group>
  );
}

interface PrimitiveAssetProps {
  asset: AssetSource;
  onRuntimeEvent?: ((event: AssetRuntimeEvent) => void) | undefined;
}

function PrimitiveAsset({ asset, onRuntimeEvent }: PrimitiveAssetProps) {
  useEffect(() => {
    onRuntimeEvent?.({ assetId: asset.id, status: "ready" });
  }, [asset.id, onRuntimeEvent]);

  const color =
    typeof asset.metadata?.color === "string" ? asset.metadata.color : "#59616d";

  return (
    <group
      name={`asset-slot:${asset.slot ?? asset.id}`}
      {...assetTransformProps(asset)}
      userData={{ showcaseAssetId: asset.id, showcaseSlot: asset.slot }}
    >
      <mesh name={asset.id} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.1, 1.8]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
      </mesh>
    </group>
  );
}

interface MissingAssetProps {
  asset: AssetSource;
  onRuntimeEvent?: ((event: AssetRuntimeEvent) => void) | undefined;
}

function MissingAsset({ asset, onRuntimeEvent }: MissingAssetProps) {
  useEffect(() => {
    onRuntimeEvent?.({
      assetId: asset.id,
      status: "error",
      error: new Error(`Asset '${asset.id}' has no resolvable URL`),
    });
  }, [asset.id, onRuntimeEvent]);

  return null;
}

export interface ShowcaseAssetProps {
  asset: AssetSource;
  viewportWidth: number;
  animationBindings?:
    | readonly Extract<VariantBinding, { type: "animation-state" }>[]
    | undefined;
  onRuntimeEvent?: ((event: AssetRuntimeEvent) => void) | undefined;
}

export function ShowcaseAsset({
  asset,
  viewportWidth,
  animationBindings = [],
  onRuntimeEvent,
}: ShowcaseAssetProps) {
  const url = resolveAssetUrl(asset, viewportWidth);

  useEffect(() => {
    onRuntimeEvent?.(
      url
        ? { assetId: asset.id, status: "loading", url }
        : { assetId: asset.id, status: "loading" },
    );
  }, [asset.id, onRuntimeEvent, url]);

  if (asset.kind === "primitive") {
    return <PrimitiveAsset asset={asset} onRuntimeEvent={onRuntimeEvent} />;
  }

  if (!url) {
    return <MissingAsset asset={asset} onRuntimeEvent={onRuntimeEvent} />;
  }

  return (
    <AssetBoundary asset={asset} onRuntimeEvent={onRuntimeEvent}>
      <GltfAsset
        asset={asset}
        url={url}
        animationBindings={animationBindings}
        onRuntimeEvent={onRuntimeEvent}
      />
    </AssetBoundary>
  );
}
