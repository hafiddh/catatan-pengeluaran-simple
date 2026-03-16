package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

type ExpenseType struct {
	ID        string     `json:"id"`
	Label     string     `json:"label"`
	Icon      string     `json:"icon"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

func newUUIDFromDB(ctx context.Context, db *sql.DB) (string, error) {
	var id string
	if err := db.QueryRowContext(ctx, "SELECT UUID()").Scan(&id); err != nil {
		return "", err
	}
	if id == "" {
		return "", errors.New("uuid is empty")
	}
	return id, nil
}

func CreateExpenseType(ctx context.Context, db *sql.DB, label string, icon string) (ExpenseType, error) {
	if db == nil {
		return ExpenseType{}, errors.New("db is nil")
	}
	if label == "" {
		return ExpenseType{}, errors.New("label is empty")
	}
	if icon == "" {
		return ExpenseType{}, errors.New("icon is empty")
	}

	id, err := newUUIDFromDB(ctx, db)
	if err != nil {
		return ExpenseType{}, err
	}

	now := time.Now().UTC()
	_, err = db.ExecContext(ctx,
		"INSERT INTO jenis_pengeluaran (id, label, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
		id, label, icon, now, now,
	)
	if err != nil {
		return ExpenseType{}, err
	}

	return ExpenseType{
		ID:        id,
		Label:     label,
		Icon:      icon,
		CreatedAt: now,
		UpdatedAt: now,
		DeletedAt: nil,
	}, nil
}

func ListExpenseTypes(ctx context.Context, db *sql.DB) ([]ExpenseType, error) {
	if db == nil {
		return nil, errors.New("db is nil")
	}

	rows, err := db.QueryContext(ctx,
		"SELECT id, label, icon, created_at, updated_at, deleted_at FROM jenis_pengeluaran WHERE deleted_at IS NULL ORDER BY label ASC",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ExpenseType, 0)
	for rows.Next() {
		var it ExpenseType
		var deleted sql.NullTime
		if err := rows.Scan(&it.ID, &it.Label, &it.Icon, &it.CreatedAt, &it.UpdatedAt, &deleted); err != nil {
			return nil, err
		}
		if deleted.Valid {
			t := deleted.Time
			it.DeletedAt = &t
		}
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return out, nil
}

func GetExpenseTypeByID(ctx context.Context, db *sql.DB, id string) (ExpenseType, error) {
	if db == nil {
		return ExpenseType{}, errors.New("db is nil")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return ExpenseType{}, errors.New("id is empty")
	}

	var it ExpenseType
	var deleted sql.NullTime
	err := db.QueryRowContext(ctx,
		"SELECT id, label, icon, created_at, updated_at, deleted_at FROM jenis_pengeluaran WHERE id = ? LIMIT 1",
		id,
	).Scan(&it.ID, &it.Label, &it.Icon, &it.CreatedAt, &it.UpdatedAt, &deleted)
	if err != nil {
		return ExpenseType{}, err
	}
	if deleted.Valid {
		t := deleted.Time
		it.DeletedAt = &t
	}
	return it, nil
}

func UpdateExpenseType(ctx context.Context, db *sql.DB, id string, label string, icon string) (ExpenseType, error) {
	if db == nil {
		return ExpenseType{}, errors.New("db is nil")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return ExpenseType{}, errors.New("id is empty")
	}
	if label == "" {
		return ExpenseType{}, errors.New("label is empty")
	}
	if icon == "" {
		return ExpenseType{}, errors.New("icon is empty")
	}

	now := time.Now().UTC()
	res, err := db.ExecContext(ctx,
		"UPDATE jenis_pengeluaran SET label = ?, icon = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
		label, icon, now, id,
	)
	if err != nil {
		return ExpenseType{}, err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return ExpenseType{}, err
	}
	if affected == 0 {
		return ExpenseType{}, sql.ErrNoRows
	}

	// Fetch current record
	return GetExpenseTypeByID(ctx, db, id)
}

func SoftDeleteExpenseType(ctx context.Context, db *sql.DB, id string) error {
	if db == nil {
		return errors.New("db is nil")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is empty")
	}

	now := time.Now().UTC()
	res, err := db.ExecContext(ctx,
		"UPDATE jenis_pengeluaran SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
		now, now, id,
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
