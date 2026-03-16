package jwtutil

import (
	"errors"
	"fmt"
	"time"

	"catatan-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type Claims struct {
	User      model.User `json:"user"`
	TokenType string     `json:"token_type"`
	jwt.RegisteredClaims
}

func NewToken(secret string, user model.User, ttl time.Duration, tokenType string) (string, error) {
	if secret == "" {
		return "", errors.New("jwt secret is empty")
	}
	if tokenType == "" {
		return "", errors.New("token type is empty")
	}

	now := time.Now()
	claims := Claims{
		User:      user,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func NewAccessToken(secret string, user model.User, ttl time.Duration) (string, error) {
	return NewToken(secret, user, ttl, TokenTypeAccess)
}

func NewRefreshToken(secret string, user model.User, ttl time.Duration) (string, error) {
	return NewToken(secret, user, ttl, TokenTypeRefresh)
}

func ParseToken(secret string, tokenString string, expectedType string) (*Claims, error) {
	if secret == "" {
		return nil, errors.New("jwt secret is empty")
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %s", t.Method.Alg())
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	if expectedType != "" {
		if claims.TokenType == "" && expectedType == TokenTypeAccess {
			return claims, nil
		}
		if claims.TokenType != expectedType {
			return nil, fmt.Errorf("unexpected token type: %s", claims.TokenType)
		}
	}

	return claims, nil
}
