package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/labstack/echo/v5"
)

type OriginMatcher struct {
	allowedHosts   map[string]struct{}
	allowedOrigins map[string]struct{}
}

type FrontendGuard struct {
	matcher *OriginMatcher
}

func NewOriginMatcher(allowedOrigins []string) *OriginMatcher {
	hosts := make(map[string]struct{})
	origins := make(map[string]struct{})
	for _, origin := range allowedOrigins {
		normalized := normalizeOrigin(origin)
		if normalized != "" {
			origins[normalized] = struct{}{}
		}

		h := hostFromOrigin(origin)
		if h == "" {
			continue
		}
		hosts[h] = struct{}{}
	}

	return &OriginMatcher{allowedHosts: hosts, allowedOrigins: origins}
}

func NewFrontendGuard(allowedOrigins []string) *FrontendGuard {
	return &FrontendGuard{matcher: NewOriginMatcher(allowedOrigins)}
}

func (m *OriginMatcher) IsAllowed(rawOrigin string) bool {
	if m == nil {
		return false
	}

	normalized := normalizeOrigin(rawOrigin)
	if normalized != "" {
		if _, ok := m.allowedOrigins[normalized]; ok {
			return true
		}
	}

	host := hostFromOrigin(rawOrigin)
	if host == "" {
		return false
	}

	_, ok := m.allowedHosts[host]
	return ok
}

func (m *OriginMatcher) AllowOriginFunc(origin string) (bool, error) {
	return m.IsAllowed(origin), nil
}

func (g *FrontendGuard) RequireFrontend(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c *echo.Context) error {
		if c.Request().Method == http.MethodOptions {
			return next(c)
		}

		origin := strings.TrimSpace(c.Request().Header.Get("Origin"))
		referer := strings.TrimSpace(c.Request().Header.Get("Referer"))

		source := origin
		if source == "" {
			source = referer
		}
		if source == "" {
			return echo.NewHTTPError(http.StatusForbidden, "Origin/Referer tidak ditemukan")
		}

		if hostFromOrigin(source) == "" {
			return echo.NewHTTPError(http.StatusForbidden, "Origin/Referer tidak valid")
		}

		if g.matcher == nil || !g.matcher.IsAllowed(source) {
			return echo.NewHTTPError(http.StatusForbidden, "Akses ditolak (bukan dari frontend yang diizinkan)")
		}

		return next(c)
	}
}

func normalizeOrigin(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	if !strings.Contains(value, "://") {
		return ""
	}

	u, err := url.Parse(value)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}

	return strings.ToLower(u.Scheme + "://" + u.Host)
}

func hostFromOrigin(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	// If it's a bare host:port, normalize as URL.
	if !strings.Contains(value, "://") {
		value = "http://" + value
	}

	u, err := url.Parse(value)
	if err != nil {
		return ""
	}
	if u.Host != "" {
		return strings.ToLower(u.Host)
	}

	// Some malformed values might end up in Path.
	return strings.ToLower(strings.Trim(u.Path, "/"))
}
