package store

import (
	"context"
	"database/sql"
	"errors"
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
	Tanggal        string     `json:"tanggal"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
}

func readShoppingNote(
	id string,
	userID string,
	jenisTransaksi string,
	kategoriID string,
	jumlahEncrypted string,
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
		Tanggal:        tanggal,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
		DeletedAt:      deletedAtValue,
	}, nil
}

func CreateShoppingNote(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string, jenisTransaksi string, kategoriID string, jumlah int64, tanggal string) (ShoppingNote, error) {
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
		"INSERT INTO transaksi (id, user_id, jenis_transaksi, kategori_id, jumlah, tanggal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		id, userID, jenisTransaksi, kategoriID, jumlahEncrypted, tanggal, now, now,
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
		Tanggal:        tanggal,
		CreatedAt:      now,
		UpdatedAt:      now,
		DeletedAt:      nil,
	}, nil
}

func ListShoppingNotes(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string) ([]ShoppingNote, error) {
	if db == nil {
		return nil, errors.New("db is nil")
	}
	if amountCipher == nil {
		return nil, errors.New("amount cipher is nil")
	}
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("user id is empty")
	}

	rows, err := db.QueryContext(ctx,
		"SELECT id, user_id, jenis_transaksi, kategori_id, jumlah, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, created_at, updated_at, deleted_at FROM transaksi WHERE user_id = ? AND deleted_at IS NULL ORDER BY tanggal DESC, created_at DESC",
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ShoppingNote, 0)
	for rows.Next() {
		var (
			id              string
			noteUserID      string
			jenisTransaksi  string
			kategoriID      string
			jumlahEncrypted string
			tanggal         string
			createdAt       time.Time
			updatedAt       time.Time
			deletedAt       sql.NullTime
		)

		if err := rows.Scan(&id, &noteUserID, &jenisTransaksi, &kategoriID, &jumlahEncrypted, &tanggal, &createdAt, &updatedAt, &deletedAt); err != nil {
			return nil, err
		}

		note, err := readShoppingNote(id, noteUserID, jenisTransaksi, kategoriID, jumlahEncrypted, tanggal, createdAt, updatedAt, deletedAt, amountCipher)
		if err != nil {
			return nil, err
		}
		out = append(out, note)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return out, nil
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
		tanggal         string
		createdAt       time.Time
		updatedAt       time.Time
		deletedAt       sql.NullTime
	)

	err := db.QueryRowContext(ctx,
		"SELECT id, user_id, jenis_transaksi, kategori_id, jumlah, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, created_at, updated_at, deleted_at FROM transaksi WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1",
		id, userID,
	).Scan(&noteID, &noteUserID, &jenisTransaksi, &kategoriID, &jumlahEncrypted, &tanggal, &createdAt, &updatedAt, &deletedAt)
	if err != nil {
		return ShoppingNote{}, err
	}

	return readShoppingNote(noteID, noteUserID, jenisTransaksi, kategoriID, jumlahEncrypted, tanggal, createdAt, updatedAt, deletedAt, amountCipher)
}

func UpdateShoppingNote(ctx context.Context, db *sql.DB, amountCipher *notecrypto.AmountCipher, userID string, id string, jenisTransaksi string, kategoriID string, jumlah int64, tanggal string) (ShoppingNote, error) {
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
		"UPDATE transaksi SET jenis_transaksi = ?, kategori_id = ?, jumlah = ?, tanggal = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
		jenisTransaksi, kategoriID, jumlahEncrypted, tanggal, now, id, userID,
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
