package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ramtinJ95/fastreader-extract/internal/url"
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
	rootCmd.PersistentFlags().StringVarP(&outputFormat, "output", "o", "json", "Output format (json or text)")
	rootCmd.PersistentFlags().StringVarP(&customTitle, "title", "t", "", "Custom title for the document")
	rootCmd.AddCommand(urlCmd)
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
