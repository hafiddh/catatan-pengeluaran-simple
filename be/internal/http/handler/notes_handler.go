package handler

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"catatan-backend/internal/http/middleware"
	"catatan-backend/internal/notecrypto"
	"catatan-backend/internal/store"

	"github.com/labstack/echo/v5"
)

type NotesHandler struct {
	DB           *sql.DB
	AmountCipher *notecrypto.AmountCipher
}

type createNoteRequest struct {
	Tanggal        string `json:"tanggal"`
	Jumlah         int64  `json:"jumlah"`
	JenisTransaksi string `json:"jenis_transaksi"`
	KategoriID     string `json:"kategori_id"`
}

func (h NotesHandler) Create(c *echo.Context) error {
	user, ok := middleware.UserFromContext(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User tidak ditemukan")
	}

	var req createNoteRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Body tidak valid")
	}

	tanggal := strings.TrimSpace(req.Tanggal)
	if tanggal == "" {
		tanggal = time.Now().Format("2006-01-02")
	}
	if _, err := time.Parse("2006-01-02", tanggal); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Tanggal tidak valid (format: YYYY-MM-DD)")
	}

	jenis := strings.TrimSpace(req.JenisTransaksi)
	if jenis == "" {
		jenis = "pengeluaran"
	}

	kategori := strings.TrimSpace(req.KategoriID)
	if kategori == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Kategori id wajib diisi")
	}

	if req.Jumlah <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Jumlah harus lebih dari 0")
	}

	note, err := store.CreateShoppingNote(c.Request().Context(), h.DB, h.AmountCipher, user.ID, jenis, kategori, req.Jumlah, tanggal)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal menyimpan transaksi: "+err.Error())
	}

	return c.JSON(http.StatusCreated, note)
}

func (h NotesHandler) List(c *echo.Context) error {
	user, ok := middleware.UserFromContext(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User tidak ditemukan")
	}

	items, err := store.ListShoppingNotes(c.Request().Context(), h.DB, h.AmountCipher, user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengambil data: "+err.Error())
	}

	return c.JSON(http.StatusOK, items)
}

func (h NotesHandler) Get(c *echo.Context) error {
	user, ok := middleware.UserFromContext(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User tidak ditemukan")
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		return err
	}

	note, err := store.GetShoppingNoteByID(c.Request().Context(), h.DB, h.AmountCipher, user.ID, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Data tidak ditemukan")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengambil data")
	}

	return c.JSON(http.StatusOK, note)
}

func (h NotesHandler) Update(c *echo.Context) error {
	user, ok := middleware.UserFromContext(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User tidak ditemukan")
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		return err
	}

	var req createNoteRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Body tidak valid")
	}

	tanggal := strings.TrimSpace(req.Tanggal)
	if tanggal == "" {
		tanggal = time.Now().Format("2006-01-02")
	}
	if _, err := time.Parse("2006-01-02", tanggal); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Tanggal tidak valid (format: YYYY-MM-DD)")
	}

	jenis := strings.TrimSpace(req.JenisTransaksi)
	if jenis == "" {
		jenis = "pengeluaran"
	}

	kategori := strings.TrimSpace(req.KategoriID)
	if kategori == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Kategori id wajib diisi")
	}

	if req.Jumlah <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Jumlah harus lebih dari 0")
	}

	note, err := store.UpdateShoppingNote(c.Request().Context(), h.DB, h.AmountCipher, user.ID, id, jenis, kategori, req.Jumlah, tanggal)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Data tidak ditemukan")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengubah data")
	}

	return c.JSON(http.StatusOK, note)
}

func (h NotesHandler) Delete(c *echo.Context) error {
	user, ok := middleware.UserFromContext(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User tidak ditemukan")
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		return err
	}

	err = store.SoftDeleteShoppingNote(c.Request().Context(), h.DB, user.ID, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Data tidak ditemukan")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal menghapus data")
	}

	return c.NoContent(http.StatusNoContent)
}
