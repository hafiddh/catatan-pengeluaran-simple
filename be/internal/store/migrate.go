package store

import "database/sql"

func Migrate(db *sql.DB) error {
	const schema = `
	CREATE TABLE IF NOT EXISTS transaksi (
		id VARCHAR(36) NOT NULL,
		user_id VARCHAR(128) NOT NULL,
		jenis_transaksi VARCHAR(64) NOT NULL,
		kategori_id VARCHAR(36) NOT NULL,
		jumlah TEXT NOT NULL,
		tanggal DATE NOT NULL,
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL,
		deleted_at DATETIME NULL,
		PRIMARY KEY (id),
		INDEX idx_transaksi_user_tanggal (user_id, tanggal)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS jenis_pengeluaran (
		id VARCHAR(36) NOT NULL,
		label VARCHAR(64) NOT NULL,
		icon VARCHAR(128) NOT NULL,
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL,
		deleted_at DATETIME NULL,
		PRIMARY KEY (id),
		UNIQUE KEY uq_jenis_pengeluaran_label (label),
		INDEX idx_jenis_pengeluaran_deleted_at (deleted_at)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
	`

	_, err := db.Exec(schema)
	return err
}
