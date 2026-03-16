package middleware

import (
	"net/http"
	"strings"

	jwtutil "catatan-backend/internal/jwt"
	"catatan-backend/internal/model"

	"github.com/labstack/echo/v5"
)

type JWTAuth struct {
	Secret string
}

const (
	ctxKeyClaims = "auth.claims"
	ctxKeyUser   = "auth.user"
)

func (m JWTAuth) RequireJWT(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c *echo.Context) error {
		auth := strings.TrimSpace(c.Request().Header.Get("Authorization"))
		if auth == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "Authorization header diperlukan")
		}

		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return echo.NewHTTPError(http.StatusUnauthorized, "Authorization harus bertipe Bearer")
		}

		tokenString := strings.TrimSpace(parts[1])
		claims, err := jwtutil.ParseToken(m.Secret, tokenString, jwtutil.TokenTypeAccess)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "JWT tidak valid")
		}

		c.Set(ctxKeyClaims, claims)
		c.Set(ctxKeyUser, claims.User)
		return next(c)
	}
}

func UserFromContext(c *echo.Context) (model.User, bool) {
	v := c.Get(ctxKeyUser)
	user, ok := v.(model.User)
	return user, ok
}
