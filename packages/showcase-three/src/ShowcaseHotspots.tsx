"use client";

import type { Hotspot } from "@showcase/core";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, Vector3 } from "three";

export interface ShowcaseHotspotsProps {
  hotspots: readonly Hotspot[];
  activeHotspotId?: string;
  onSelect?: (hotspot: Hotspot) => void;
}

interface HotspotMarkerProps {
  hotspot: Hotspot;
  active: boolean;
  onSelect?: (hotspot: Hotspot) => void;
}

function HotspotMarker({ hotspot, active, onSelect }: HotspotMarkerProps) {
  const markerRef = useRef<Group | null>(null);
  const scene = useThree((state) => state.scene);
  const worldPosition = useMemo(() => new Vector3(), []);

  useFrame(() => {
    if (!hotspot.anchorId || !markerRef.current) {
      return;
    }

    const anchor =
      scene.getObjectByName(`anchor:${hotspot.anchorId}`) ??
      scene.getObjectByName(hotspot.anchorId);

    if (!anchor) {
      return;
    }

    anchor.getWorldPosition(worldPosition);
    markerRef.current.position.copy(worldPosition);
  });

  return (
    <group ref={markerRef} position={[...hotspot.position]}>
      <Html center occlude distanceFactor={7.5} zIndexRange={[20, 0]}>
        <button
          className="showcase-hotspot"
          data-active={active}
          type="button"
          aria-pressed={active}
          aria-label={`Inspect ${hotspot.label}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(hotspot);
          }}
        >
          <span className="showcase-hotspot-dot" aria-hidden="true" />
          <span className="showcase-hotspot-label">{hotspot.label}</span>
        </button>
      </Html>
    </group>
  );
}

export function ShowcaseHotspots({
  hotspots,
  activeHotspotId,
  onSelect,
}: ShowcaseHotspotsProps) {
  return (
    <group name="showcase-hotspots">
      {hotspots.map((hotspot) => (
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          active={hotspot.id === activeHotspotId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
