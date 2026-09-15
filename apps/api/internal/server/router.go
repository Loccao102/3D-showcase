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

	return router
}
