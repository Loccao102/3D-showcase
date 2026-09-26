package showcase

import (
	"errors"
	"sync"
)

var ErrNotFound = errors.New("showcase not found")

type Repository interface {
	FindBySlug(slug string) (Manifest, error)
	List() []Manifest
	Save(manifest Manifest) error
}

type MemoryRepository struct {
	mu    sync.RWMutex
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
			{ID: "technical", Label: "Technical inspection", Position: Vec3{5.2, 4.2, 5.6}, Target: Vec3{0, 0.7, 0}, FOV: &fov},
		},
		Metadata: map[string]any{
			"vertical":  "automotive",
			"prototype": true,
		},
	}

	chairFov := 36.0
	furnitureManifest := Manifest{
		ID:       "furniture-kroma-chair-01",
		Slug:     "furniture-kroma-chair-01",
		Title:    "Kroma Lounge Chair",
		Subtitle: "Architectural ergonomics engineered for high-performance focus and active postural support.",
		Scene: SceneDefinition{
			Assets: []AssetSource{
				{ID: "kroma-chair-base", Kind: "gltf", URL: "/models/kroma-chair-lod0.glb"},
			},
			Environment: &EnvironmentDefinition{
				Preset:     "studio",
				Background: "#090b0f",
				Intensity:  0.9,
			},
			DefaultCameraPresetID: "hero",
		},
		OptionGroups: []OptionGroup{
			{
				ID:               "upholstery",
				Label:            "Upholstery",
				Selection:        "single",
				DefaultOptionIDs: []string{"upholstery-obsidian"},
				Options: []Option{
					{ID: "upholstery-obsidian", Label: "Obsidian Nappa", Bindings: []VariantBinding{{Type: "material-color", Target: "upholstery", Value: "#1e2124"}}},
					{ID: "upholstery-cognac", Label: "Cognac Heritage", Bindings: []VariantBinding{{Type: "material-color", Target: "upholstery", Value: "#8a4f28"}}},
				},
			},
		},
		Hotspots: []Hotspot{
			{ID: "lumbar", Label: "Active lumbar system", Position: Vec3{0.35, 0.72, -0.15}},
			{ID: "base", Label: "5-Star die-cast base", Position: Vec3{0.35, 0.15, 0.25}},
		},
		CameraPresets: []CameraPreset{
			{ID: "hero", Label: "Hero perspective", Position: Vec3{1.9, 1.4, 2.2}, Target: Vec3{0, 0.75, 0}, FOV: &chairFov},
		},
		Metadata: map[string]any{
			"vertical":  "furniture",
			"prototype": true,
		},
	}

	return &MemoryRepository{
		items: map[string]Manifest{
			manifest.Slug:          manifest,
			furnitureManifest.Slug: furnitureManifest,
		},
	}
}

func (r *MemoryRepository) FindBySlug(slug string) (Manifest, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	manifest, ok := r.items[slug]
	if !ok {
		return Manifest{}, ErrNotFound
	}

	return manifest, nil
}

func (r *MemoryRepository) List() []Manifest {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]Manifest, 0, len(r.items))
	for _, item := range r.items {
		result = append(result, item)
	}

	return result
}

func (r *MemoryRepository) Save(manifest Manifest) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.items[manifest.Slug] = manifest
	return nil
}
