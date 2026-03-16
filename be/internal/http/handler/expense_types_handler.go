package handler

import (
	"database/sql"
	"net/http"
	"strings"

	"catatan-backend/internal/store"

	"github.com/labstack/echo/v5"
)

type ExpenseTypesHandler struct {
	DB *sql.DB
}

type createExpenseTypeRequest struct {
	Label string `json:"label"`
	Icon  string `json:"icon"`
}

type updateExpenseTypeRequest struct {
	Label string `json:"label"`
	Icon  string `json:"icon"`
}

func parseIDParam(c *echo.Context, paramName string) (string, error) {
	id := strings.TrimSpace(c.Param(paramName))
	if id == "" {
		return "", echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}
	return id, nil
}

func (h ExpenseTypesHandler) List(c *echo.Context) error {
	items, err := store.ListExpenseTypes(c.Request().Context(), h.DB)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengambil data: "+err.Error())
	}
	return c.JSON(http.StatusOK, items)
}

func (h ExpenseTypesHandler) Get(c *echo.Context) error {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return err
	}

	it, err := store.GetExpenseTypeByID(c.Request().Context(), h.DB, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Data tidak ditemukan")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengambil data")
	}
	return c.JSON(http.StatusOK, it)
}

func (h ExpenseTypesHandler) Create(c *echo.Context) error {
	var req createExpenseTypeRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Body tidak valid")
	}

	label := strings.TrimSpace(req.Label)
	icon := strings.TrimSpace(req.Icon)
	if label == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Label wajib diisi")
	}
	if icon == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Icon wajib diisi")
	}

	it, err := store.CreateExpenseType(c.Request().Context(), h.DB, label, icon)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal membuat data")
	}

	return c.JSON(http.StatusCreated, it)
}

func (h ExpenseTypesHandler) Update(c *echo.Context) error {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return err
	}

	var req updateExpenseTypeRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Body tidak valid")
	}

	label := strings.TrimSpace(req.Label)
	icon := strings.TrimSpace(req.Icon)
	if label == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Label wajib diisi")
	}
	if icon == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Icon wajib diisi")
	}

	it, err := store.UpdateExpenseType(c.Request().Context(), h.DB, id, label, icon)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Data tidak ditemukan")
		}
		if strings.Contains(err.Error(), "Duplicate") || strings.Contains(err.Error(), "duplicate") {
			return echo.NewHTTPError(http.StatusConflict, "Label sudah digunakan")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengubah data")
	}

	return c.JSON(http.StatusOK, it)
}

func (h ExpenseTypesHandler) Delete(c *echo.Context) error {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return err
	}

	err = store.SoftDeleteExpenseType(c.Request().Context(), h.DB, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Data tidak ditemukan")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal menghapus data")
	}

	return c.NoContent(http.StatusNoContent)
}
