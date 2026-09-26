import type { Metadata } from "next";
import { AdminEditorExperience } from "../../../components/admin/AdminEditorExperience";

export const metadata: Metadata = {
  title: "Visual 3D CMS & Hotspot Editor | 3D Showcase Studio",
  description:
    "Interactive 3D Visual Studio for authoring hotspots, capturing camera preset viewpoints, live variant preview, and syncing manifests to the Go API backend.",
};

export default function AdminEditorPage() {
  return <AdminEditorExperience />;
}
