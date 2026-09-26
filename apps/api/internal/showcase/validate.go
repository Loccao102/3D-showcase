package showcase

import (
	"fmt"
	"strings"
)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

func ValidateManifest(m Manifest) []ValidationError {
	var errs []ValidationError

	if strings.TrimSpace(m.ID) == "" {
		errs = append(errs, ValidationError{Field: "id", Message: "id is required"})
	}
	if strings.TrimSpace(m.Slug) == "" {
		errs = append(errs, ValidationError{Field: "slug", Message: "slug is required"})
	}
	if strings.TrimSpace(m.Title) == "" {
		errs = append(errs, ValidationError{Field: "title", Message: "title is required"})
	}

	// Validate camera presets
	cameraPresetIDs := make(map[string]struct{})
	for i, preset := range m.CameraPresets {
		if strings.TrimSpace(preset.ID) == "" {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("cameraPresets[%d].id", i),
				Message: "camera preset id cannot be empty",
			})
			continue
		}
		if _, exists := cameraPresetIDs[preset.ID]; exists {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("cameraPresets[%d].id", i),
				Message: fmt.Sprintf("duplicate camera preset id: %s", preset.ID),
			})
		}
		cameraPresetIDs[preset.ID] = struct{}{}
	}

	if m.Scene.DefaultCameraPresetID != "" {
		if _, exists := cameraPresetIDs[m.Scene.DefaultCameraPresetID]; !exists && len(cameraPresetIDs) > 0 {
			errs = append(errs, ValidationError{
				Field:   "scene.defaultCameraPresetId",
				Message: fmt.Sprintf("default camera preset '%s' not found in cameraPresets", m.Scene.DefaultCameraPresetID),
			})
		}
	}

	// Validate hotspots
	hotspotIDs := make(map[string]struct{})
	for i, hotspot := range m.Hotspots {
		if strings.TrimSpace(hotspot.ID) == "" {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("hotspots[%d].id", i),
				Message: "hotspot id cannot be empty",
			})
			continue
		}
		if _, exists := hotspotIDs[hotspot.ID]; exists {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("hotspots[%d].id", i),
				Message: fmt.Sprintf("duplicate hotspot id: %s", hotspot.ID),
			})
		}
		hotspotIDs[hotspot.ID] = struct{}{}

		if hotspot.CameraPresetID != "" {
			if _, exists := cameraPresetIDs[hotspot.CameraPresetID]; !exists && len(cameraPresetIDs) > 0 {
				errs = append(errs, ValidationError{
					Field:   fmt.Sprintf("hotspots[%d].cameraPresetId", i),
					Message: fmt.Sprintf("referenced camera preset '%s' does not exist", hotspot.CameraPresetID),
				})
			}
		}
	}

	// Validate option groups & unique option IDs
	optionIDs := make(map[string]struct{})
	for gi, group := range m.OptionGroups {
		if strings.TrimSpace(group.ID) == "" {
			errs = append(errs, ValidationError{
				Field:   fmt.Sprintf("optionGroups[%d].id", gi),
				Message: "option group id cannot be empty",
			})
		}
		for oi, opt := range group.Options {
			if strings.TrimSpace(opt.ID) == "" {
				errs = append(errs, ValidationError{
					Field:   fmt.Sprintf("optionGroups[%d].options[%d].id", gi, oi),
					Message: "option id cannot be empty",
				})
				continue
			}
			if _, exists := optionIDs[opt.ID]; exists {
				errs = append(errs, ValidationError{
					Field:   fmt.Sprintf("optionGroups[%d].options[%d].id", gi, oi),
					Message: fmt.Sprintf("duplicate option id: %s", opt.ID),
				})
			}
			optionIDs[opt.ID] = struct{}{}
		}
	}

	return errs
}
