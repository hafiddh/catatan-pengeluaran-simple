package googleauth

import (
	"context"
	"errors"
	"fmt"

	"catatan-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/idtoken"
)

// VerifyCredential validates a Google ID token (credential) and maps it to a User.
//
// If clientID is provided, it will fully validate signature and audience.
// If clientID is empty, it will parse the JWT without verifying the signature
// (NOT secure; intended only for local development).
func VerifyCredential(ctx context.Context, credential string, clientID string) (model.User, error) {
	if credential == "" {
		return model.User{}, errors.New("credential is empty")
	}

	if clientID != "" {
		payload, err := idtoken.Validate(ctx, credential, clientID)
		if err != nil {
			return model.User{}, fmt.Errorf("google token validation failed: %w", err)
		}

		email, _ := payload.Claims["email"].(string)
		sub, _ := payload.Claims["sub"].(string)
		name, _ := payload.Claims["name"].(string)
		picture, _ := payload.Claims["picture"].(string)

		if email == "" {
			return model.User{}, errors.New("google payload missing email")
		}
		if sub == "" {
			sub = email
		}

		return model.User{ID: sub, Email: email, Name: name, Picture: picture}, nil
	}

	// Dev-only fallback: decode without signature verification.
	parser := jwt.NewParser()
	parsed, _, err := parser.ParseUnverified(credential, jwt.MapClaims{})
	if err != nil {
		return model.User{}, fmt.Errorf("failed to parse credential: %w", err)
	}

	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return model.User{}, errors.New("invalid credential claims")
	}

	email, _ := claims["email"].(string)
	sub, _ := claims["sub"].(string)
	name, _ := claims["name"].(string)
	picture, _ := claims["picture"].(string)

	if email == "" {
		return model.User{}, errors.New("google credential missing email")
	}
	if sub == "" {
		sub = email
	}

	return model.User{ID: sub, Email: email, Name: name, Picture: picture}, nil
}
