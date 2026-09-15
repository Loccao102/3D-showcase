export type Vec3 = readonly [number, number, number];

export type RenderQuality = "low" | "medium" | "high";

export interface CameraFraming {
  position: Vec3;
  target: Vec3;
  fov?: number;
}

export interface CameraPreset extends CameraFraming {
  id: string;
  label: string;
  mobile?: CameraFraming;
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
  slot?: string;
  default?: boolean;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
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
  anchorId?: string;
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
  deviceMemoryGb?: number | undefined;
  hardwareConcurrency?: number | undefined;
  saveData?: boolean | undefined;
  prefersReducedMotion?: boolean | undefined;
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

export interface ShowcaseSelectionSnapshot {
  manifestId: string;
  slug: string;
  selection: ShowcaseSelection;
  optionIds: string[];
}

export type ExperienceMode =
  | "arrival"
  | "explore"
  | "detail"
  | "configure"
  | "technical"
  | "transition";

export interface ExperienceState {
  mode: ExperienceMode;
  activeHotspotId?: string;
  activeCameraPresetId?: string;
  selection: ShowcaseSelection;
  userHasInteracted: boolean;
}
