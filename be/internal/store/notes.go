package store

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
	"time"

	"catatan-backend/internal/notecrypto"
)

type ShoppingNote struct {
	ID             string     `json:"id"`
	UserID         string     `json:"user_id"`
	JenisTransaksi string     `json:"jenis_transaksi"`
	KategoriID     string     `json:"kategori_id"`
	Jumlah         int64      `json:"jumlah"`
	NamaBarang     string     `json:"nama_barang"`
	JumlahBarang   int64      `json:"jumlah_barang"`
	Catatan        string     `json:"catatan"`
	Tanggal        string     `json:"tanggal"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
}

type ListNotesParams struct {
	StartDate string
	EndDate   string
	Limit     int
	Offset    int
}

type ListNotesResult struct {
	Items []ShoppingNote
	Total int
}

type NotesSummaryItem struct {
	KategoriID    string `json:"kategori_id"`
	KategoriLabel string `json:"kategori_label"`
	Icon          string `json:"icon"`
	Count         int    `json:"count"`
	Total         int64  `json:"total"`
}

type NotesSummary struct {
	TotalCount  int                `json:"total_count"`
	TotalAmount int64              `json:"total_amount"`
	Categories  []NotesSummaryItem `json:"categories"`
}

func readShoppingNote(
	id string,
	userID string,
	jenisTransaksi string,
	kategoriID string,
	jumlahEncrypted string,
	namaBarang sql.NullString,
	jumlahBarang sql.NullInt64,
	catatan sql.NullString,
	tanggal string,
	createdAt time.Time,
	updatedAt time.Time,
	deletedAt sql.NullTime,
	amountCipher *notecrypto.AmountCipher,
) (ShoppingNote, error) {
	jumlah, err := amountCipher.DecryptInt64(jumlahEncrypted)
	if err != nil {
		return ShoppingNote{}, err
	}

	var deletedAtValue *time.Time
	if deletedAt.Valid {
		t := deletedAt.Time
		deletedAtValue = &t
	}

	return ShoppingNote{
		ID:             id,
		UserID:         userID,
		JenisTransaksi: jenisTransaksi,
		KategoriID:     kategoriID,
		Jumlah:         jumlah,
		NamaBarang:     namaBarang.String,
		JumlahBarang:   jumlahBarang.Int64,
		Catatan:        catatan.String,
		Tanggal:        tanggal,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
		DeletedAt:      deletedAtValue,
	}, nil
}

func buildNotesWhere(userID string, startDate string, endDate string) (string, []any) {
	parts := []string{"user_id = ?", "deleted_at IS NULL"}
	args := []any{userID}

	if startDate != "" {
		parts = append(parts, "tanggal >= ?")
		args = append(args, startDate)
	}
	if endDate != "" {
		parts = append(parts, "tanggal <= ?")
		args = append(args, endDate)
	}

	return strings.Join(parts, " AND "), args
}

func CreateShoppingNote(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string, jenisTransaksi string, kategoriID string, jumlah int64, tanggal string, namaBarang string, jumlahBarang int64, catatan string) (ShoppingNote, error) {
	if db == nil {
		return ShoppingNote{}, errors.New("db is nil")
	}
	if amountCipher == nil {
		return ShoppingNote{}, errors.New("amount cipher is nil")
	}
	if userID == "" {
		return ShoppingNote{}, errors.New("user id is empty")
	}
	if jenisTransaksi == "" {
		return ShoppingNote{}, errors.New("jenis transaksi is empty")
	}
	if kategoriID == "" {
		return ShoppingNote{}, errors.New("kategori id is empty")
	}
	if tanggal == "" {
		return ShoppingNote{}, errors.New("tanggal is empty")
	}
	if jumlah <= 0 {
		return ShoppingNote{}, errors.New("jumlah must be > 0")
	}

	id, err := newUUIDFromDB(ctx, db)
	if err != nil {
		return ShoppingNote{}, err
	}

	jumlahEncrypted, err := amountCipher.EncryptInt64(jumlah)
	if err != nil {
		return ShoppingNote{}, err
	}

	now := time.Now().UTC()
	_, err = db.ExecContext(ctx,
		"INSERT INTO transaksi (id, user_id, jenis_transaksi, kategori_id, jumlah, nama_barang, jumlah_barang, catatan, tanggal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, 0), NULLIF(?, ''), ?, ?, ?)",
		id, userID, jenisTransaksi, kategoriID, jumlahEncrypted, namaBarang, jumlahBarang, catatan, tanggal, now, now,
	)
	if err != nil {
		return ShoppingNote{}, err
	}

	return ShoppingNote{
		ID:             id,
		UserID:         userID,
		JenisTransaksi: jenisTransaksi,
		KategoriID:     kategoriID,
		Jumlah:         jumlah,
		NamaBarang:     namaBarang,
		JumlahBarang:   jumlahBarang,
		Catatan:        catatan,
		Tanggal:        tanggal,
		CreatedAt:      now,
		UpdatedAt:      now,
		DeletedAt:      nil,
	}, nil
}

func ListShoppingNotes(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string, params ListNotesParams) (ListNotesResult, error) {
	if db == nil {
		return ListNotesResult{}, errors.New("db is nil")
	}
	if amountCipher == nil {
		return ListNotesResult{}, errors.New("amount cipher is nil")
	}
	if strings.TrimSpace(userID) == "" {
		return ListNotesResult{}, errors.New("user id is empty")
	}

	where, args := buildNotesWhere(userID, params.StartDate, params.EndDate)

	var total int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM transaksi WHERE "+where, args...).Scan(&total); err != nil {
		return ListNotesResult{}, err
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	pageArgs := make([]any, len(args), len(args)+2)
	copy(pageArgs, args)
	pageArgs = append(pageArgs, limit, offset)

	rows, err := db.QueryContext(ctx,
		"SELECT id, user_id, jenis_transaksi, kategori_id, jumlah, nama_barang, jumlah_barang, catatan, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, created_at, updated_at, deleted_at FROM transaksi WHERE "+where+" ORDER BY tanggal DESC, created_at DESC LIMIT ? OFFSET ?",
		pageArgs...,
	)
	if err != nil {
		return ListNotesResult{}, err
	}
	defer rows.Close()

	items := make([]ShoppingNote, 0)
	for rows.Next() {
		var (
			id              string
			noteUserID      string
			jenisTransaksi  string
			kategoriID      string
			jumlahEncrypted string
			namaBarang      sql.NullString
			jumlahBarang    sql.NullInt64
			catatan         sql.NullString
			tanggal         string
			createdAt       time.Time
			updatedAt       time.Time
			deletedAt       sql.NullTime
		)

		if err := rows.Scan(&id, &noteUserID, &jenisTransaksi, &kategoriID, &jumlahEncrypted, &namaBarang, &jumlahBarang, &catatan, &tanggal, &createdAt, &updatedAt, &deletedAt); err != nil {
			return ListNotesResult{}, err
		}

		note, err := readShoppingNote(id, noteUserID, jenisTransaksi, kategoriID, jumlahEncrypted, namaBarang, jumlahBarang, catatan, tanggal, createdAt, updatedAt, deletedAt, amountCipher)
		if err != nil {
			return ListNotesResult{}, err
		}
		items = append(items, note)
	}

	if err := rows.Err(); err != nil {
		return ListNotesResult{}, err
	}

	return ListNotesResult{Items: items, Total: total}, nil
}

func SummarizeShoppingNotes(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string, startDate string, endDate string) (NotesSummary, error) {
	if db == nil {
		return NotesSummary{}, errors.New("db is nil")
	}
	if amountCipher == nil {
		return NotesSummary{}, errors.New("amount cipher is nil")
	}
	if strings.TrimSpace(userID) == "" {
		return NotesSummary{}, errors.New("user id is empty")
	}

	whereParts := []string{"t.user_id = ?", "t.deleted_at IS NULL"}
	args := []any{userID}

	if startDate != "" {
		whereParts = append(whereParts, "t.tanggal >= ?")
		args = append(args, startDate)
	}
	if endDate != "" {
		whereParts = append(whereParts, "t.tanggal <= ?")
		args = append(args, endDate)
	}

	where := strings.Join(whereParts, " AND ")

	rows, err := db.QueryContext(ctx,
		"SELECT t.kategori_id, COALESCE(jp.label, '') AS label, COALESCE(jp.icon, '') AS icon, t.jumlah "+
			"FROM transaksi t "+
			"LEFT JOIN jenis_pengeluaran jp ON jp.id = t.kategori_id AND jp.deleted_at IS NULL "+
			"WHERE "+where,
		args...,
	)
	if err != nil {
		return NotesSummary{}, err
	}
	defer rows.Close()

	type groupEntry struct {
		label string
		icon  string
		count int
		total int64
	}
	grouped := make(map[string]*groupEntry)
	var totalAmount int64
	var totalCount int

	for rows.Next() {
		var kategoriID, label, icon, jumlahEncrypted string
		if err := rows.Scan(&kategoriID, &label, &icon, &jumlahEncrypted); err != nil {
			return NotesSummary{}, err
		}

		jumlah, err := amountCipher.DecryptInt64(jumlahEncrypted)
		if err != nil {
			return NotesSummary{}, err
		}

		totalAmount += jumlah
		totalCount++

		if entry := grouped[kategoriID]; entry == nil {
			grouped[kategoriID] = &groupEntry{label: label, icon: icon, count: 1, total: jumlah}
		} else {
			entry.count++
			entry.total += jumlah
		}
	}

	if err := rows.Err(); err != nil {
		return NotesSummary{}, err
	}

	categories := make([]NotesSummaryItem, 0, len(grouped))
	for kategoriID, entry := range grouped {
		categories = append(categories, NotesSummaryItem{
			KategoriID:    kategoriID,
			KategoriLabel: entry.label,
			Icon:          entry.icon,
			Count:         entry.count,
			Total:         entry.total,
		})
	}

	sort.Slice(categories, func(i, j int) bool {
		return categories[i].Total > categories[j].Total
	})

	return NotesSummary{
		TotalCount:  totalCount,
		TotalAmount: totalAmount,
		Categories:  categories,
	}, nil
}

func GetShoppingNoteByID(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string, id string) (ShoppingNote, error) {
	if db == nil {
		return ShoppingNote{}, errors.New("db is nil")
	}
	if amountCipher == nil {
		return ShoppingNote{}, errors.New("amount cipher is nil")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return ShoppingNote{}, errors.New("user id is empty")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return ShoppingNote{}, errors.New("id is empty")
	}

	var (
		noteID          string
		noteUserID      string
		jenisTransaksi  string
		kategoriID      string
		jumlahEncrypted string
		namaBarang      sql.NullString
		jumlahBarang    sql.NullInt64
		catatan         sql.NullString
		tanggal         string
		createdAt       time.Time
		updatedAt       time.Time
		deletedAt       sql.NullTime
	)

	err := db.QueryRowContext(ctx,
		"SELECT id, user_id, jenis_transaksi, kategori_id, jumlah, nama_barang, jumlah_barang, catatan, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, created_at, updated_at, deleted_at FROM transaksi WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1",
		id, userID,
	).Scan(&noteID, &noteUserID, &jenisTransaksi, &kategoriID, &jumlahEncrypted, &namaBarang, &jumlahBarang, &catatan, &tanggal, &createdAt, &updatedAt, &deletedAt)
	if err != nil {
		return ShoppingNote{}, err
	}

	return readShoppingNote(noteID, noteUserID, jenisTransaksi, kategoriID, jumlahEncrypted, namaBarang, jumlahBarang, catatan, tanggal, createdAt, updatedAt, deletedAt, amountCipher)
}

func UpdateShoppingNote(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string, id string, jenisTransaksi string, kategoriID string, jumlah int64, tanggal string, namaBarang string, jumlahBarang int64, catatan string) (ShoppingNote, error) {
	if db == nil {
		return ShoppingNote{}, errors.New("db is nil")
	}
	if amountCipher == nil {
		return ShoppingNote{}, errors.New("amount cipher is nil")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return ShoppingNote{}, errors.New("user id is empty")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return ShoppingNote{}, errors.New("id is empty")
	}
	if jenisTransaksi == "" {
		return ShoppingNote{}, errors.New("jenis transaksi is empty")
	}
	if kategoriID == "" {
		return ShoppingNote{}, errors.New("kategori id is empty")
	}
	if tanggal == "" {
		return ShoppingNote{}, errors.New("tanggal is empty")
	}
	if jumlah <= 0 {
		return ShoppingNote{}, errors.New("jumlah must be > 0")
	}

	jumlahEncrypted, err := amountCipher.EncryptInt64(jumlah)
	if err != nil {
		return ShoppingNote{}, err
	}

	now := time.Now().UTC()
	res, err := db.ExecContext(ctx,
		"UPDATE transaksi SET jenis_transaksi = ?, kategori_id = ?, jumlah = ?, nama_barang = NULLIF(?, ''), jumlah_barang = NULLIF(?, 0), catatan = NULLIF(?, ''), tanggal = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
		jenisTransaksi, kategoriID, jumlahEncrypted, namaBarang, jumlahBarang, catatan, tanggal, now, id, userID,
	)
	if err != nil {
		return ShoppingNote{}, err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return ShoppingNote{}, err
	}
	if affected == 0 {
		return ShoppingNote{}, sql.ErrNoRows
	}

	return GetShoppingNoteByID(ctx, db, amountCipher, userID, id)
}

func SoftDeleteShoppingNote(ctx context.Context, db *sql.DB, userID string, id string) error {
	if db == nil {
		return errors.New("db is nil")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return errors.New("user id is empty")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is empty")
	}

	now := time.Now().UTC()
	res, err := db.ExecContext(ctx,
		"UPDATE transaksi SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
		now, now, id, userID,
	)
	if err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}

	return nil
}
