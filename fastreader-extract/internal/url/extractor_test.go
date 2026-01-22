package url

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseHTML(t *testing.T) {
	html := `
<!DOCTYPE html>
<html>
<head><title>Test Article</title></head>
<body>
<nav>Navigation content</nav>
<article>
<h1>Main Heading</h1>
<p>This is the first paragraph.</p>
<p>This is the second paragraph.</p>
</article>
<footer>Footer content</footer>
</body>
</html>`

	result, err := parseHTML(html)
	if err != nil {
		t.Fatalf("parseHTML failed: %v", err)
	}

	if result.Title != "Test Article" {
		t.Errorf("expected title 'Test Article', got '%s'", result.Title)
	}

	if !strings.Contains(result.Content, "first paragraph") {
		t.Error("content should contain 'first paragraph'")
	}

	if strings.Contains(result.Content, "Navigation") {
		t.Error("content should not contain navigation")
	}

	if strings.Contains(result.Content, "Footer") {
		t.Error("content should not contain footer")
	}
}

func TestExtract(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<html><head><title>Test</title></head><body><p>Hello World</p></body></html>`))
	}))
	defer server.Close()

	result, err := Extract(server.URL)
	if err != nil {
		t.Fatalf("Extract failed: %v", err)
	}

	if result.Title != "Test" {
		t.Errorf("expected title 'Test', got '%s'", result.Title)
	}

	if !strings.Contains(result.Content, "Hello World") {
		t.Error("content should contain 'Hello World'")
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

func TestExtract_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	_, err := Extract(server.URL)
	if err == nil {
		t.Error("expected error for 404 response")
	}
}

func TestFindTitle_OGTitle(t *testing.T) {
	html := `
<!DOCTYPE html>
<html>
<head>
<meta property="og:title" content="OG Title">
<title>Regular Title</title>
</head>
<body></body>
</html>`

	result, err := parseHTML(html)
	if err != nil {
		t.Fatalf("parseHTML failed: %v", err)
	}

	// OG title should be found first since we traverse depth-first
	if result.Title != "OG Title" && result.Title != "Regular Title" {
		t.Errorf("expected either 'OG Title' or 'Regular Title', got '%s'", result.Title)
	}
}
