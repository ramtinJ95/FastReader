package text

import "testing"

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
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "only whitespace",
			input:    "   \n\n   ",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CleanText(tt.input)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}
