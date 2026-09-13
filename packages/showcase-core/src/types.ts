export type Vec3 = readonly [number, number, number];

export type RenderQuality = "low" | "medium" | "high";

export interface CameraPreset {
  id: string;
  label: string;
  position: Vec3;
  target: Vec3;
  fov?: number;
}

export interface AssetLod {
  maxViewportWidth: number;
  url: string;
}

export interface AssetSource {
  id: string;
  kind: "gltf" | "primitive";
  url?: string;
  fallbackImage?: string;
  lod?: AssetLod[];
  metadata?: Record<string, unknown>;
}

export interface EnvironmentDefinition {
  preset?: "studio" | "city" | "dawn" | "night" | "warehouse" | "neutral";
  background?: string;
  intensity?: number;
}

export interface SceneDefinition {
  assets: AssetSource[];
  environment?: EnvironmentDefinition;
  defaultCameraPresetId?: string;
}

export type VariantBinding =
  | {
      type: "material-color";
      target: string;
      value: string;
    }
  | {
      type: "node-visibility";
      target: string;
      visible: boolean;
    }
  | {
      type: "asset-replacement";
      target: string;
      assetId: string;
    }
  | {
      type: "animation-state";
      target: string;
      clip: string;
    };

export interface ShowcaseOption {
  id: string;
  label: string;
  preview?: string;
  bindings: VariantBinding[];
  metadata?: Record<string, unknown>;
}

export interface OptionGroup {
  id: string;
  label: string;
  selection: "single" | "multiple";
  defaultOptionIds?: string[];
  options: ShowcaseOption[];
}

export interface Hotspot {
  id: string;
  label: string;
  position: Vec3;
  contentKey?: string;
  cameraPresetId?: string;
  metadata?: Record<string, unknown>;
}

export interface ShowcaseManifest {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  scene: SceneDefinition;
  optionGroups: OptionGroup[];
  hotspots: Hotspot[];
  cameraPresets: CameraPreset[];
  metadata?: Record<string, unknown>;
}

export interface DeviceCapabilities {
  viewportWidth: number;
  devicePixelRatio: number;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
  prefersReducedMotion?: boolean;
}

export interface RenderPolicy {
  quality: RenderQuality;
  maxDpr: number;
  enableShadows: boolean;
  enablePostProcessing: boolean;
  preferReducedMotion: boolean;
}

export interface ShowcaseSelection {
  [groupId: string]: string[];
}
