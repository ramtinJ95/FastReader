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
