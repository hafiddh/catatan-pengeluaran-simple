package handler

import (
	"net/http"

	"catatan-backend/internal/http/middleware"

	"github.com/labstack/echo/v5"
)

type MeHandler struct{}

func (h MeHandler) Me(c *echo.Context) error {
	user, ok := middleware.UserFromContext(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User tidak ditemukan")
	}
	return c.JSON(http.StatusOK, user)
}
