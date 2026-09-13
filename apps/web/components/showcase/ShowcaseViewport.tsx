"use client";

import type { RenderPolicy, ShowcaseManifest } from "@showcase/core";
import { ShowcaseCanvas } from "@showcase/three";
import { AutomotivePrototype } from "./AutomotivePrototype";

export interface ShowcaseViewportProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  color: string;
}

export default function ShowcaseViewport({
  manifest,
  renderPolicy,
  color,
}: ShowcaseViewportProps) {
  return (
    <ShowcaseCanvas
      manifest={manifest}
      renderPolicy={renderPolicy}
      className="showcase-canvas"
    >
      <AutomotivePrototype color={color} />
    </ShowcaseCanvas>
  );
}
