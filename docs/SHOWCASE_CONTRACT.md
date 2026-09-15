# Showcase Contract

The renderer receives a domain-neutral manifest. A vertical may generate this manifest, but the renderer never receives car-specific business objects directly.

## Example

```ts
export interface ShowcaseManifest {
  id: string;
  slug: string;
  title: string;
  scene: SceneDefinition;
  optionGroups: OptionGroup[];
  hotspots: Hotspot[];
  cameraPresets: CameraPreset[];
  metadata?: Record<string, unknown>;
}
```

## Scene

```ts
export interface SceneDefinition {
  assets: AssetSource[];
  environment?: EnvironmentDefinition;
  defaultCamera?: string;
}

export interface AssetSource {
  id: string;
  kind: "gltf" | "primitive";
  url?: string;
  fallbackImage?: string;
  lod?: Array<{ maxWidth: number; url: string }>;
}
```

Production assets should be GLB/glTF and may use Meshopt/Draco geometry compression and KTX2 textures.

## Generic configuration

```ts
export interface OptionGroup {
  id: string;
  label: string;
  selection: "single" | "multiple";
  options: ShowcaseOption[];
}

export interface ShowcaseOption {
  id: string;
  label: string;
  preview?: string;
  bindings: VariantBinding[];
  metadata?: Record<string, unknown>;
}
```

Bindings are generic scene operations, for example:

- show/hide a node
- swap a material
- set a material color
- replace an asset
- trigger an animation state

The core does not define `paint`, `wheel`, `sofaFabric`, or `phoneColor`; those names belong to vertical content.

## Hotspots

A hotspot identifies a point in scene space and the content key that the DOM application should open.

```ts
export interface Hotspot {
  id: string;
  position: [number, number, number];
  label: string;
  contentKey?: string;
  cameraPreset?: string;
}
```

## Camera presets

Camera presets make scripted product exploration possible without encoding product-specific camera logic in the renderer.

```ts
export interface CameraPreset {
  id: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}
```

## Optional commerce mapping

Commerce data references showcase configuration ids; the showcase does not reference commerce entities.

Example:

```text
showcase option id: exterior.black
commerce adapter: exterior.black -> SKU-CAR-BLK-01 -> price delta
```

For a chair the exact same mechanism could be:

```text
showcase option id: fabric.olive
commerce adapter: fabric.olive -> SKU-CHAIR-OLV -> price delta
```

That separation is deliberate.
