package pdf

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/ledongthuc/pdf"
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

	content := cleanText(buf.String())

	// Use filename as default title
	title := strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))

	return &ExtractResult{
		Title:   title,
		Content: content,
	}, nil
}

func cleanText(text string) string {
	// Remove excessive whitespace
	spaceRegex := regexp.MustCompile(`[ \t]+`)
	text = spaceRegex.ReplaceAllString(text, " ")

	// Collapse multiple newlines
	newlineRegex := regexp.MustCompile(`\n{3,}`)
	text = newlineRegex.ReplaceAllString(text, "\n\n")

	// Trim lines
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	text = strings.Join(lines, "\n")

	return strings.TrimSpace(text)
}
