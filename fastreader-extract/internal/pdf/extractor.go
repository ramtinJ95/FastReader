package pdf

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/ledongthuc/pdf"
	"github.com/ramtinJ95/fastreader-extract/internal/text"
)

type ExtractResult struct {
	Title   string
	Content string
}

// Extract reads a PDF file and extracts text content
func Extract(filePath string) (*ExtractResult, error) {
	// Verify file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("file not found: %s", filePath)
	}

	f, r, err := pdf.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("opening PDF: %w", err)
	}
	defer f.Close()

	var buf bytes.Buffer
	numPages := r.NumPage()

	for i := 1; i <= numPages; i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}

		text, err := page.GetPlainText(nil)
		if err != nil {
			// Continue on error - some pages may fail
			continue
		}

		buf.WriteString(text)
		buf.WriteString("\n\n")
	}

	content := text.CleanText(buf.String())

	// Use filename as default title
	title := strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))

	return &ExtractResult{
		Title:   title,
		Content: content,
	}, nil
}
