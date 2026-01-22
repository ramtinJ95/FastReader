# Phase 4: Text Extraction - Implementation Guide

**Phase Goal**: Enable users to import content from PDFs and URLs into FastReader.

**Prerequisites**: Phases 1-3 completed (PocketBase running, FastReader with quiz UI working).

---

## Overview

This phase builds a standalone Go CLI (`fastreader-extract`) that extracts text from PDFs and URLs, plus integrates import functionality into the FastReader UI.

**Components to build:**
1. `fastreader-extract` - Go CLI binary
2. FastReader Import UI - React components for URL/PDF import

**End result**: Users can click "Import" in FastReader, provide a URL or PDF file, and start reading the extracted content.

---

## Task 1: Project Setup for fastreader-extract [COMPLETED]

### 1.1 Create Directory Structure

```bash
mkdir -p fastreader-extract/cmd/fastreader-extract
mkdir -p fastreader-extract/internal/pdf
mkdir -p fastreader-extract/internal/url
cd fastreader-extract
```

### 1.2 Initialize Go Module

```bash
go mod init github.com/yourusername/fastreader-extract
```

### 1.3 Create Main Entry Point

Create `cmd/fastreader-extract/main.go`:

```go
package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// Output represents the JSON output format
type Output struct {
	Title      string `json:"title"`
	Content    string `json:"content"`
	WordCount  int    `json:"word_count"`
	SourceType string `json:"source_type"`
	SourcePath string `json:"source_path"`
}

var (
	outputFormat string
	customTitle  string
)

var rootCmd = &cobra.Command{
	Use:   "fastreader-extract",
	Short: "Extract text from PDFs and URLs for FastReader",
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&outputFormat, "output", "o", "json", "Output format (json or text)")
	rootCmd.PersistentFlags().StringVarP(&customTitle, "title", "t", "", "Custom title for the document")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func printOutput(out Output) error {
	if outputFormat == "text" {
		fmt.Printf("Title: %s\nWord Count: %d\n\n%s\n", out.Title, out.WordCount, out.Content)
		return nil
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(out)
}

func countWords(text string) int {
	if text == "" {
		return 0
	}
	words := 0
	inWord := false
	for _, r := range text {
		if r == ' ' || r == '\n' || r == '\t' || r == '\r' {
			inWord = false
		} else if !inWord {
			inWord = true
			words++
		}
	}
	return words
}
```

### 1.4 Add Dependencies

```bash
go get github.com/spf13/cobra
```

### 1.5 Create Makefile

Create `Makefile`:

```makefile
BINARY_NAME=fastreader-extract
VERSION?=0.1.0

.PHONY: build test clean

build:
	go build -o bin/$(BINARY_NAME) ./cmd/fastreader-extract

test:
	go test -v ./...

clean:
	rm -rf bin/

install: build
	cp bin/$(BINARY_NAME) /usr/local/bin/

# Cross-compilation targets
build-all:
	GOOS=linux GOARCH=amd64 go build -o bin/$(BINARY_NAME)-linux-amd64 ./cmd/fastreader-extract
	GOOS=linux GOARCH=arm64 go build -o bin/$(BINARY_NAME)-linux-arm64 ./cmd/fastreader-extract
	GOOS=darwin GOARCH=amd64 go build -o bin/$(BINARY_NAME)-darwin-amd64 ./cmd/fastreader-extract
	GOOS=darwin GOARCH=arm64 go build -o bin/$(BINARY_NAME)-darwin-arm64 ./cmd/fastreader-extract
	GOOS=windows GOARCH=amd64 go build -o bin/$(BINARY_NAME)-windows-amd64.exe ./cmd/fastreader-extract
```

### Verification

```bash
make build
./bin/fastreader-extract --help
```

**Expected output**: Help text showing available commands and flags.

---

## Task 2: URL Extraction [COMPLETED]

### 2.1 Create URL Extractor

Create `internal/url/extractor.go`:

```go
package url

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/net/html"
)

type ExtractResult struct {
	Title   string
	Content string
}

// Extract fetches a URL and extracts readable text content
func Extract(urlStr string) (*ExtractResult, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	// Set a browser-like User-Agent to avoid blocks
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; FastReader/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	return parseHTML(string(body))
}

func parseHTML(htmlContent string) (*ExtractResult, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("parsing HTML: %w", err)
	}

	result := &ExtractResult{}

	// Extract title
	result.Title = findTitle(doc)

	// Extract main content
	result.Content = extractText(doc)

	return result, nil
}

func findTitle(n *html.Node) string {
	if n.Type == html.ElementNode && n.Data == "title" {
		if n.FirstChild != nil {
			return strings.TrimSpace(n.FirstChild.Data)
		}
	}

	// Check og:title meta tag
	if n.Type == html.ElementNode && n.Data == "meta" {
		var property, content string
		for _, attr := range n.Attr {
			if attr.Key == "property" && attr.Val == "og:title" {
				property = attr.Val
			}
			if attr.Key == "content" {
				content = attr.Val
			}
		}
		if property == "og:title" && content != "" {
			return content
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if title := findTitle(c); title != "" {
			return title
		}
	}
	return ""
}

func extractText(n *html.Node) string {
	var sb strings.Builder
	extractTextRecursive(n, &sb)

	// Clean up the text
	text := sb.String()
	text = cleanText(text)

	return text
}

func extractTextRecursive(n *html.Node, sb *strings.Builder) {
	// Skip non-content elements
	if n.Type == html.ElementNode {
		switch n.Data {
		case "script", "style", "nav", "header", "footer", "aside", "noscript":
			return
		}
	}

	if n.Type == html.TextNode {
		text := strings.TrimSpace(n.Data)
		if text != "" {
			sb.WriteString(text)
			sb.WriteString(" ")
		}
	}

	// Add paragraph breaks for block elements
	if n.Type == html.ElementNode {
		switch n.Data {
		case "p", "div", "article", "section", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br":
			sb.WriteString("\n\n")
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractTextRecursive(c, sb)
	}
}

func cleanText(text string) string {
	// Collapse multiple whitespace
	spaceRegex := regexp.MustCompile(`[ \t]+`)
	text = spaceRegex.ReplaceAllString(text, " ")

	// Collapse multiple newlines
	newlineRegex := regexp.MustCompile(`\n{3,}`)
	text = newlineRegex.ReplaceAllString(text, "\n\n")

	// Trim each line
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	text = strings.Join(lines, "\n")

	return strings.TrimSpace(text)
}
```

### 2.2 Add URL Command

Add to `cmd/fastreader-extract/main.go` (add this before `main()`):

```go
var urlCmd = &cobra.Command{
	Use:   "url [URL]",
	Short: "Extract text from a web URL",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		urlStr := args[0]

		result, err := url.Extract(urlStr)
		if err != nil {
			return fmt.Errorf("extracting from URL: %w", err)
		}

		title := result.Title
		if customTitle != "" {
			title = customTitle
		}

		out := Output{
			Title:      title,
			Content:    result.Content,
			WordCount:  countWords(result.Content),
			SourceType: "url",
			SourcePath: urlStr,
		}

		return printOutput(out)
	},
}

func init() {
	rootCmd.AddCommand(urlCmd)
	// ... existing init code
}
```

Add the import at the top:
```go
import (
	"github.com/yourusername/fastreader-extract/internal/url"
	// ... other imports
)
```

### 2.3 Add Dependency

```bash
go get golang.org/x/net/html
```

### 2.4 Create URL Extractor Tests

Create `internal/url/extractor_test.go`:

```go
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
```

### Verification

```bash
go mod tidy
make test
make build
./bin/fastreader-extract url "https://example.com"
```

**Expected output**: JSON with title, content, word_count, source_type, and source_path.

---

## Task 3: PDF Extraction [COMPLETED]

### 3.1 Add PDF Library

```bash
go get github.com/ledongthuc/pdf
```

### 3.2 Create PDF Extractor

Create `internal/pdf/extractor.go`:

```go
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
```

### 3.3 Add PDF Command

Add to `cmd/fastreader-extract/main.go`:

```go
var pdfCmd = &cobra.Command{
	Use:   "pdf [FILE]",
	Short: "Extract text from a PDF file",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		filePath := args[0]

		result, err := pdf.Extract(filePath)
		if err != nil {
			return fmt.Errorf("extracting from PDF: %w", err)
		}

		title := result.Title
		if customTitle != "" {
			title = customTitle
		}

		out := Output{
			Title:      title,
			Content:    result.Content,
			WordCount:  countWords(result.Content),
			SourceType: "file",
			SourcePath: filePath,
		}

		return printOutput(out)
	},
}

func init() {
	rootCmd.AddCommand(pdfCmd)
	// ... existing init code
}
```

Add the import:
```go
import (
	"github.com/yourusername/fastreader-extract/internal/pdf"
	// ... other imports
)
```

### 3.4 Create PDF Extractor Tests

Create `internal/pdf/extractor_test.go`:

```go
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
```

### Verification

```bash
make test
make build
# Test with a sample PDF
./bin/fastreader-extract pdf /path/to/sample.pdf
```

**Expected output**: JSON with extracted text content from the PDF.

---

## Task 4: FastReader Import UI [COMPLETED]

### 4.1 Create Import Service

Create `src/services/importService.ts` in the FastReader project:

```typescript
import PocketBase from 'pocketbase';

const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'
);

interface ExtractResult {
  title: string;
  content: string;
  word_count: number;
  source_type: 'url' | 'file';
  source_path: string;
}

interface ImportResult {
  documentId: string;
  sessionId: string;
  title: string;
  wordCount: number;
}

/**
 * Import a document from extracted content
 */
export async function importDocument(
  extraction: ExtractResult
): Promise<ImportResult> {
  // Create document in PocketBase
  const document = await pb.collection('documents').create({
    title: extraction.title,
    content: extraction.content,
    source_type: extraction.source_type,
    source_path: extraction.source_path,
    file_type: extraction.source_type === 'file' ? 'pdf' : undefined,
    word_count: extraction.word_count,
  });

  // Create session for the document
  const session = await pb.collection('sessions').create({
    document: document.id,
    current_word_index: 0,
    total_words: extraction.word_count,
    progress_percent: 0,
    wpm_setting: 300,
    chunk_size: 1,
    is_active: true,
  });

  return {
    documentId: document.id,
    sessionId: session.id,
    title: extraction.title,
    wordCount: extraction.word_count,
  };
}

/**
 * Extract text from a URL using the backend extractor
 * For browser-based extraction (simpler approach)
 */
export async function extractFromUrl(url: string): Promise<ExtractResult> {
  // Option 1: Use a proxy endpoint on PocketBase (if configured)
  // Option 2: Call fastreader-extract via Electron/Tauri shell
  // Option 3: Use a simple fetch + DOM parser for basic extraction

  // Simple browser-based extraction:
  const response = await fetch(url);
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract title
  const title = doc.querySelector('title')?.textContent?.trim()
    || doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    || 'Untitled';

  // Extract content (remove scripts, styles, nav, etc.)
  const elementsToRemove = doc.querySelectorAll(
    'script, style, nav, header, footer, aside, noscript'
  );
  elementsToRemove.forEach(el => el.remove());

  const content = doc.body?.textContent?.trim() || '';
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    title,
    content: cleanText(content),
    word_count: wordCount,
    source_type: 'url',
    source_path: url,
  };
}

/**
 * Read a text/markdown file
 */
export async function extractFromTextFile(file: File): Promise<ExtractResult> {
  const content = await file.text();
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    title: file.name.replace(/\.(txt|md)$/, ''),
    content: content.trim(),
    word_count: wordCount,
    source_type: 'file',
    source_path: file.name,
  };
}

function cleanText(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}
```

### 4.2 Create Import Modal Component

Create `src/components/ImportModal.tsx`:

```tsx
import { useState } from 'react';
import { extractFromUrl, extractFromTextFile, importDocument } from '../services/importService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (documentId: string, sessionId: string) => void;
}

type ImportTab = 'url' | 'file' | 'paste';

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('url');
  const [url, setUrl] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUrlImport = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extraction = await extractFromUrl(url);
      const result = await importDocument(extraction);
      onImportComplete(result.documentId, result.sessionId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const extraction = await extractFromTextFile(file);
      const result = await importDocument(extraction);
      onImportComplete(result.documentId, result.sessionId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteImport = async () => {
    if (!pasteContent.trim()) {
      setError('Please enter some content');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const content = pasteContent.trim();
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

      const result = await importDocument({
        title: pasteTitle.trim() || 'Untitled',
        content,
        word_count: wordCount,
        source_type: 'paste' as any,
        source_path: '',
      });

      onImportComplete(result.documentId, result.sessionId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Document</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="import-tabs">
          <button
            className={activeTab === 'url' ? 'active' : ''}
            onClick={() => setActiveTab('url')}
          >
            From URL
          </button>
          <button
            className={activeTab === 'file' ? 'active' : ''}
            onClick={() => setActiveTab('file')}
          >
            From File
          </button>
          <button
            className={activeTab === 'paste' ? 'active' : ''}
            onClick={() => setActiveTab('paste')}
          >
            Paste Text
          </button>
        </div>

        <div className="import-content">
          {activeTab === 'url' && (
            <div className="import-url">
              <label htmlFor="url-input">Article URL</label>
              <input
                id="url-input"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <button
                className="import-button"
                onClick={handleUrlImport}
                disabled={isLoading}
              >
                {isLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="import-file">
              <label htmlFor="file-input">Select a text file (.txt, .md)</label>
              <input
                id="file-input"
                type="file"
                accept=".txt,.md"
                onChange={handleFileImport}
                disabled={isLoading}
              />
              <p className="file-note">
                For PDF files, use the <code>fastreader-extract</code> CLI tool.
              </p>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="import-paste">
              <label htmlFor="title-input">Title (optional)</label>
              <input
                id="title-input"
                type="text"
                placeholder="Document title"
                value={pasteTitle}
                onChange={e => setPasteTitle(e.target.value)}
                disabled={isLoading}
              />
              <label htmlFor="content-input">Content</label>
              <textarea
                id="content-input"
                placeholder="Paste your text here..."
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                disabled={isLoading}
                rows={10}
              />
              <button
                className="import-button"
                onClick={handlePasteImport}
                disabled={isLoading}
              >
                {isLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
}
```

### 4.3 Create Import Modal Styles

Create `src/components/ImportModal.css`:

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-color, #fff);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.import-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.import-tabs button {
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-secondary, #666);
  border-bottom: 2px solid transparent;
}

.import-tabs button.active {
  color: var(--primary-color, #2563eb);
  border-bottom-color: var(--primary-color, #2563eb);
}

.import-content {
  padding: 20px;
}

.import-url,
.import-file,
.import-paste {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-content label {
  font-size: 0.9rem;
  font-weight: 500;
}

.import-content input[type="url"],
.import-content input[type="text"] {
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 1rem;
}

.import-content textarea {
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  font-family: inherit;
}

.import-button {
  padding: 10px 20px;
  background: var(--primary-color, #2563eb);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 8px;
}

.import-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-note {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
  margin: 0;
}

.file-note code {
  background: var(--code-bg, #f0f0f0);
  padding: 2px 6px;
  border-radius: 3px;
}

.error-message {
  color: var(--error-color, #dc2626);
  font-size: 0.9rem;
  margin-top: 12px;
  padding: 10px;
  background: var(--error-bg, #fef2f2);
  border-radius: 4px;
}
```

### 4.4 Integrate Import Modal into App

Update your main App component to include the import functionality:

```tsx
// In your main App.tsx or Reader component
import { useState } from 'react';
import { ImportModal } from './components/ImportModal';
import './components/ImportModal.css';

function App() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleImportComplete = (documentId: string, sessionId: string) => {
    setCurrentDocumentId(documentId);
    setCurrentSessionId(sessionId);
    // Navigate to reader or refresh session
  };

  return (
    <div className="app">
      <header>
        <h1>FastReader</h1>
        <button onClick={() => setShowImportModal(true)}>
          Import
        </button>
      </header>

      {/* Your existing reader content */}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
```

### Verification

1. Start PocketBase: `./pocketbase serve`
2. Start FastReader dev server: `npm run dev`
3. Click "Import" button
4. Test each tab:
   - **URL**: Enter a URL and verify content is extracted
   - **File**: Upload a .txt file and verify it imports
   - **Paste**: Enter text and verify document is created
5. Check PocketBase admin UI (`http://localhost:8090/_/`) to verify documents and sessions are created

---

## Task 5: Integration Testing

### 5.1 Create CLI Integration Test Script

Create `fastreader-extract/test_integration.sh`:

```bash
#!/bin/bash
set -e

echo "=== FastReader Extract Integration Tests ==="

# Build the binary
echo "Building..."
make build

# Test URL extraction
echo ""
echo "Testing URL extraction..."
./bin/fastreader-extract url "https://example.com" > /tmp/url_test.json
if jq -e '.title' /tmp/url_test.json > /dev/null; then
    echo "  ✓ URL extraction produced valid JSON with title"
else
    echo "  ✗ URL extraction failed"
    exit 1
fi

if jq -e '.word_count > 0' /tmp/url_test.json > /dev/null; then
    echo "  ✓ Word count is positive"
else
    echo "  ✗ Word count should be positive"
    exit 1
fi

# Test custom title
echo ""
echo "Testing custom title..."
./bin/fastreader-extract url "https://example.com" --title "Custom Title" > /tmp/custom_title.json
TITLE=$(jq -r '.title' /tmp/custom_title.json)
if [ "$TITLE" = "Custom Title" ]; then
    echo "  ✓ Custom title works"
else
    echo "  ✗ Custom title not applied"
    exit 1
fi

# Test text output format
echo ""
echo "Testing text output format..."
./bin/fastreader-extract url "https://example.com" --output text > /tmp/text_output.txt
if grep -q "Title:" /tmp/text_output.txt; then
    echo "  ✓ Text output format works"
else
    echo "  ✗ Text output format failed"
    exit 1
fi

# Test error handling
echo ""
echo "Testing error handling..."
if ./bin/fastreader-extract pdf /nonexistent/file.pdf 2>&1 | grep -q "not found\|error"; then
    echo "  ✓ Error handling for missing files works"
else
    echo "  ✗ Error handling failed"
    exit 1
fi

echo ""
echo "=== All integration tests passed ==="
```

Make it executable:
```bash
chmod +x test_integration.sh
```

### 5.2 Run All Tests

```bash
# In fastreader-extract directory
make test
./test_integration.sh
```

### Verification

All tests should pass with green checkmarks.

---

## End-to-End Validation

After completing all tasks, verify the entire phase works together:

### Validation Checklist

1. **CLI Tool**
   ```bash
   cd fastreader-extract
   make build
   ./bin/fastreader-extract url "https://en.wikipedia.org/wiki/Speed_reading" | jq .
   ```
   - [ ] JSON output with title, content, word_count
   - [ ] Content is readable text (not HTML)

2. **PocketBase Running**
   ```bash
   ./pocketbase serve
   ```
   - [ ] Accessible at http://localhost:8090
   - [ ] Admin UI at http://localhost:8090/_/

3. **FastReader Import UI**
   - [ ] Import modal opens when clicking "Import"
   - [ ] URL tab: Can enter URL and import article
   - [ ] File tab: Can upload .txt file
   - [ ] Paste tab: Can paste text and set title
   - [ ] After import, document appears in PocketBase
   - [ ] Reading session is created automatically

4. **Full Flow Test**
   1. Open FastReader
   2. Click "Import"
   3. Enter a URL (e.g., a Wikipedia article)
   4. Click "Import"
   5. Verify document loads in reader
   6. Start RSVP reading
   7. Verify progress is tracked

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS errors when fetching URLs | Use a CORS proxy or the CLI tool instead |
| PDF extraction fails | Ensure `github.com/ledongthuc/pdf` is installed |
| PocketBase connection refused | Start PocketBase with `./pocketbase serve` |
| Import modal not styled | Ensure CSS file is imported in component |

---

## Deliverables

After completing Phase 4, you should have:

1. **`fastreader-extract` CLI binary** that can:
   - Extract text from URLs
   - Extract text from PDF files
   - Output JSON or plain text
   - Accept custom titles

2. **FastReader Import UI** that:
   - Provides URL import
   - Provides file import (.txt, .md)
   - Provides paste functionality
   - Creates documents and sessions in PocketBase
   - Shows loading and error states

3. **Tests** covering:
   - URL extraction logic
   - PDF extraction logic
   - Text cleaning utilities
   - Integration tests via shell script
