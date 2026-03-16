package store

import (
	"database/sql"
	"errors"
	"strings"

	_ "github.com/go-sql-driver/mysql"
)

// Open opens a SQL database connection using the given driver and DSN.
func Open(driver string, dsn string) (*sql.DB, error) {
	driver = strings.TrimSpace(driver)
	dsn = strings.TrimSpace(dsn)
	if driver == "" {
		return nil, errors.New("db driver is empty")
	}
	if dsn == "" {
		return nil, errors.New("db dsn is empty")
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}
