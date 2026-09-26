import type { Metadata } from "next";
import { Suspense } from "react";
import { EmbedExperience } from "../../components/embed/EmbedExperience";

export const metadata: Metadata = {
  title: "3D Showcase Embed Viewport",
  description: "Frameless, responsive embed viewport for third-party websites and SDK integration.",
};

export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="showcase-loading"><span>Loading Embed…</span></div>}>
      <EmbedExperience />
    </Suspense>
  );
}
