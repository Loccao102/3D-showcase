package server

import (
	"errors"
	"net/http"

	"github.com/Loccao102/3D-showcase/apps/api/internal/showcase"
	"github.com/gin-gonic/gin"
)

func NewRouter(repository showcase.Repository) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := router.Group("/api/v1")
	v1.GET("/showcases", func(c *gin.Context) {
		c.JSON(http.StatusOK, repository.List())
	})

	v1.GET("/showcases/:slug", func(c *gin.Context) {
		manifest, err := repository.FindBySlug(c.Param("slug"))
		if err != nil {
			if errors.Is(err, showcase.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "showcase_not_found"})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
			return
		}

		c.JSON(http.StatusOK, manifest)
	})

	v1.PUT("/showcases/:slug", func(c *gin.Context) {
		slug := c.Param("slug")
		var manifest showcase.Manifest
		if err := c.ShouldBindJSON(&manifest); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json_body", "details": err.Error()})
			return
		}

		manifest.Slug = slug
		errs := showcase.ValidateManifest(manifest)
		if len(errs) > 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"valid":  false,
				"errors": errs,
			})
			return
		}

		if err := repository.Save(manifest); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed_to_save"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"saved": true, "manifest": manifest})
	})

	v1.POST("/showcases/validate", func(c *gin.Context) {
		var manifest showcase.Manifest
		if err := c.ShouldBindJSON(&manifest); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json_body", "details": err.Error()})
			return
		}

		errs := showcase.ValidateManifest(manifest)
		if len(errs) > 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"valid":  false,
				"errors": errs,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{"valid": true})
	})

	return router
}
