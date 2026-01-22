package pdf

import (
	"os"
	"path/filepath"
	"testing"
)

func TestExtract_NonExistentFile(t *testing.T) {
	_, err := Extract("/nonexistent/file.pdf")
	if err == nil {
		t.Error("expected error for non-existent file")
	}
}

func TestCleanText(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "collapse spaces",
			input:    "hello    world",
			expected: "hello world",
		},
		{
			name:     "collapse newlines",
			input:    "hello\n\n\n\nworld",
			expected: "hello\n\nworld",
		},
		{
			name:     "trim lines",
			input:    "  hello  \n  world  ",
			expected: "hello\nworld",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := cleanText(tt.input)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

// Integration test - requires a test PDF file
func TestExtract_Integration(t *testing.T) {
	// Skip if no test PDF available
	testPDF := filepath.Join("testdata", "sample.pdf")
	if _, err := os.Stat(testPDF); os.IsNotExist(err) {
		t.Skip("no test PDF at testdata/sample.pdf")
	}

	result, err := Extract(testPDF)
	if err != nil {
		t.Fatalf("Extract failed: %v", err)
	}

	if result.Title == "" {
		t.Error("title should not be empty")
	}

	if result.Content == "" {
		t.Error("content should not be empty")
	}
}
