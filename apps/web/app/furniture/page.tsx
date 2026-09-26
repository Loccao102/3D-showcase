import type { Metadata } from "next";
import { FurnitureExperience } from "../../components/furniture/FurnitureExperience";

export const metadata: Metadata = {
  title: "Kroma Lounge Chair | 3D Showcase Second Vertical Proof",
  description:
    "An interactive 3D ergonomic furniture showcase proving that the @showcase/core and @showcase/three engine architecture is 100% domain-neutral and reusable.",
};

export default function FurniturePage() {
  return <FurnitureExperience />;
}
