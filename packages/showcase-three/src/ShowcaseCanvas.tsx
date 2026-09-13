"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type {
  EnvironmentDefinition,
  RenderPolicy,
  ShowcaseManifest,
} from "@showcase/core";
import type { ReactNode } from "react";
import { Suspense } from "react";

export interface ShowcaseCanvasProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  children: ReactNode;
  className?: string;
}

type EnvironmentPreset = Exclude<
  NonNullable<EnvironmentDefinition["preset"]>,
  "neutral"
>;

function mapEnvironmentPreset(
  preset: EnvironmentDefinition["preset"],
): EnvironmentPreset {
  if (!preset || preset === "neutral") {
    return "studio";
  }

  return preset;
}

export function ShowcaseCanvas({
  manifest,
  renderPolicy,
  children,
  className,
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
          <OrbitControls
            makeDefault
            target={controlsTarget}
            enablePan={false}
            minDistance={2.4}
            maxDistance={10}
            minPolarAngle={Math.PI * 0.18}
            maxPolarAngle={Math.PI * 0.52}
            rotateSpeed={0.7}
            zoomSpeed={0.8}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
