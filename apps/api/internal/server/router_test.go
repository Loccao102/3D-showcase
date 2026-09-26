package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Loccao102/3D-showcase/apps/api/internal/showcase"
	"github.com/gin-gonic/gin"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	repo := showcase.NewMemoryRepository()
	return NewRouter(repo)
}

func TestHealthz(t *testing.T) {
	router := setupTestRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/healthz", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	if body["status"] != "ok" {
		t.Errorf("expected status 'ok', got '%s'", body["status"])
	}
}

func TestGetShowcase_Found(t *testing.T) {
	router := setupTestRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/showcases/automotive-concept-01", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var m showcase.Manifest
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
		t.Fatalf("failed to parse manifest response: %v", err)
	}

	if m.Slug != "automotive-concept-01" {
		t.Errorf("expected slug 'automotive-concept-01', got '%s'", m.Slug)
	}
}

func TestGetShowcase_NotFound(t *testing.T) {
	router := setupTestRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/showcases/nonexistent-slug", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestValidateShowcase_Valid(t *testing.T) {
	router := setupTestRouter()

	validManifest := showcase.Manifest{
		ID:    "test-v1",
		Slug:  "test-v1",
		Title: "Valid Showcase",
		Scene: showcase.SceneDefinition{
			DefaultCameraPresetID: "cam-1",
		},
		CameraPresets: []showcase.CameraPreset{
			{ID: "cam-1", Label: "Hero"},
		},
	}

	payload, _ := json.Marshal(validManifest)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/showcases/validate", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 for valid manifest, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestValidateShowcase_Invalid(t *testing.T) {
	router := setupTestRouter()

	invalidManifest := showcase.Manifest{
		// Missing ID, Slug, Title
	}

	payload, _ := json.Marshal(invalidManifest)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/showcases/validate", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status 422 for invalid manifest, got %d", w.Code)
	}
}
