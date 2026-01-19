#!/bin/bash
# Verify all collections exist with correct fields

BASE_URL="http://127.0.0.1:8090/api"
COLLECTIONS=("documents" "sessions" "questions" "question_attempts" "session_milestones")
ALL_PASSED=true

echo "Verifying PocketBase collections..."
echo ""

for collection in "${COLLECTIONS[@]}"; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/collections/$collection/records?perPage=1")

    if [ "$RESPONSE" = "200" ]; then
        echo "✅ Collection '$collection' exists and is accessible"
    else
        echo "❌ Collection '$collection' returned HTTP $RESPONSE"
        ALL_PASSED=false
    fi
done

echo ""

# Test creating a document
echo "Testing document creation..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/documents/records" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Test Document",
        "content": "This is a test document for verification.",
        "source_type": "paste",
        "word_count": 7
    }')

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    DOC_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ Document created successfully (ID: $DOC_ID)"

    # Clean up test document
    curl -s -X DELETE "$BASE_URL/collections/documents/records/$DOC_ID" > /dev/null
    echo "✅ Test document cleaned up"
else
    echo "❌ Failed to create document"
    echo "Response: $CREATE_RESPONSE"
    ALL_PASSED=false
fi

echo ""

if [ "$ALL_PASSED" = true ]; then
    echo "=========================================="
    echo "✅ All collection verifications passed!"
    echo "=========================================="
    exit 0
else
    echo "=========================================="
    echo "❌ Some verifications failed"
    echo "=========================================="
    exit 1
fi
