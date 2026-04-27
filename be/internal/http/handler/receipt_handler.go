package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/labstack/echo/v5"
)

const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"

const geminiPrompt = `You are a receipt parser. Extract purchased items from receipt images and return ONLY a valid JSON array.

Output schema per item:
- "nama_barang": string (item name as-is)
- "jumlah": number (quantity)
- "total_harga": number (line total, plain integer)

Strict rules:
- Exclude: cancelled items, discounts, vouchers, taxes, subtotals, totals
- No markdown, no explanation, no code blocks
- Output must be directly parseable by JSON.parse()`

type ReceiptHandler struct {
	GeminiAPIKey string
}

type scanReceiptRequest struct {
	ImageBase64 string `json:"image_base64"`
	MimeType    string `json:"mime_type"`
}

type ScannedReceiptItem struct {
	NamaBarang string  `json:"nama_barang"`
	Jumlah     float64 `json:"jumlah"`
	TotalHarga float64 `json:"total_harga"`
}

func (h ReceiptHandler) ScanReceipt(c *echo.Context) error {
	if h.GeminiAPIKey == "" {
		return echo.NewHTTPError(http.StatusServiceUnavailable, "Fitur scan struk belum dikonfigurasi")
	}

	var req scanReceiptRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Body tidak valid")
	}
	if req.ImageBase64 == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "image_base64 wajib diisi")
	}

	mimeType := req.MimeType
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	items, err := h.callGemini(c.Request().Context(), req.ImageBase64, mimeType)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Gagal memproses struk: "+err.Error())
	}

	return c.JSON(http.StatusOK, items)
}

func (h ReceiptHandler) callGemini(ctx context.Context, imageBase64, mimeType string) ([]ScannedReceiptItem, error) {
	payload := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]any{
					{"text": geminiPrompt},
					{"inline_data": map[string]any{
						"mime_type": mimeType,
						"data":      imageBase64,
					}},
				},
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, geminiEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-goog-api-key", h.GeminiAPIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini status %d: %s", resp.StatusCode, truncate(string(respBytes), 200))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
		return nil, fmt.Errorf("parse gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("respons kosong dari Gemini")
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text

	// Extract JSON array from the text
	start := bytes.IndexByte([]byte(text), '[')
	end := bytes.LastIndexByte([]byte(text), ']')
	if start == -1 || end == -1 || end <= start {
		return nil, fmt.Errorf("format respons tidak dikenali")
	}
	jsonPart := text[start : end+1]

	var items []ScannedReceiptItem
	if err := json.Unmarshal([]byte(jsonPart), &items); err != nil {
		return nil, fmt.Errorf("parsing hasil scan: %w", err)
	}

	return items, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
