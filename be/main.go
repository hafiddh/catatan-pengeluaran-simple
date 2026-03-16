package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"catatan-backend/internal/config"
	"catatan-backend/internal/http/router"
	"catatan-backend/internal/notecrypto"
	"catatan-backend/internal/store"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := store.Open(cfg.DBDriver, cfg.DBDSN)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// if err := store.Migrate(db); err != nil {
	// 	log.Fatal(err)
	// }

	amountCipher, err := notecrypto.NewAmountCipher(cfg.NotesEncryptKey)
	if err != nil {
		log.Fatal(err)
	}

	e := router.New(cfg, db, amountCipher)
	addr := ":" + cfg.Port
	srv := &http.Server{Addr: addr, Handler: e}
	log.Printf("backend running on http://localhost%s", addr)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		err := srv.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			e.Logger.Error("failed to start server", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}
