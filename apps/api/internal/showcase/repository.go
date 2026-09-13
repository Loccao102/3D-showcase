package showcase

import "errors"

var ErrNotFound = errors.New("showcase not found")

type Repository interface {
	FindBySlug(slug string) (Manifest, error)
}

type MemoryRepository struct {
	items map[string]Manifest
}

func NewMemoryRepository() *MemoryRepository {
	fov := 38.0

	manifest := Manifest{
		ID:       "automotive-concept-01",
		Slug:     "automotive-concept-01",
		Title:    "Astra One",
		Subtitle: "Automotive is the first vertical. The engine is not car-specific.",
		Scene: SceneDefinition{
			Assets: []AssetSource{},
			Environment: &EnvironmentDefinition{
				Preset:     "studio",
				Background: "#090b0f",
				Intensity:  0.8,
			},
			DefaultCameraPresetID: "hero",
		},
		OptionGroups: []OptionGroup{
			{
				ID:               "finish",
				Label:            "Finish",
				Selection:        "single",
				DefaultOptionIDs: []string{"finish-graphite"},
				Options: []Option{
					{ID: "finish-graphite", Label: "Graphite", Bindings: []VariantBinding{{Type: "material-color", Target: "body", Value: "#2b3038"}}},
					{ID: "finish-silver", Label: "Liquid silver", Bindings: []VariantBinding{{Type: "material-color", Target: "body", Value: "#a9afb7"}}},
					{ID: "finish-blue", Label: "Ion blue", Bindings: []VariantBinding{{Type: "material-color", Target: "body", Value: "#164f8c"}}},
					{ID: "finish-red", Label: "Signal red", Bindings: []VariantBinding{{Type: "material-color", Target: "body", Value: "#8d1f26"}}},
				},
			},
		},
		Hotspots: []Hotspot{
			{ID: "front-light", Label: "Lighting system", Position: Vec3{2.1, 0.95, 0.7}},
			{ID: "cabin", Label: "Cabin", Position: Vec3{-0.2, 1.5, 0}},
		},
		CameraPresets: []CameraPreset{
			{ID: "hero", Label: "Hero", Position: Vec3{5.2, 2.7, 6.3}, Target: Vec3{0, 0.85, 0}, FOV: &fov},
		},
		Metadata: map[string]any{
			"vertical":  "automotive",
			"prototype": true,
		},
	}

	return &MemoryRepository{items: map[string]Manifest{manifest.Slug: manifest}}
}

func (r *MemoryRepository) FindBySlug(slug string) (Manifest, error) {
	manifest, ok := r.items[slug]
	if !ok {
		return Manifest{}, ErrNotFound
	}

	return manifest, nil
}
