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
