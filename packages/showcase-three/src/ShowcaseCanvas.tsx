"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type {
  CameraFraming,
  EnvironmentDefinition,
  RenderPolicy,
  ShowcaseManifest,
} from "@showcase/core";
import {
  Suspense,
  useEffect,
  useRef,
  type ElementRef,
  type ReactNode,
} from "react";
import { PerspectiveCamera, Vector3 } from "three";

export interface ShowcaseCanvasProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  children: ReactNode;
  className?: string;
  activeCameraPresetId?: string;
  cameraRequestKey?: string | number;
  onUserInteract?: () => void;
}

type EnvironmentPreset = Exclude<
  NonNullable<EnvironmentDefinition["preset"]>,
  "neutral"
>;

type OrbitControlsHandle = ElementRef<typeof OrbitControls>;

interface CameraTransition {
  startedAt: number;
  durationMs: number;
  fromPosition: Vector3;
  toPosition: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  fromFov: number;
  toFov: number;
}

function mapEnvironmentPreset(
  preset: EnvironmentDefinition["preset"],
): EnvironmentPreset {
  if (!preset || preset === "neutral") {
    return "studio";
  }

  return preset;
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function resolveFraming(
  manifest: ShowcaseManifest,
  presetId: string | undefined,
  viewportWidth: number,
): CameraFraming | undefined {
  const preset =
    manifest.cameraPresets.find((candidate) => candidate.id === presetId) ??
    manifest.cameraPresets.find(
      (candidate) => candidate.id === manifest.scene.defaultCameraPresetId,
    ) ??
    manifest.cameraPresets[0];

  if (!preset) {
    return undefined;
  }

  return viewportWidth < 720 && preset.mobile ? preset.mobile : preset;
}

interface DirectedOrbitControlsProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  initialTarget: readonly [number, number, number];
  activeCameraPresetId?: string;
  cameraRequestKey?: string | number;
  onUserInteract?: () => void;
}

function DirectedOrbitControls({
  manifest,
  renderPolicy,
  initialTarget,
  activeCameraPresetId,
  cameraRequestKey,
  onUserInteract,
}: DirectedOrbitControlsProps) {
  const controlsRef = useRef<OrbitControlsHandle | null>(null);
  const transitionRef = useRef<CameraTransition | null>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const controls = controlsRef.current;
    const framing = resolveFraming(manifest, activeCameraPresetId, size.width);

    if (!controls || !framing) {
      return;
    }

    const nextPosition = new Vector3(...framing.position);
    const nextTarget = new Vector3(...framing.target);
    const currentFov =
      camera instanceof PerspectiveCamera ? camera.fov : framing.fov ?? 42;
    const nextFov = framing.fov ?? currentFov;

    if (renderPolicy.preferReducedMotion) {
      camera.position.copy(nextPosition);
      controls.target.copy(nextTarget);
      if (camera instanceof PerspectiveCamera) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
      controls.update();
      invalidate();
      return;
    }

    transitionRef.current = {
      startedAt: performance.now(),
      durationMs: size.width < 720 ? 380 : 650,
      fromPosition: camera.position.clone(),
      toPosition: nextPosition,
      fromTarget: controls.target.clone(),
      toTarget: nextTarget,
      fromFov: currentFov,
      toFov: nextFov,
    };
    invalidate();
  }, [
    activeCameraPresetId,
    camera,
    cameraRequestKey,
    invalidate,
    manifest,
    renderPolicy.preferReducedMotion,
    size.width,
  ]);

  useFrame(() => {
    const transition = transitionRef.current;
    const controls = controlsRef.current;

    if (!transition || !controls) {
      return;
    }

    const elapsed = performance.now() - transition.startedAt;
    const rawProgress = Math.min(1, elapsed / transition.durationMs);
    const progress = easeInOutCubic(rawProgress);

    camera.position.lerpVectors(
      transition.fromPosition,
      transition.toPosition,
      progress,
    );
    controls.target.lerpVectors(
      transition.fromTarget,
      transition.toTarget,
      progress,
    );

    if (camera instanceof PerspectiveCamera) {
      camera.fov =
        transition.fromFov +
        (transition.toFov - transition.fromFov) * progress;
      camera.updateProjectionMatrix();
    }

    controls.update();

    if (rawProgress >= 1) {
      transitionRef.current = null;
      return;
    }

    invalidate();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[...initialTarget]}
      enablePan={false}
      minDistance={2.4}
      maxDistance={10}
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.52}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      onStart={() => {
        transitionRef.current = null;
        onUserInteract?.();
      }}
      onChange={invalidate}
    />
  );
}

export function ShowcaseCanvas({
  manifest,
  renderPolicy,
  children,
  className,
  activeCameraPresetId,
  cameraRequestKey,
  onUserInteract,
}: ShowcaseCanvasProps) {
  const initialCamera =
    manifest.cameraPresets.find(
      (preset) => preset.id === manifest.scene.defaultCameraPresetId,
    ) ?? manifest.cameraPresets[0];

  const position = initialCamera?.position ?? ([4.6, 2.4, 6.4] as const);
  const target = initialCamera?.target ?? ([0, 0.7, 0] as const);
  const fov = initialCamera?.fov ?? 42;
  const cameraPosition: [number, number, number] = [
    position[0],
    position[1],
    position[2],
  ];
  const controlsTarget: [number, number, number] = [
    target[0],
    target[1],
    target[2],
  ];

  return (
    <div className={className} data-quality={renderPolicy.quality}>
      <Canvas
        dpr={renderPolicy.maxDpr}
        frameloop="demand"
        camera={{ position: cameraPosition, fov, near: 0.1, far: 150 }}
        gl={{
          antialias: renderPolicy.quality !== "low",
          alpha: true,
          powerPreference: "high-performance",
        }}
        shadows={renderPolicy.enableShadows}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight
            castShadow={renderPolicy.enableShadows}
            intensity={2.2}
            position={[5, 8, 4]}
          />
          <Environment
            preset={mapEnvironmentPreset(manifest.scene.environment?.preset)}
            environmentIntensity={manifest.scene.environment?.intensity ?? 0.85}
          />
          {children}
          {renderPolicy.enableShadows ? (
            <ContactShadows
              position={[0, -0.02, 0]}
              opacity={0.3}
              scale={12}
              blur={2.8}
              far={5}
            />
          ) : null}
          <DirectedOrbitControls
            manifest={manifest}
            renderPolicy={renderPolicy}
            initialTarget={controlsTarget}
            activeCameraPresetId={activeCameraPresetId}
            cameraRequestKey={cameraRequestKey}
            onUserInteract={onUserInteract}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
