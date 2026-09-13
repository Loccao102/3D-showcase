package main

import (
	"log"
	"os"

	"github.com/Loccao102/3D-showcase/apps/api/internal/server"
	"github.com/Loccao102/3D-showcase/apps/api/internal/showcase"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	repository := showcase.NewMemoryRepository()
	router := server.NewRouter(repository)

	log.Printf("showcase api listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
