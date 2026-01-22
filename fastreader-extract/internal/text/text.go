package text

import (
	"regexp"
	"strings"
)

// CleanText normalizes whitespace in text by collapsing multiple spaces/tabs,
// limiting consecutive newlines to 2, and trimming each line.
func CleanText(text string) string {
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
