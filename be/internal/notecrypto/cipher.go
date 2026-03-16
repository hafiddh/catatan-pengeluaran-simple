package notecrypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"strconv"
	"strings"
)

const gcmNonceSize = 12

type AmountCipher struct {
	aead cipher.AEAD
}

func NewAmountCipher(secret string) (*AmountCipher, error) {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return nil, errors.New("notes encrypt key is empty")
	}

	key := sha256.Sum256([]byte(secret))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	return &AmountCipher{aead: aead}, nil
}

func (c *AmountCipher) EncryptInt64(v int64) (string, error) {
	if c == nil || c.aead == nil {
		return "", errors.New("amount cipher is not initialized")
	}

	nonce := make([]byte, gcmNonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	plaintext := []byte(strconv.FormatInt(v, 10))
	ciphertext := c.aead.Seal(nil, nonce, plaintext, nil)
	payload := append(nonce, ciphertext...)
	return base64.RawStdEncoding.EncodeToString(payload), nil
}

func (c *AmountCipher) DecryptInt64(token string) (int64, error) {
	if c == nil || c.aead == nil {
		return 0, errors.New("amount cipher is not initialized")
	}

	token = strings.TrimSpace(token)
	if token == "" {
		return 0, errors.New("encrypted amount is empty")
	}

	payload, err := base64.RawStdEncoding.DecodeString(token)
	if err != nil {
		return 0, err
	}
	if len(payload) < gcmNonceSize {
		return 0, errors.New("encrypted amount payload is invalid")
	}

	nonce := payload[:gcmNonceSize]
	ciphertext := payload[gcmNonceSize:]
	plaintext, err := c.aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return 0, err
	}

	value, err := strconv.ParseInt(string(plaintext), 10, 64)
	if err != nil {
		return 0, err
	}
	return value, nil
}
