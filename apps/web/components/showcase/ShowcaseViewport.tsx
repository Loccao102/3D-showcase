"use client";

import type {
  RenderPolicy,
  ShowcaseManifest,
  VariantBinding,
} from "@showcase/core";
import { ShowcaseCanvas, ShowcaseRuntime } from "@showcase/three";
import { AutomotivePrototype } from "./AutomotivePrototype";

export interface ShowcaseViewportProps {
  manifest: ShowcaseManifest;
  renderPolicy: RenderPolicy;
  bindings: readonly VariantBinding[];
}

export default function ShowcaseViewport({
  manifest,
  renderPolicy,
  bindings,
}: ShowcaseViewportProps) {
  return (
    <ShowcaseCanvas
      manifest={manifest}
      renderPolicy={renderPolicy}
      className="showcase-canvas"
    >
      <ShowcaseRuntime bindings={bindings}>
        <AutomotivePrototype />
      </ShowcaseRuntime>
    </ShowcaseCanvas>
  );
}
