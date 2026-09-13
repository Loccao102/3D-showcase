package showcase

type Vec3 [3]float64

type CameraPreset struct {
	ID       string   `json:"id"`
	Label    string   `json:"label"`
	Position Vec3     `json:"position"`
	Target   Vec3     `json:"target"`
	FOV      *float64 `json:"fov,omitempty"`
}

type AssetSource struct {
	ID            string                 `json:"id"`
	Kind          string                 `json:"kind"`
	URL           string                 `json:"url,omitempty"`
	FallbackImage string                 `json:"fallbackImage,omitempty"`
	Metadata      map[string]any         `json:"metadata,omitempty"`
}

type EnvironmentDefinition struct {
	Preset     string  `json:"preset,omitempty"`
	Background string  `json:"background,omitempty"`
	Intensity  float64 `json:"intensity,omitempty"`
}

type SceneDefinition struct {
	Assets                []AssetSource          `json:"assets"`
	Environment           *EnvironmentDefinition `json:"environment,omitempty"`
	DefaultCameraPresetID string                 `json:"defaultCameraPresetId,omitempty"`
}

type VariantBinding struct {
	Type    string `json:"type"`
	Target  string `json:"target"`
	Value   string `json:"value,omitempty"`
	Visible *bool  `json:"visible,omitempty"`
	AssetID string `json:"assetId,omitempty"`
	Clip    string `json:"clip,omitempty"`
}

type Option struct {
	ID       string                 `json:"id"`
	Label    string                 `json:"label"`
	Preview  string                 `json:"preview,omitempty"`
	Bindings []VariantBinding       `json:"bindings"`
	Metadata map[string]any         `json:"metadata,omitempty"`
}

type OptionGroup struct {
	ID               string   `json:"id"`
	Label            string   `json:"label"`
	Selection        string   `json:"selection"`
	DefaultOptionIDs []string `json:"defaultOptionIds,omitempty"`
	Options          []Option `json:"options"`
}

type Hotspot struct {
	ID             string         `json:"id"`
	Label          string         `json:"label"`
	Position       Vec3           `json:"position"`
	ContentKey     string         `json:"contentKey,omitempty"`
	CameraPresetID string         `json:"cameraPresetId,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type Manifest struct {
	ID            string                 `json:"id"`
	Slug          string                 `json:"slug"`
	Title         string                 `json:"title"`
	Subtitle      string                 `json:"subtitle,omitempty"`
	Scene         SceneDefinition        `json:"scene"`
	OptionGroups  []OptionGroup          `json:"optionGroups"`
	Hotspots      []Hotspot              `json:"hotspots"`
	CameraPresets []CameraPreset         `json:"cameraPresets"`
	Metadata      map[string]any         `json:"metadata,omitempty"`
}
