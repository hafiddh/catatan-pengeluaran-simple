package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port                   string
	JWTSecret              string
	NotesEncryptKey        string
	GoogleClientID         string
	AllowedFrontendOrigins []string
	DBDriver               string
	DBDSN                  string
	DBHost                 string
	DBPort                 string
	DBName                 string
	DBUser                 string
	DBPassword             string
}

func Load() (Config, error) {
	port := strings.TrimSpace(getenv("PORT", "1323"))
	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if jwtSecret == "" {
		return Config{}, errors.New("JWT_SECRET is required")
	}

	notesEncryptKey := strings.TrimSpace(os.Getenv("NOTES_ENCRYPT_KEY"))
	if notesEncryptKey == "" {
		return Config{}, errors.New("NOTES_ENCRYPT_KEY is required")
	}

	dbDriver := strings.TrimSpace(getenv("DB_DRIVER", "mysql"))
	if dbDriver == "" {
		return Config{}, errors.New("DB_DRIVER resolved to empty")
	}

	var (
		dbDSN      string
		dbHost     string
		dbPort     string
		dbName     string
		dbUser     string
		dbPassword string
	)

	if strings.EqualFold(dbDriver, "mysql") {
		dbHost = strings.TrimSpace(getenv("DB_HOST", "127.0.0.1"))
		dbPort = strings.TrimSpace(getenv("DB_PORT", "3306"))
		dbName = strings.TrimSpace(os.Getenv("DB_NAME"))
		dbUser = strings.TrimSpace(os.Getenv("DB_USER"))
		dbPassword = os.Getenv("DB_PASSWORD")
		params := strings.TrimSpace(getenv("DB_PARAMS", "parseTime=true&charset=utf8mb4&loc=Local"))

		if dbHost == "" {
			return Config{}, errors.New("DB_HOST is required")
		}
		if dbPort == "" {
			return Config{}, errors.New("DB_PORT is required")
		}
		if dbName == "" {
			return Config{}, errors.New("DB_NAME is required")
		}
		if dbUser == "" {
			return Config{}, errors.New("DB_USER is required")
		}

		if params != "" {
			dbDSN = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?%s", dbUser, dbPassword, dbHost, dbPort, dbName, params)
		} else {
			dbDSN = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s", dbUser, dbPassword, dbHost, dbPort, dbName)
		}
	} else {
		dbDSN = strings.TrimSpace(getenv("DB_DSN", ""))
		if dbDSN == "" {
			return Config{}, errors.New("DB_DSN is required for non-mysql drivers")
		}
	}

	originsRaw := getenv("ALLOWED_FRONTEND_ORIGINS", "http://localhost:4321")
	var origins []string
	for _, part := range strings.Split(originsRaw, ",") {
		p := strings.TrimSpace(part)
		if p == "" {
			continue
		}
		origins = append(origins, p)
	}
	if len(origins) == 0 {
		return Config{}, errors.New("ALLOWED_FRONTEND_ORIGINS resolved to empty")
	}

	return Config{
		Port:                   port,
		JWTSecret:              jwtSecret,
		NotesEncryptKey:        notesEncryptKey,
		GoogleClientID:         strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID")),
		AllowedFrontendOrigins: origins,
		DBDriver:               dbDriver,
		DBDSN:                  dbDSN,
		DBHost:                 dbHost,
		DBPort:                 dbPort,
		DBName:                 dbName,
		DBUser:                 dbUser,
		DBPassword:             dbPassword,
	}, nil
}

func getenv(key, def string) string {
	v := os.Getenv(key)
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}
