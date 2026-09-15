"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import { Group } from "three";

export interface AssetEntranceProps {
  reducedMotion?: boolean | undefined;
  durationMs?: number | undefined;
  children: ReactNode;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function AssetEntrance({
  reducedMotion = false,
  durationMs = 320,
  children,
}: AssetEntranceProps) {
  const groupRef = useRef<Group | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion || durationMs <= 0) {
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      group.scale.setScalar(1);
      startedAtRef.current = null;
      invalidate();
      return;
    }

    group.position.set(0, -0.035, 0);
    group.rotation.set(0, -0.035, 0);
    group.scale.setScalar(0.975);
    startedAtRef.current = performance.now();
    invalidate();
  }, [durationMs, invalidate, reducedMotion]);

  useFrame(() => {
    const group = groupRef.current;
    const startedAt = startedAtRef.current;
    if (!group || startedAt === null) return;

    const rawProgress = Math.min(1, (performance.now() - startedAt) / durationMs);
    const progress = easeOutCubic(rawProgress);
    const remaining = 1 - progress;

    group.position.y = -0.035 * remaining;
    group.rotation.y = -0.035 * remaining;
    group.scale.setScalar(0.975 + 0.025 * progress);

    if (rawProgress >= 1) {
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      group.scale.setScalar(1);
      startedAtRef.current = null;
      return;
    }

    invalidate();
  });

  return <group ref={groupRef}>{children}</group>;
}
