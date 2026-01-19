#!/bin/bash
# Test FSRS hook functionality

BASE_URL="http://127.0.0.1:8090/api"

echo "Testing FSRS Hook..."
echo ""

# Step 1: Create a test document
echo "1. Creating test document..."
DOC_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/documents/records" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "FSRS Test Document",
        "content": "Test content for FSRS verification.",
        "source_type": "paste",
        "word_count": 5
    }')
DOC_ID=$(echo "$DOC_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Document ID: $DOC_ID"

# Step 2: Create a test question
echo "2. Creating test question..."
Q_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/questions/records" \
    -H "Content-Type: application/json" \
    -d "{
        \"document\": \"$DOC_ID\",
        \"question_text\": \"What is being tested?\",
        \"question_type\": \"multiple_choice\",
        \"comprehension_type\": \"factual_recall\",
        \"correct_answer\": \"A\",
        \"rationale\": \"This tests the FSRS hook.\"
    }")
Q_ID=$(echo "$Q_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Question ID: $Q_ID"

# Step 3: Create a question attempt with rating
echo "3. Creating question attempt with rating=3 (Good)..."
ATTEMPT_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/question_attempts/records" \
    -H "Content-Type: application/json" \
    -d "{
        \"question\": \"$Q_ID\",
        \"user_answer\": \"A\",
        \"is_correct\": true,
        \"rating\": 3
    }")
ATTEMPT_ID=$(echo "$ATTEMPT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Attempt ID: $ATTEMPT_ID"

# Step 4: Fetch the attempt and verify FSRS fields were populated
echo "4. Verifying FSRS fields were calculated..."
sleep 1  # Give hook time to run

FETCH_RESPONSE=$(curl -s "$BASE_URL/collections/question_attempts/records/$ATTEMPT_ID")

# Check for FSRS fields
STABILITY=$(echo "$FETCH_RESPONSE" | grep -o '"stability":[0-9.]*' | cut -d':' -f2)
DIFFICULTY=$(echo "$FETCH_RESPONSE" | grep -o '"difficulty":[0-9.]*' | cut -d':' -f2)
DUE_AT=$(echo "$FETCH_RESPONSE" | grep -o '"due_at":"[^"]*"' | cut -d'"' -f4)
STATE=$(echo "$FETCH_RESPONSE" | grep -o '"state":[0-9]*' | cut -d':' -f2)
REPS=$(echo "$FETCH_RESPONSE" | grep -o '"reps":[0-9]*' | cut -d':' -f2)

echo ""
echo "   FSRS Values:"
echo "   - stability: $STABILITY"
echo "   - difficulty: $DIFFICULTY"
echo "   - state: $STATE"
echo "   - reps: $REPS"
echo "   - due_at: $DUE_AT"

# Cleanup
echo ""
echo "5. Cleaning up test data..."
curl -s -X DELETE "$BASE_URL/collections/question_attempts/records/$ATTEMPT_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/collections/questions/records/$Q_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/collections/documents/records/$DOC_ID" > /dev/null
echo "   ✅ Test data cleaned up"

# Verify
echo ""
if [ -n "$STABILITY" ] && [ -n "$DUE_AT" ]; then
    echo "=========================================="
    echo "✅ FSRS Hook is working correctly!"
    echo "=========================================="
    exit 0
else
    echo "=========================================="
    echo "❌ FSRS Hook did not populate fields"
    echo "   Check pb_hooks/fsrs.pb.js is loaded"
    echo "=========================================="
    exit 1
fi
