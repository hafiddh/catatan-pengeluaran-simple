package handler

import (
	"database/sql"
	"net/http"
	"strconv"
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
	NamaBarang     string `json:"nama_barang"`
	JumlahBarang   int64  `json:"jumlah_barang"`
	Catatan        string `json:"catatan"`
}

type listNotesResponse struct {
	Data    []store.ShoppingNote `json:"data"`
	Total   int                  `json:"total"`
	Page    int                  `json:"page"`
	Limit   int                  `json:"limit"`
	HasNext bool                 `json:"has_next"`
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

	note, err := store.CreateShoppingNote(c.Request().Context(), h.DB, h.AmountCipher, user.ID, jenis, kategori, req.Jumlah, tanggal, strings.TrimSpace(req.NamaBarang), req.JumlahBarang, strings.TrimSpace(req.Catatan))
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

	startDate := strings.TrimSpace(c.QueryParam("start_date"))
	endDate := strings.TrimSpace(c.QueryParam("end_date"))

	page := 1
	if p, err := strconv.Atoi(c.QueryParam("page")); err == nil && p > 0 {
		page = p
	}

	limit := 20
	if l, err := strconv.Atoi(c.QueryParam("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	result, err := store.ListShoppingNotes(c.Request().Context(), h.DB, h.AmountCipher, user.ID, store.ListNotesParams{
		StartDate: startDate,
		EndDate:   endDate,
		Limit:     limit,
		Offset:    (page - 1) * limit,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengambil data: "+err.Error())
	}

	return c.JSON(http.StatusOK, listNotesResponse{
		Data:    result.Items,
		Total:   result.Total,
		Page:    page,
		Limit:   limit,
		HasNext: (page-1)*limit+len(result.Items) < result.Total,
	})
}

func (h NotesHandler) Summary(c *echo.Context) error {
	user, ok := middleware.UserFromContext(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User tidak ditemukan")
	}

	startDate := strings.TrimSpace(c.QueryParam("start_date"))
	endDate := strings.TrimSpace(c.QueryParam("end_date"))

	summary, err := store.SummarizeShoppingNotes(c.Request().Context(), h.DB, h.AmountCipher, user.ID, startDate, endDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengambil data: "+err.Error())
	}

	return c.JSON(http.StatusOK, summary)
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

	note, err := store.UpdateShoppingNote(c.Request().Context(), h.DB, h.AmountCipher, user.ID, id, jenis, kategori, req.Jumlah, tanggal, strings.TrimSpace(req.NamaBarang), req.JumlahBarang, strings.TrimSpace(req.Catatan))
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
