"use client";

import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type {
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

function mapEnvironmentPreset(
  preset: ShowcaseManifest["scene"]["environment"] extends infer T
    ? T extends { preset?: infer P }
      ? P
      : never
    : never,
) {
  if (!preset || preset === "neutral") {
    return "studio" as const;
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

  return (
    <div className={className} data-quality={renderPolicy.quality}>
      <Canvas
        dpr={renderPolicy.maxDpr}
        frameloop="demand"
        camera={{ position: [...position], fov, near: 0.1, far: 150 }}
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
            target={[...target]}
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
