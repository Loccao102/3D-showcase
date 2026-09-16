"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  resolveAdaptiveRenderPolicy,
  type CameraFraming,
  type EnvironmentDefinition,
  type FramePerformanceSample,
  type RenderPolicy,
  type RenderQuality,
  type ShowcaseManifest,
} from "@showcase/core";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type ReactNode,
} from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { FrameTelemetry } from "./FrameTelemetry";

export interface RendererDiagnostics {
  webglVersion: "WebGL1" | "WebGL2";
  vendor: string;
  renderer: string;
  precision: string;
  maxTextureSize: number;
  maxTextures: number;
  maxVertexTextures: number;
  maxSamples: number;
  maxAnisotropy: number;
}

export interface ShowcaseCanvasProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  children: ReactNode;
  className?: string | undefined;
  activeCameraPresetId?: string | undefined;
  cameraRequestKey?: string | number | undefined;
  onUserInteract?: (() => void) | undefined;
  onPerformanceSample?: ((sample: FramePerformanceSample) => void) | undefined;
  onQualitySuggestion?: ((quality: RenderQuality) => void) | undefined;
  onRendererDiagnostics?: ((diagnostics: RendererDiagnostics) => void) | undefined;
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

function RendererDiagnosticsProbe({
  onDiagnostics,
}: {
  onDiagnostics?: ((diagnostics: RendererDiagnostics) => void) | undefined;
}) {
  const renderer = useThree((state) => state.gl);

  useEffect(() => {
    if (!onDiagnostics) {
      return;
    }

    const context = renderer.getContext();
    const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
    const vendor = String(
      debugInfo
        ? context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : context.getParameter(context.VENDOR),
    );
    const rendererName = String(
      debugInfo
        ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : context.getParameter(context.RENDERER),
    );

    onDiagnostics({
      webglVersion: renderer.capabilities.isWebGL2 ? "WebGL2" : "WebGL1",
      vendor,
      renderer: rendererName,
      precision: renderer.capabilities.precision,
      maxTextureSize: renderer.capabilities.maxTextureSize,
      maxTextures: renderer.capabilities.maxTextures,
      maxVertexTextures: renderer.capabilities.maxVertexTextures,
      maxSamples: renderer.capabilities.maxSamples,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
  }, [onDiagnostics, renderer]);

  return null;
}

interface DirectedOrbitControlsProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  initialTarget: readonly [number, number, number];
  activeCameraPresetId?: string | undefined;
  cameraRequestKey?: string | number | undefined;
  onUserInteract?: (() => void) | undefined;
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
      onChange={() => invalidate()}
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
  onPerformanceSample,
  onQualitySuggestion,
  onRendererDiagnostics,
}: ShowcaseCanvasProps) {
  const [runtimeQuality, setRuntimeQuality] = useState(renderPolicy.quality);

  useEffect(() => {
    setRuntimeQuality(renderPolicy.quality);
  }, [renderPolicy.quality]);

  const effectivePolicy = useMemo(
    () => resolveAdaptiveRenderPolicy(renderPolicy, runtimeQuality),
    [renderPolicy, runtimeQuality],
  );

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
    <div
      className={className}
      data-quality={effectivePolicy.quality}
      data-base-quality={renderPolicy.quality}
    >
      <Canvas
        dpr={effectivePolicy.maxDpr}
        frameloop="demand"
        camera={{ position: cameraPosition, fov, near: 0.1, far: 150 }}
        gl={{
          antialias: effectivePolicy.quality !== "low",
          alpha: true,
          powerPreference: "high-performance",
        }}
        shadows={effectivePolicy.enableShadows}
      >
        <RendererDiagnosticsProbe onDiagnostics={onRendererDiagnostics} />
        <FrameTelemetry
          quality={effectivePolicy.quality}
          onSample={onPerformanceSample}
          onQualitySuggestion={(quality) => {
            setRuntimeQuality(quality);
            onQualitySuggestion?.(quality);
          }}
        />
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight
            castShadow={effectivePolicy.enableShadows}
            intensity={2.2}
            position={[5, 8, 4]}
          />
          <Environment
            preset={mapEnvironmentPreset(manifest.scene.environment?.preset)}
            environmentIntensity={manifest.scene.environment?.intensity ?? 0.85}
          />
          {children}
          {effectivePolicy.enableShadows ? (
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
            renderPolicy={effectivePolicy}
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
