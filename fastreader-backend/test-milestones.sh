#!/bin/bash
# Test milestone detection hook

BASE_URL="http://127.0.0.1:8090/api"

echo "Testing Milestone Detection Hook..."
echo ""

# Step 1: Create a test document
echo "1. Creating test document..."
DOC_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/documents/records" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Milestone Test Document",
        "content": "Test content for milestone verification.",
        "source_type": "paste",
        "word_count": 100
    }')
DOC_ID=$(echo "$DOC_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Document ID: $DOC_ID"

# Step 2: Create a session with 0% progress
echo "2. Creating session with 0% progress..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/sessions/records" \
    -H "Content-Type: application/json" \
    -d "{
        \"document\": \"$DOC_ID\",
        \"current_word_index\": 0,
        \"total_words\": 100,
        \"progress_percent\": 0,
        \"wpm_setting\": 300,
        \"is_active\": true
    }")
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Session ID: $SESSION_ID"

# Step 3: Update progress to 30% (should trigger 25% milestone)
echo "3. Updating progress to 30%..."
curl -s -X PATCH "$BASE_URL/collections/sessions/records/$SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"progress_percent": 30, "current_word_index": 30}' > /dev/null

sleep 1  # Give hook time to run

# Step 4: Check for milestones
echo "4. Checking for 25% milestone..."
MILESTONES=$(curl -s "$BASE_URL/collections/session_milestones/records?filter=session=\"$SESSION_ID\"")
MILESTONE_25=$(echo "$MILESTONES" | grep -o '"milestone_percent":25')

if [ -n "$MILESTONE_25" ]; then
    echo "   ✅ 25% milestone created"
else
    echo "   ❌ 25% milestone NOT created"
fi

# Step 5: Update to 55% (should trigger 50% milestone)
echo "5. Updating progress to 55%..."
curl -s -X PATCH "$BASE_URL/collections/sessions/records/$SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"progress_percent": 55, "current_word_index": 55}' > /dev/null

sleep 1

# Step 6: Verify both milestones
echo "6. Verifying milestones..."
MILESTONES=$(curl -s "$BASE_URL/collections/session_milestones/records?filter=session=\"$SESSION_ID\"")
TOTAL_MILESTONES=$(echo "$MILESTONES" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
echo "   Total milestones created: $TOTAL_MILESTONES"

# Cleanup
echo ""
echo "7. Cleaning up test data..."

# Delete milestones first (they reference session)
MILESTONE_IDS=$(echo "$MILESTONES" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
for MID in $MILESTONE_IDS; do
    curl -s -X DELETE "$BASE_URL/collections/session_milestones/records/$MID" > /dev/null
done

curl -s -X DELETE "$BASE_URL/collections/sessions/records/$SESSION_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/collections/documents/records/$DOC_ID" > /dev/null
echo "   ✅ Test data cleaned up"

# Final result
echo ""
if [ "$TOTAL_MILESTONES" -ge "2" ]; then
    echo "=========================================="
    echo "✅ Milestone Hook is working correctly!"
    echo "=========================================="
    exit 0
else
    echo "=========================================="
    echo "❌ Milestone Hook did not create milestones"
    echo "   Check pb_hooks/sessions.pb.js is loaded"
    echo "=========================================="
    exit 1
fi
