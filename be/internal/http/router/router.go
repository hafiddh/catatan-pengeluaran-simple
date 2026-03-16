package router

import (
	"database/sql"
	"net/http"
	"time"

	"catatan-backend/internal/config"
	"catatan-backend/internal/http/handler"
	appmw "catatan-backend/internal/http/middleware"
	"catatan-backend/internal/notecrypto"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func New(cfg config.Config, db *sql.DB, amountCipher *notecrypto.AmountCipher) *echo.Echo {
	e := echo.New()

	e.Use(middleware.Recover())
	e.Use(middleware.RequestLogger())

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: cfg.AllowedFrontendOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{"Accept", "Authorization", "Content-Type", "Origin", "X-Requested-With"},
	}))

	e.GET("/", func(c *echo.Context) error {
		return c.String(http.StatusOK, "OK")
	})

	api := e.Group("/api")

	jwtAuth := appmw.JWTAuth{Secret: cfg.JWTSecret}
	frontendGuard := appmw.NewFrontendGuard(cfg.AllowedFrontendOrigins)

	authGroup := api.Group("/auth")
	authGroup.Use(frontendGuard.RequireFrontend)

	googleAuth := handler.AuthHandler{
		JWTSecret:       cfg.JWTSecret,
		GoogleClientID:  cfg.GoogleClientID,
		AccessTokenTTL:  2 * time.Hour,
		RefreshTokenTTL: 24 * time.Hour,
	}
	authGroup.POST("/google", googleAuth.GoogleLogin)
	authGroup.POST("/refresh", googleAuth.RefreshToken)

	api.GET("/health", func(c *echo.Context) error {
		return c.JSON(http.StatusOK, map[string]any{"ok": true})
	})

	protected := api.Group("")
	protected.Use(frontendGuard.RequireFrontend)
	protected.Use(jwtAuth.RequireJWT)

	me := handler.MeHandler{}
	protected.GET("/me", me.Me)

	notes := handler.NotesHandler{DB: db, AmountCipher: amountCipher}
	protected.GET("/notes", notes.List)
	protected.GET("/notes/:id", notes.Get)
	protected.POST("/notes", notes.Create)
	protected.PUT("/notes/:id", notes.Update)
	protected.DELETE("/notes/:id", notes.Delete)

	expenseTypes := handler.ExpenseTypesHandler{DB: db}
	protected.GET("/expense-types", expenseTypes.List)
	protected.GET("/expense-types/:id", expenseTypes.Get)
	protected.POST("/expense-types", expenseTypes.Create)
	protected.PUT("/expense-types/:id", expenseTypes.Update)
	protected.DELETE("/expense-types/:id", expenseTypes.Delete)

	return e
}
