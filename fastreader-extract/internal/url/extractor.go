package url

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ramtinJ95/fastreader-extract/internal/text"
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
	return text.CleanText(sb.String())
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
