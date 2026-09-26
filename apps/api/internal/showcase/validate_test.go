package showcase_test

import (
	"testing"

	"github.com/Loccao102/3D-showcase/apps/api/internal/showcase"
)

func TestValidateManifest_Valid(t *testing.T) {
	repo := showcase.NewMemoryRepository()
	manifest, err := repo.FindBySlug("automotive-concept-01")
	if err != nil {
		t.Fatalf("unexpected error loading seed manifest: %v", err)
	}

	errs := showcase.ValidateManifest(manifest)
	if len(errs) != 0 {
		t.Errorf("expected 0 validation errors for seed manifest, got %d: %v", len(errs), errs)
	}
}

func TestValidateManifest_MissingRequiredFields(t *testing.T) {
	manifest := showcase.Manifest{}

	errs := showcase.ValidateManifest(manifest)
	if len(errs) < 3 {
		t.Errorf("expected at least 3 errors for empty manifest, got %d", len(errs))
	}
}

func TestValidateManifest_DuplicateOptionIDs(t *testing.T) {
	manifest := showcase.Manifest{
		ID:    "test-1",
		Slug:  "test-1",
		Title: "Test",
		OptionGroups: []showcase.OptionGroup{
			{
				ID: "group-1",
				Options: []showcase.Option{
					{ID: "opt-dup", Label: "Duplicate 1"},
				},
			},
			{
				ID: "group-2",
				Options: []showcase.Option{
					{ID: "opt-dup", Label: "Duplicate 2"},
				},
			},
		},
	}

	errs := showcase.ValidateManifest(manifest)
	foundDup := false
	for _, e := range errs {
		if e.Field == "optionGroups[1].options[0].id" {
			foundDup = true
			break
		}
	}

	if !foundDup {
		t.Errorf("expected duplicate option ID error, got: %v", errs)
	}
}

func TestValidateManifest_InvalidCameraPresetReference(t *testing.T) {
	manifest := showcase.Manifest{
		ID:    "test-2",
		Slug:  "test-2",
		Title: "Test",
		Scene: showcase.SceneDefinition{
			DefaultCameraPresetID: "nonexistent",
		},
		CameraPresets: []showcase.CameraPreset{
			{ID: "hero", Label: "Hero"},
		},
	}

	errs := showcase.ValidateManifest(manifest)
	foundRefErr := false
	for _, e := range errs {
		if e.Field == "scene.defaultCameraPresetId" {
			foundRefErr = true
			break
		}
	}

	if !foundRefErr {
		t.Errorf("expected invalid camera preset reference error, got: %v", errs)
	}
}
