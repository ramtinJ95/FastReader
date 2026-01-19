# FastReader Comprehension Feature - Phase 1 Implementation Guide

**Version:** 1.0.0
**Phase:** Foundation
**Goal:** PocketBase + basic question storage with real-time sync

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Directory Structure](#3-directory-structure)
4. [Task 1: PocketBase Setup](#4-task-1-pocketbase-setup)
5. [Task 2: Create Database Collections](#5-task-2-create-database-collections)
6. [Task 3: FSRS JavaScript Hook](#6-task-3-fsrs-javascript-hook)
7. [Task 4: Session Milestone Hook](#7-task-4-session-milestone-hook)
8. [Task 5: MCP Server Foundation](#8-task-5-mcp-server-foundation)
9. [Task 6: FastReader PocketBase Client](#9-task-6-fastreader-pocketbase-client)
10. [Task 7: SSE Subscriptions](#10-task-7-sse-subscriptions)
11. [Task 8: Document Persistence](#11-task-8-document-persistence)
12. [Phase 1 Integration Testing](#12-phase-1-integration-testing)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

### 1.1 What We're Building

Phase 1 establishes the foundation for the comprehension feature:

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Machine                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐        HTTP + SSE       ┌───────────────┐  │
│  │  FastReader     │◄───────────────────────►│  PocketBase   │  │
│  │  (React SPA)    │     localhost:8090      │               │  │
│  │                 │                         │  ┌─────────┐  │  │
│  │  - RSVP Display │                         │  │pb_hooks/│  │  │
│  │  - SSE Client   │                         │  │ fsrs.js │  │  │
│  │  - PB Client    │                         │  └─────────┘  │  │
│  └────────┬────────┘                         │               │  │
│           │                                  │  ┌─────────┐  │  │
│           │ spawns (future)                  │  │ SQLite  │  │  │
│           ▼                                  │  │ data.db │  │  │
│  ┌─────────────────┐      stdio              │  └─────────┘  │  │
│  │  AI CLI         │◄────────────────────────┤               │  │
│  │  (claude/codex) │      MCP Server         └───────────────┘  │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Phase 1 Deliverables

By the end of this phase:
- [ ] PocketBase running locally with all collections created
- [ ] FSRS spaced repetition algorithm implemented as a hook
- [ ] Session milestone detection implemented as a hook
- [ ] MCP server with core tools for AI CLI integration
- [ ] FastReader connected to PocketBase with real-time SSE updates
- [ ] Documents saved to PocketBase instead of just localStorage

### 1.3 Success Criteria

The phase is complete when:
1. A user can paste text in FastReader and it saves to PocketBase
2. An AI CLI can query the current session via MCP tools
3. An AI CLI can save questions via MCP tools
4. FastReader receives the new questions via SSE in real-time
5. FSRS calculations run automatically when question attempts are recorded

---

## 2. Prerequisites

### 2.1 Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | FastReader and MCP server |
| npm | 9+ | Package management |
| Git | 2.30+ | Version control |
| curl | Any | Testing APIs |

### 2.2 Required Knowledge

- Basic TypeScript/JavaScript
- React hooks (useState, useEffect, useCallback)
- REST API concepts (GET, POST, PATCH, DELETE)
- Basic understanding of SQLite (helpful but not required)

### 2.3 Existing Codebase

The FastReader application is a React SPA using:
- **React 18.3** with functional components
- **TypeScript 5.9** in strict mode
- **Vite 5.4** as build tool
- **Vitest** for unit tests
- **Playwright** for E2E tests

Current state management uses React hooks with localStorage for persistence. We'll add PocketBase as the primary data layer while keeping localStorage as a fallback.

---

## 3. Directory Structure

### 3.1 New Directories to Create

```
FastReader/
├── fastreader-backend/          # NEW: PocketBase backend
│   ├── pb_hooks/                # JavaScript hooks
│   │   ├── fsrs.pb.js          # FSRS algorithm
│   │   ├── sessions.pb.js      # Milestone detection
│   │   └── main.pb.js          # Hook registration
│   ├── pb_migrations/           # Schema migrations (auto-generated)
│   └── pb_data/                 # SQLite database (auto-created)
│
├── fastreader-mcp/              # NEW: MCP server
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── tools.ts            # Tool definitions
│   │   └── pocketbase-client.ts # API wrapper
│   ├── package.json
│   └── tsconfig.json
│
└── src/                         # Existing FastReader app
    ├── services/                # NEW: API services
    │   └── pocketbase.ts       # PocketBase client
    ├── contexts/                # NEW: React contexts
    │   └── ComprehensionContext.tsx
    └── types/
        └── comprehension.ts     # NEW: Comprehension types
```

### 3.2 Create Directory Structure

```bash
# From FastReader root directory
mkdir -p fastreader-backend/pb_hooks
mkdir -p fastreader-backend/pb_migrations
mkdir -p fastreader-mcp/src
mkdir -p src/services
mkdir -p src/contexts
```

---

## 4. Task 1: PocketBase Setup

### 4.1 Objective

Download, configure, and verify PocketBase is running correctly.

### 4.2 Steps

#### Step 1.1: Download PocketBase

```bash
# Create backend directory and enter it
cd fastreader-backend

# Download PocketBase (choose your platform)
# Linux AMD64
curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.23.4/pocketbase_0.23.4_linux_amd64.zip -o pocketbase.zip

# Linux ARM64
# curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.23.4/pocketbase_0.23.4_linux_arm64.zip -o pocketbase.zip

# macOS AMD64
# curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.23.4/pocketbase_0.23.4_darwin_amd64.zip -o pocketbase.zip

# macOS ARM64 (Apple Silicon)
# curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.23.4/pocketbase_0.23.4_darwin_arm64.zip -o pocketbase.zip

# Extract
unzip pocketbase.zip
rm pocketbase.zip

# Make executable
chmod +x pocketbase
```

#### Step 1.2: Create Startup Script

Create `fastreader-backend/start.sh`:

```bash
#!/bin/bash
# FastReader PocketBase startup script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting PocketBase for FastReader..."
echo "Admin UI: http://127.0.0.1:8090/_/"
echo "API: http://127.0.0.1:8090/api/"
echo ""
echo "Press Ctrl+C to stop"
echo ""

./pocketbase serve --http="127.0.0.1:8090"
```

```bash
chmod +x start.sh
```

#### Step 1.3: Initial Start and Admin Setup

```bash
# Start PocketBase
./start.sh

# In a new terminal, verify it's running
curl http://127.0.0.1:8090/api/health
# Expected: {"code":200,"message":"API is healthy."}
```

Open `http://127.0.0.1:8090/_/` in your browser and create an admin account:
- Email: `admin@localhost`
- Password: `adminpassword123` (or your choice, keep it simple for local dev)

### 4.3 Verification

Create `fastreader-backend/test-connection.sh`:

```bash
#!/bin/bash
# Test PocketBase connection

echo "Testing PocketBase connection..."

HEALTH=$(curl -s http://127.0.0.1:8090/api/health)

if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ PocketBase is running and healthy"
    exit 0
else
    echo "❌ PocketBase is not responding correctly"
    echo "Response: $HEALTH"
    exit 1
fi
```

```bash
chmod +x test-connection.sh
./test-connection.sh
```

### 4.4 Deliverables

- [x] PocketBase binary downloaded and executable
- [x] `start.sh` script created
- [ ] Admin account created at `http://127.0.0.1:8090/_/` (manual step - visit URL to create)
- [x] Health check passes

---

## 5. Task 2: Create Database Collections

### 5.1 Objective

Create all required collections with proper schema and API rules.

### 5.2 Collection Schemas

We need 5 collections. Create them via the PocketBase Admin UI.

#### Collection 1: `documents`

**Settings:**
- Name: `documents`
- Type: Base collection

**Fields:**

| Field Name | Type | Required | Options/Notes |
|------------|------|----------|---------------|
| title | Text | Yes | Max length: 500 |
| content | Text | Yes | - |
| source_type | Select | Yes | Options: `paste`, `file`, `url` |
| source_path | Text | No | Max length: 2000 |
| file_type | Select | No | Options: `txt`, `md`, `pdf` |
| word_count | Number | Yes | Min: 0 |

**API Rules (all set to empty string for public access):**
- List rule: (empty)
- View rule: (empty)
- Create rule: (empty)
- Update rule: (empty)
- Delete rule: (empty)

#### Collection 2: `sessions`

**Fields:**

| Field Name | Type | Required | Options/Notes |
|------------|------|----------|---------------|
| document | Relation | Yes | → documents (single) |
| current_word_index | Number | No | Default: 0 |
| total_words | Number | Yes | - |
| progress_percent | Number | No | Default: 0 |
| wpm_setting | Number | No | Default: 300 |
| chunk_size | Number | No | Default: 1 |
| is_active | Bool | No | Default: true |
| completed_at | DateTime | No | - |

**API Rules:** All empty (public access)

#### Collection 3: `questions`

**Fields:**

| Field Name | Type | Required | Options/Notes |
|------------|------|----------|---------------|
| document | Relation | Yes | → documents (single) |
| session | Relation | No | → sessions (single) |
| question_text | Text | Yes | - |
| question_type | Select | Yes | `multiple_choice`, `short_answer`, `fill_in_blank` |
| comprehension_type | Select | Yes | `factual_recall`, `inference`, `synthesis` |
| difficulty | Select | No | `easy`, `medium`, `hard` |
| options | JSON | No | For MCQ: `{"A":"...","B":"...","C":"...","D":"..."}` |
| correct_answer | Text | Yes | - |
| distractor_explanations | JSON | No | - |
| ideal_answer | Text | No | - |
| acceptable_variations | JSON | No | Array of strings |
| required_concepts | JSON | No | Array of strings |
| scoring_rubric | JSON | No | - |
| sentence_with_blank | Text | No | - |
| correct_answers | JSON | No | Array for fill-in-blank |
| context_hint | Text | No | - |
| rationale | Text | Yes | - |
| passage_evidence | Text | No | - |
| passage_location | Text | No | - |
| chunk_start_index | Number | No | - |
| chunk_end_index | Number | No | - |

**API Rules:** All empty (public access)

#### Collection 4: `question_attempts`

**Fields:**

| Field Name | Type | Required | Options/Notes |
|------------|------|----------|---------------|
| question | Relation | Yes | → questions (single) |
| user_answer | Text | No | - |
| is_correct | Bool | No | - |
| time_spent_ms | Number | No | - |
| rating | Number | No | 1-4 (FSRS scale) |
| stability | Number | No | FSRS stability |
| difficulty | Number | No | FSRS difficulty (1-10) |
| due_at | DateTime | No | Next review date |
| state | Number | No | 0=New, 1=Learning, 2=Review, 3=Relearning |
| reps | Number | No | Total review count |
| lapses | Number | No | Times forgotten |

**API Rules:** All empty (public access)

#### Collection 5: `session_milestones`

**Fields:**

| Field Name | Type | Required | Options/Notes |
|------------|------|----------|---------------|
| session | Relation | Yes | → sessions (single) |
| milestone_percent | Number | Yes | 25, 50, 75, or 100 |
| quiz_prompted | Bool | No | Default: false |
| quiz_completed | Bool | No | Default: false |

**API Rules:** All empty (public access)

**Unique constraint:** Create index on `session` + `milestone_percent` (optional but recommended)

### 5.3 Steps to Create Collections

1. Open PocketBase Admin UI: `http://127.0.0.1:8090/_/`
2. Click "New collection" for each collection above
3. Add all fields as specified
4. Set all API rules to empty (public access)
5. Save each collection

### 5.4 Verification Script

Create `fastreader-backend/verify-collections.sh`:

```bash
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
```

```bash
chmod +x verify-collections.sh
./verify-collections.sh
```

### 5.5 Deliverables

- [x] All 5 collections created in PocketBase
- [x] All fields added with correct types
- [x] API rules set to public access
- [x] Verification script passes

---

## 6. Task 3: FSRS JavaScript Hook

### 6.1 Objective

Implement the FSRS (Free Spaced Repetition Scheduler) algorithm as a PocketBase hook that automatically calculates review schedules when question attempts are created.

### 6.2 Understanding FSRS

FSRS tracks:
- **Stability**: How long a memory will last (in days)
- **Difficulty**: How hard the item is to learn (1-10)
- **State**: Learning stage (New → Learning → Review → Relearning)
- **Due date**: When to review next

Rating scale:
- 1 (Again): Forgot completely
- 2 (Hard): Recalled with difficulty
- 3 (Good): Recalled correctly
- 4 (Easy): Instant recall

### 6.3 Implementation

Create `fastreader-backend/pb_hooks/fsrs.pb.js`:

```javascript
/// <reference path="../pb_data/types.d.ts" />

/**
 * FSRS (Free Spaced Repetition Scheduler) Implementation
 *
 * This hook automatically calculates spaced repetition values
 * when a question_attempt record is created with a rating.
 */

// FSRS algorithm constants
const DECAY = -0.5;
const FACTOR = 19 / 81;

/**
 * Calculate new stability after review
 * @param {number} d - Current difficulty (1-10)
 * @param {number} s - Current stability (days)
 * @param {number} rating - User rating (1-4)
 * @returns {number} New stability
 */
function nextStability(d, s, rating) {
    if (rating === 1) {
        // Again - memory lapsed, significant decrease
        return Math.max(0.1, s * 0.2);
    }

    const hardPenalty = (rating === 2) ? 1.2 : 1;
    const easyBonus = (rating === 4) ? 1.3 : 1;

    // FSRS formula for stability increase
    return s * (1 + Math.exp(11.0) *
        Math.pow(d, -0.5) *
        (Math.pow(s, -0.2) - 1) *
        hardPenalty * easyBonus);
}

/**
 * Calculate new difficulty after review
 * @param {number} d - Current difficulty (1-10)
 * @param {number} rating - User rating (1-4)
 * @returns {number} New difficulty (clamped 1-10)
 */
function nextDifficulty(d, rating) {
    // Adjust difficulty based on how easy/hard it was
    // Rating 3 (Good) = no change, higher = easier, lower = harder
    const delta = (rating - 3) * 0.5;
    return Math.min(10, Math.max(1, d + delta));
}

/**
 * Calculate interval in days until next review
 * @param {number} s - Stability (days)
 * @param {number} requestedRetention - Target retention rate (0-1)
 * @returns {number} Days until next review
 */
function nextInterval(s, requestedRetention) {
    const interval = Math.round(s * Math.log(requestedRetention) / Math.log(0.9));
    return Math.max(1, interval);
}

/**
 * Determine new learning state
 * @param {number} currentState - Current state (0-3)
 * @param {number} rating - User rating (1-4)
 * @returns {number} New state
 */
function nextState(currentState, rating) {
    // States: 0=New, 1=Learning, 2=Review, 3=Relearning
    if (rating === 1) {
        // Failed - go to Learning or Relearning
        return currentState === 0 ? 1 : 3;
    }
    if (currentState === 0 || currentState === 1) {
        // New or Learning - graduate to Review if Good/Easy
        return rating >= 3 ? 2 : 1;
    }
    if (currentState === 3) {
        // Relearning - graduate back to Review if Good/Easy
        return rating >= 3 ? 2 : 3;
    }
    // Already in Review - stay in Review
    return 2;
}

/**
 * Get the most recent attempt for a question to inherit FSRS values
 * @param {string} questionId - Question ID
 * @param {string} excludeId - Attempt ID to exclude (current one)
 * @returns {object|null} Previous attempt or null
 */
function getPreviousAttempt(questionId, excludeId) {
    try {
        const records = $app.dao().findRecordsByFilter(
            "question_attempts",
            `question = "${questionId}" && id != "${excludeId}"`,
            "-created",
            1,
            0
        );
        return records.length > 0 ? records[0] : null;
    } catch (e) {
        return null;
    }
}

// Hook: After creating a question attempt, calculate FSRS values
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    const rating = record.getInt("rating");

    // Skip if no rating provided
    if (!rating || rating < 1 || rating > 4) {
        console.log(`FSRS: Skipping attempt ${record.id} - no valid rating`);
        return;
    }

    const questionId = record.getString("question");

    // Get previous attempt to inherit FSRS values, or use defaults
    const prevAttempt = getPreviousAttempt(questionId, record.id);

    let stability = prevAttempt ? prevAttempt.getFloat("stability") : 1.0;
    let difficulty = prevAttempt ? prevAttempt.getFloat("difficulty") : 5.0;
    let state = prevAttempt ? prevAttempt.getInt("state") : 0;
    let reps = prevAttempt ? prevAttempt.getInt("reps") : 0;
    let lapses = prevAttempt ? prevAttempt.getInt("lapses") : 0;

    // Handle null/undefined values with defaults
    stability = stability || 1.0;
    difficulty = difficulty || 5.0;
    state = state || 0;
    reps = reps || 0;
    lapses = lapses || 0;

    // Calculate new FSRS values
    const newStability = nextStability(difficulty, stability, rating);
    const newDifficulty = nextDifficulty(difficulty, rating);
    const newState = nextState(state, rating);
    const interval = nextInterval(newStability, 0.9); // 90% retention target

    // Calculate next review date
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + interval);

    // Update counters
    const newReps = reps + 1;
    const newLapses = rating === 1 ? lapses + 1 : lapses;

    // Update the record with FSRS values
    record.set("stability", newStability);
    record.set("difficulty", newDifficulty);
    record.set("state", newState);
    record.set("due_at", dueAt.toISOString());
    record.set("reps", newReps);
    record.set("lapses", newLapses);

    // Save the updated record
    $app.dao().saveRecord(record);

    console.log(`FSRS: Updated attempt ${record.id} - stability: ${newStability.toFixed(2)}, ` +
        `difficulty: ${newDifficulty.toFixed(2)}, state: ${newState}, ` +
        `next review: ${interval} days`);

}, "question_attempts");

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        nextStability,
        nextDifficulty,
        nextInterval,
        nextState
    };
}
```

### 6.4 Verification

Create `fastreader-backend/test-fsrs.sh`:

```bash
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
```

```bash
chmod +x test-fsrs.sh

# Restart PocketBase to load the hook
# (Ctrl+C the running instance, then ./start.sh again)

./test-fsrs.sh
```

### 6.5 Deliverables

- [x] `pb_hooks/fsrs.pb.js` created with FSRS algorithm
- [x] PocketBase restarted to load hook
- [x] Test script verifies FSRS fields are calculated
- [x] Console shows FSRS calculation logs

---

## 7. Task 4: Session Milestone Hook

### 7.1 Objective

Automatically detect reading milestones (25%, 50%, 75%, 100%) and create milestone records for quiz prompts.

### 7.2 Implementation

Create `fastreader-backend/pb_hooks/sessions.pb.js`:

```javascript
/// <reference path="../pb_data/types.d.ts" />

/**
 * Session Milestone Detection Hook
 *
 * Automatically creates milestone records when a session's
 * progress crosses 25%, 50%, 75%, or 100% thresholds.
 */

const MILESTONES = [25, 50, 75, 100];

/**
 * Check if a milestone record already exists
 * @param {string} sessionId - Session ID
 * @param {number} milestonePercent - Milestone percentage
 * @returns {boolean} True if exists
 */
function milestoneExists(sessionId, milestonePercent) {
    try {
        const records = $app.dao().findRecordsByFilter(
            "session_milestones",
            `session = "${sessionId}" && milestone_percent = ${milestonePercent}`,
            "",
            1,
            0
        );
        return records.length > 0;
    } catch (e) {
        return false;
    }
}

/**
 * Create a new milestone record
 * @param {string} sessionId - Session ID
 * @param {number} milestonePercent - Milestone percentage
 */
function createMilestone(sessionId, milestonePercent) {
    try {
        const collection = $app.dao().findCollectionByNameOrId("session_milestones");
        const record = new Record(collection);

        record.set("session", sessionId);
        record.set("milestone_percent", milestonePercent);
        record.set("quiz_prompted", false);
        record.set("quiz_completed", false);

        $app.dao().saveRecord(record);

        console.log(`Milestone: Created ${milestonePercent}% milestone for session ${sessionId}`);
    } catch (e) {
        console.log(`Milestone: Error creating milestone - ${e.message}`);
    }
}

// Hook: After updating a session, check for new milestones
onRecordAfterUpdateSuccess((e) => {
    const session = e.record;
    const progress = session.getFloat("progress_percent");
    const sessionId = session.id;

    if (!progress || progress <= 0) {
        return;
    }

    // Check each milestone threshold
    for (const milestone of MILESTONES) {
        if (progress >= milestone && !milestoneExists(sessionId, milestone)) {
            createMilestone(sessionId, milestone);
        }
    }
}, "sessions");

// Hook: Also check on session creation (in case created with progress > 0)
onRecordAfterCreateSuccess((e) => {
    const session = e.record;
    const progress = session.getFloat("progress_percent");
    const sessionId = session.id;

    if (!progress || progress <= 0) {
        return;
    }

    // Check each milestone threshold
    for (const milestone of MILESTONES) {
        if (progress >= milestone && !milestoneExists(sessionId, milestone)) {
            createMilestone(sessionId, milestone);
        }
    }
}, "sessions");
```

### 7.3 Verification

Create `fastreader-backend/test-milestones.sh`:

```bash
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
```

```bash
chmod +x test-milestones.sh
# Restart PocketBase to load hooks, then:
./test-milestones.sh
```

### 7.4 Deliverables

- [x] `pb_hooks/sessions.pb.js` created
- [ ] PocketBase restarted to load hook (manual step - restart PocketBase to load)
- [ ] Test script verifies milestones are created at thresholds (run after PocketBase restart)

---

## 8. Task 5: MCP Server Foundation

### 8.1 Objective

Create the MCP (Model Context Protocol) server that allows AI coding assistants to interact with FastReader data.

### 8.2 Initialize MCP Server Package

```bash
cd fastreader-mcp

# Initialize package.json
cat > package.json << 'EOF'
{
  "name": "@anthropic/fastreader-mcp",
  "version": "1.0.0",
  "description": "MCP server for FastReader comprehension feature",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "fastreader-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "node --test dist/**/*.test.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "pocketbase": "^0.21.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Install dependencies
npm install
```

### 8.3 Create Tool Definitions

Create `fastreader-mcp/src/tools.ts`:

```typescript
/**
 * MCP Tool Definitions for FastReader
 */

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const tools: Tool[] = [
  {
    name: "fastreader_get_current_session",
    description: `Get the current active reading session from FastReader.
Returns the session state, full document text, reading progress, and any pending quiz milestones.
Use this to understand what the user has been reading and how far they've progressed.`,
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "fastreader_get_document",
    description: `Get a specific document by its ID.
Returns the full document content, metadata, and word count.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document ID"
        }
      },
      required: ["documentId"]
    }
  },
  {
    name: "fastreader_list_documents",
    description: `List all documents the user has loaded into FastReader.
Returns document titles, word counts, and creation dates.
Use this to help users find documents they want to review.`,
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum documents to return (default: 50)"
        },
        offset: {
          type: "number",
          description: "Offset for pagination (default: 0)"
        }
      },
      required: []
    }
  },
  {
    name: "fastreader_get_question_history",
    description: `Get all previously generated questions for a document.
IMPORTANT: Always call this before generating new questions to avoid asking duplicate or semantically similar questions.
Returns question text, types, and whether they've been answered.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document ID"
        }
      },
      required: ["documentId"]
    }
  },
  {
    name: "fastreader_save_questions",
    description: `Save generated comprehension questions for a document.
Call this after generating questions to persist them to the database.
Questions will be available in FastReader's quiz interface and for spaced repetition review.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document ID these questions are for"
        },
        sessionId: {
          type: "string",
          description: "Optional session ID if questions are for a specific reading session"
        },
        questions: {
          type: "array",
          description: "Array of questions to save",
          items: {
            type: "object",
            properties: {
              questionText: { type: "string" },
              questionType: {
                type: "string",
                enum: ["multiple_choice", "short_answer", "fill_in_blank"]
              },
              comprehensionType: {
                type: "string",
                enum: ["factual_recall", "inference", "synthesis"]
              },
              difficulty: {
                type: "string",
                enum: ["easy", "medium", "hard"]
              },
              options: { type: "object" },
              correctAnswer: { type: "string" },
              rationale: { type: "string" }
            },
            required: ["questionText", "questionType", "comprehensionType", "correctAnswer", "rationale"]
          }
        }
      },
      required: ["documentId", "questions"]
    }
  },
  {
    name: "fastreader_record_answer",
    description: `Record the user's answer to a question.
Use this when the user answers a question in the AI CLI conversation.
The rating parameter uses FSRS scale: 1=Again (forgot), 2=Hard, 3=Good, 4=Easy.
This updates the spaced repetition schedule for the question.`,
    inputSchema: {
      type: "object",
      properties: {
        questionId: {
          type: "string",
          description: "The question ID"
        },
        userAnswer: {
          type: "string",
          description: "The user's answer"
        },
        isCorrect: {
          type: "boolean",
          description: "Whether the answer was correct"
        },
        rating: {
          type: "number",
          enum: [1, 2, 3, 4],
          description: "FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy"
        },
        timeSpentMs: {
          type: "number",
          description: "Optional time spent answering in milliseconds"
        }
      },
      required: ["questionId", "userAnswer", "isCorrect", "rating"]
    }
  },
  {
    name: "fastreader_get_due_questions",
    description: `Get questions that are due for spaced repetition review.
Returns questions scheduled for review today, sorted by due date.
Use this when the user wants to review material they've previously read.`,
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum questions to return (default: 20)"
        },
        documentId: {
          type: "string",
          description: "Optional: filter to specific document"
        }
      },
      required: []
    }
  },
  {
    name: "fastreader_get_session_stats",
    description: `Get reading and quiz statistics.
Returns total documents, questions answered, accuracy rate, and review progress.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "Optional: get stats for specific document only"
        }
      },
      required: []
    }
  }
];
```

### 8.4 Create PocketBase Client

Create `fastreader-mcp/src/pocketbase-client.ts`:

```typescript
/**
 * PocketBase API Client for MCP Server
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.FASTREADER_API_URL || "http://127.0.0.1:8090";

export const pb = new PocketBase(POCKETBASE_URL);

/**
 * Convert camelCase keys to snake_case for PocketBase
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Check if PocketBase is reachable
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}
```

### 8.5 Create MCP Server

Create `fastreader-mcp/src/index.ts`:

```typescript
#!/usr/bin/env node

/**
 * FastReader MCP Server
 *
 * Provides MCP tools for AI coding assistants to interact
 * with FastReader's comprehension feature.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { tools } from "./tools.js";
import { pb, toSnakeCase, checkConnection } from "./pocketbase-client.js";

// Create MCP server
const server = new Server(
  { name: "fastreader", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Check PocketBase connection
    if (!(await checkConnection())) {
      return {
        content: [{
          type: "text",
          text: "Error: PocketBase is not running. Please start it with: ./pocketbase serve"
        }],
        isError: true
      };
    }

    let result: unknown;

    switch (name) {
      case "fastreader_get_current_session": {
        const sessions = await pb.collection('sessions').getList(1, 1, {
          filter: 'is_active = true',
          sort: '-updated',
          expand: 'document'
        });

        if (sessions.items.length === 0) {
          result = { error: "No active session found", hint: "The user may not have started reading yet." };
        } else {
          const session = sessions.items[0];
          const milestones = await pb.collection('session_milestones').getList(1, 100, {
            filter: `session = "${session.id}"`
          });

          result = {
            session: {
              id: session.id,
              currentWordIndex: session.current_word_index,
              totalWords: session.total_words,
              progressPercent: session.progress_percent,
              wpmSetting: session.wpm_setting,
              isActive: session.is_active
            },
            document: session.expand?.document ? {
              id: (session.expand.document as { id: string }).id,
              title: (session.expand.document as { title: string }).title,
              content: (session.expand.document as { content: string }).content,
              wordCount: (session.expand.document as { word_count: number }).word_count,
              sourceType: (session.expand.document as { source_type: string }).source_type
            } : null,
            milestones: milestones.items.map(m => ({
              percent: m.milestone_percent,
              quizPrompted: m.quiz_prompted,
              quizCompleted: m.quiz_completed
            })),
            pendingQuizMilestone: milestones.items.find(m => !m.quiz_completed)?.milestone_percent
          };
        }
        break;
      }

      case "fastreader_get_document": {
        const doc = await pb.collection('documents').getOne(args.documentId as string);
        result = {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          wordCount: doc.word_count,
          sourceType: doc.source_type,
          sourcePath: doc.source_path,
          created: doc.created
        };
        break;
      }

      case "fastreader_list_documents": {
        const limit = (args.limit as number) || 50;
        const offset = (args.offset as number) || 0;
        const page = Math.floor(offset / limit) + 1;

        const docs = await pb.collection('documents').getList(page, limit, {
          sort: '-created',
          fields: 'id,title,word_count,source_type,created'
        });

        result = {
          documents: docs.items.map(d => ({
            id: d.id,
            title: d.title,
            wordCount: d.word_count,
            sourceType: d.source_type,
            created: d.created
          })),
          totalItems: docs.totalItems,
          page: docs.page,
          perPage: docs.perPage
        };
        break;
      }

      case "fastreader_get_question_history": {
        const questions = await pb.collection('questions').getList(1, 500, {
          filter: `document = "${args.documentId}"`,
          sort: '-created'
        });

        result = {
          questions: questions.items.map(q => ({
            id: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            comprehensionType: q.comprehension_type,
            created: q.created
          })),
          totalQuestions: questions.totalItems
        };
        break;
      }

      case "fastreader_save_questions": {
        const questionArgs = args as {
          documentId: string;
          sessionId?: string;
          questions: Array<{
            questionText: string;
            questionType: string;
            comprehensionType: string;
            difficulty?: string;
            options?: Record<string, string>;
            correctAnswer: string;
            rationale: string;
          }>;
        };

        const saved: Array<{ id: string; questionText: string }> = [];

        for (const q of questionArgs.questions) {
          const record = await pb.collection('questions').create({
            document: questionArgs.documentId,
            session: questionArgs.sessionId || null,
            ...toSnakeCase(q)
          });
          saved.push({ id: record.id, questionText: q.questionText });
        }

        result = {
          saved: saved.length,
          questions: saved,
          message: `Successfully saved ${saved.length} question(s)`
        };
        break;
      }

      case "fastreader_record_answer": {
        const answerArgs = args as {
          questionId: string;
          userAnswer: string;
          isCorrect: boolean;
          rating: number;
          timeSpentMs?: number;
        };

        const attempt = await pb.collection('question_attempts').create({
          question: answerArgs.questionId,
          user_answer: answerArgs.userAnswer,
          is_correct: answerArgs.isCorrect,
          rating: answerArgs.rating,
          time_spent_ms: answerArgs.timeSpentMs || null
        });

        // Fetch updated record (FSRS hook updates it)
        await new Promise(resolve => setTimeout(resolve, 100));
        const updated = await pb.collection('question_attempts').getOne(attempt.id);

        result = {
          attemptId: updated.id,
          questionId: answerArgs.questionId,
          isCorrect: updated.is_correct,
          nextReview: {
            dueAt: updated.due_at,
            stability: updated.stability,
            difficulty: updated.difficulty,
            state: updated.state
          }
        };
        break;
      }

      case "fastreader_get_due_questions": {
        const dueArgs = args as { limit?: number; documentId?: string };
        const now = new Date().toISOString();
        let filter = `due_at <= "${now}"`;

        if (dueArgs.documentId) {
          filter += ` && question.document = "${dueArgs.documentId}"`;
        }

        const attempts = await pb.collection('question_attempts').getList(1, dueArgs.limit || 20, {
          filter,
          sort: 'due_at',
          expand: 'question'
        });

        result = {
          questions: attempts.items.map(a => ({
            questionId: a.question,
            question: a.expand?.question ? {
              text: (a.expand.question as { question_text: string }).question_text,
              type: (a.expand.question as { question_type: string }).question_type,
              documentId: (a.expand.question as { document: string }).document
            } : null,
            reviewState: {
              dueAt: a.due_at,
              stability: a.stability,
              difficulty: a.difficulty,
              state: a.state,
              reps: a.reps,
              lapses: a.lapses
            }
          })),
          totalDue: attempts.totalItems
        };
        break;
      }

      case "fastreader_get_session_stats": {
        const docsCount = await pb.collection('documents').getList(1, 1);
        const questionsCount = await pb.collection('questions').getList(1, 1);
        const correctCount = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'is_correct = true'
        });
        const totalAttempts = await pb.collection('question_attempts').getList(1, 1);

        result = {
          totalDocuments: docsCount.totalItems,
          totalQuestionsGenerated: questionsCount.totalItems,
          totalQuestionsAnswered: totalAttempts.totalItems,
          correctAnswers: correctCount.totalItems,
          accuracyRate: totalAttempts.totalItems > 0
            ? (correctCount.totalItems / totalAttempts.totalItems * 100).toFixed(1) + '%'
            : 'N/A'
        };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      content: [{
        type: "text",
        text: `Error: ${message}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FastReader MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
```

### 8.6 Build and Test

```bash
# Build the MCP server
npm run build

# Verify build succeeded
ls -la dist/
# Should show: index.js, tools.js, pocketbase-client.js
```

### 8.7 Verification

Create `fastreader-mcp/test-mcp.sh`:

```bash
#!/bin/bash
# Test MCP server tools via direct invocation

echo "Testing MCP Server..."
echo ""

# Build first
npm run build

# Test that the server starts
echo "1. Testing server startup..."
timeout 2 node dist/index.js 2>&1 || true
echo "   ✅ Server starts without errors"

# Test with Claude Code (if available)
if command -v claude &> /dev/null; then
    echo ""
    echo "2. Claude Code detected. You can test MCP integration with:"
    echo "   claude mcp add fastreader -- node $(pwd)/dist/index.js"
    echo ""
    echo "   Then in Claude:"
    echo "   > What documents are in my FastReader?"
fi

echo ""
echo "=========================================="
echo "✅ MCP Server build successful!"
echo "=========================================="
```

```bash
chmod +x test-mcp.sh
./test-mcp.sh
```

### 8.8 Deliverables

- [x] `fastreader-mcp/` directory created with package.json
- [x] All TypeScript files created (index.ts, tools.ts, pocketbase-client.ts)
- [x] `npm run build` succeeds
- [x] Server starts without errors

---

## 9. Task 6: FastReader PocketBase Client

### 9.1 Objective

Add PocketBase client integration to the FastReader React application.

### 9.2 Install PocketBase SDK

```bash
# From FastReader root
npm install pocketbase
```

### 9.3 Create Comprehension Types

Create `src/types/comprehension.ts`:

```typescript
/**
 * Comprehension Feature Types
 *
 * These types mirror the PocketBase collections and are used
 * for type-safe API interactions.
 */

// Document stored in PocketBase
export interface ComprehensionDocument {
  id: string;
  title: string;
  content: string;
  source_type: 'paste' | 'file' | 'url';
  source_path?: string;
  file_type?: 'txt' | 'md' | 'pdf';
  word_count: number;
  created: string;
  updated: string;
}

// Reading session
export interface ReadingSession {
  id: string;
  document: string; // Relation ID
  current_word_index: number;
  total_words: number;
  progress_percent: number;
  wpm_setting: number;
  chunk_size: number;
  is_active: boolean;
  completed_at?: string;
  created: string;
  updated: string;
}

// Question types
export type QuestionType = 'multiple_choice' | 'short_answer' | 'fill_in_blank';
export type ComprehensionType = 'factual_recall' | 'inference' | 'synthesis';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Generated question
export interface Question {
  id: string;
  document: string;
  session?: string;
  question_text: string;
  question_type: QuestionType;
  comprehension_type: ComprehensionType;
  difficulty?: DifficultyLevel;

  // Multiple choice fields
  options?: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  distractor_explanations?: { A: string; B: string; C: string; D: string };

  // Short answer fields
  ideal_answer?: string;
  acceptable_variations?: string[];
  required_concepts?: string[];
  scoring_rubric?: {
    full_credit: string;
    partial_credit: string;
    no_credit: string;
  };

  // Fill in blank fields
  sentence_with_blank?: string;
  correct_answers?: string[];
  context_hint?: string;

  // Common fields
  rationale: string;
  passage_evidence?: string;
  passage_location?: string;
  chunk_start_index?: number;
  chunk_end_index?: number;

  created: string;
}

// User's answer attempt
export interface QuestionAttempt {
  id: string;
  question: string;
  user_answer?: string;
  is_correct?: boolean;
  time_spent_ms?: number;

  // FSRS fields (set by hook)
  rating?: 1 | 2 | 3 | 4;
  stability: number;
  difficulty: number;
  due_at?: string;
  state: 0 | 1 | 2 | 3; // New, Learning, Review, Relearning
  reps: number;
  lapses: number;

  created: string;
}

// Session milestone
export interface SessionMilestone {
  id: string;
  session: string;
  milestone_percent: 25 | 50 | 75 | 100;
  quiz_prompted: boolean;
  quiz_completed: boolean;
  created: string;
}

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Expanded types for API responses with relations
export interface SessionWithDocument extends ReadingSession {
  expand?: {
    document: ComprehensionDocument;
  };
}

// Input types for creating records
export interface CreateDocumentInput {
  title: string;
  content: string;
  source_type: 'paste' | 'file' | 'url';
  source_path?: string;
  file_type?: 'txt' | 'md' | 'pdf';
  word_count: number;
}

export interface CreateSessionInput {
  document: string;
  total_words: number;
  wpm_setting?: number;
  chunk_size?: number;
}

export interface UpdateSessionInput {
  current_word_index?: number;
  progress_percent?: number;
  wpm_setting?: number;
  is_active?: boolean;
  completed_at?: string;
}
```

### 9.4 Create PocketBase Service

Create `src/services/pocketbase.ts`:

```typescript
/**
 * PocketBase Service
 *
 * Handles all API interactions with PocketBase backend.
 * Provides type-safe methods for CRUD operations and real-time subscriptions.
 */

import PocketBase from 'pocketbase';
import type {
  ComprehensionDocument,
  ReadingSession,
  Question,
  QuestionAttempt,
  SessionMilestone,
  CreateDocumentInput,
  CreateSessionInput,
  UpdateSessionInput,
  SessionWithDocument,
  ConnectionStatus,
} from '../types/comprehension';

// Configuration
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Singleton PocketBase instance
let pbInstance: PocketBase | null = null;

/**
 * Get or create PocketBase client instance
 */
export function getPocketBase(): PocketBase {
  if (!pbInstance) {
    pbInstance = new PocketBase(POCKETBASE_URL);
    // Disable auto-cancellation for SSE subscriptions
    pbInstance.autoCancellation(false);
  }
  return pbInstance;
}

/**
 * Check if PocketBase is reachable
 */
export async function checkConnection(): Promise<ConnectionStatus> {
  try {
    const pb = getPocketBase();
    await pb.health.check();
    return 'connected';
  } catch (error) {
    console.error('PocketBase connection error:', error);
    return 'disconnected';
  }
}

// ============================================
// Document Operations
// ============================================

/**
 * Create a new document
 */
export async function createDocument(input: CreateDocumentInput): Promise<ComprehensionDocument> {
  const pb = getPocketBase();
  return await pb.collection('documents').create<ComprehensionDocument>(input);
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<ComprehensionDocument> {
  const pb = getPocketBase();
  return await pb.collection('documents').getOne<ComprehensionDocument>(id);
}

/**
 * List all documents
 */
export async function listDocuments(page = 1, perPage = 50): Promise<{
  items: ComprehensionDocument[];
  totalItems: number;
  totalPages: number;
}> {
  const pb = getPocketBase();
  const result = await pb.collection('documents').getList<ComprehensionDocument>(page, perPage, {
    sort: '-created',
  });
  return {
    items: result.items,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  };
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('documents').delete(id);
}

// ============================================
// Session Operations
// ============================================

/**
 * Create a new reading session
 */
export async function createSession(input: CreateSessionInput): Promise<ReadingSession> {
  const pb = getPocketBase();
  return await pb.collection('sessions').create<ReadingSession>({
    ...input,
    current_word_index: 0,
    progress_percent: 0,
    is_active: true,
  });
}

/**
 * Get the current active session with document
 */
export async function getCurrentSession(): Promise<SessionWithDocument | null> {
  const pb = getPocketBase();
  try {
    const result = await pb.collection('sessions').getList<SessionWithDocument>(1, 1, {
      filter: 'is_active = true',
      sort: '-updated',
      expand: 'document',
    });
    return result.items[0] || null;
  } catch {
    return null;
  }
}

/**
 * Update a session
 */
export async function updateSession(id: string, input: UpdateSessionInput): Promise<ReadingSession> {
  const pb = getPocketBase();
  return await pb.collection('sessions').update<ReadingSession>(id, input);
}

/**
 * Mark a session as inactive
 */
export async function deactivateSession(id: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('sessions').update(id, {
    is_active: false,
    completed_at: new Date().toISOString(),
  });
}

// ============================================
// Question Operations
// ============================================

/**
 * Get questions for a document
 */
export async function getQuestionsForDocument(documentId: string): Promise<Question[]> {
  const pb = getPocketBase();
  const result = await pb.collection('questions').getList<Question>(1, 500, {
    filter: `document = "${documentId}"`,
    sort: '-created',
  });
  return result.items;
}

/**
 * Get questions for a session
 */
export async function getQuestionsForSession(sessionId: string): Promise<Question[]> {
  const pb = getPocketBase();
  const result = await pb.collection('questions').getList<Question>(1, 100, {
    filter: `session = "${sessionId}"`,
    sort: '-created',
  });
  return result.items;
}

// ============================================
// Question Attempt Operations
// ============================================

/**
 * Record an answer attempt
 */
export async function recordAttempt(
  questionId: string,
  userAnswer: string,
  isCorrect: boolean,
  rating: 1 | 2 | 3 | 4,
  timeSpentMs?: number
): Promise<QuestionAttempt> {
  const pb = getPocketBase();
  return await pb.collection('question_attempts').create<QuestionAttempt>({
    question: questionId,
    user_answer: userAnswer,
    is_correct: isCorrect,
    rating,
    time_spent_ms: timeSpentMs,
  });
}

/**
 * Get due questions for review
 */
export async function getDueQuestions(limit = 20): Promise<QuestionAttempt[]> {
  const pb = getPocketBase();
  const now = new Date().toISOString();
  const result = await pb.collection('question_attempts').getList<QuestionAttempt>(1, limit, {
    filter: `due_at <= "${now}"`,
    sort: 'due_at',
    expand: 'question',
  });
  return result.items;
}

// ============================================
// Milestone Operations
// ============================================

/**
 * Get milestones for a session
 */
export async function getMilestonesForSession(sessionId: string): Promise<SessionMilestone[]> {
  const pb = getPocketBase();
  const result = await pb.collection('session_milestones').getList<SessionMilestone>(1, 100, {
    filter: `session = "${sessionId}"`,
    sort: 'milestone_percent',
  });
  return result.items;
}

/**
 * Mark a milestone as quiz prompted
 */
export async function markMilestonePrompted(milestoneId: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('session_milestones').update(milestoneId, {
    quiz_prompted: true,
  });
}

/**
 * Mark a milestone as quiz completed
 */
export async function markMilestoneCompleted(milestoneId: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('session_milestones').update(milestoneId, {
    quiz_completed: true,
  });
}

// ============================================
// Real-time Subscriptions
// ============================================

type SubscriptionCallback<T> = (data: { action: string; record: T }) => void;
type UnsubscribeFunction = () => void;

/**
 * Subscribe to question changes for a document
 */
export function subscribeToQuestions(
  documentId: string,
  callback: SubscriptionCallback<Question>
): UnsubscribeFunction {
  const pb = getPocketBase();

  pb.collection('questions').subscribe<Question>('*', (e) => {
    if (e.record.document === documentId) {
      callback({ action: e.action, record: e.record });
    }
  });

  return () => {
    pb.collection('questions').unsubscribe('*');
  };
}

/**
 * Subscribe to milestone changes for a session
 */
export function subscribeToMilestones(
  sessionId: string,
  callback: SubscriptionCallback<SessionMilestone>
): UnsubscribeFunction {
  const pb = getPocketBase();

  pb.collection('session_milestones').subscribe<SessionMilestone>('*', (e) => {
    if (e.record.session === sessionId) {
      callback({ action: e.action, record: e.record });
    }
  });

  return () => {
    pb.collection('session_milestones').unsubscribe('*');
  };
}

/**
 * Unsubscribe from all collections
 */
export function unsubscribeAll(): void {
  const pb = getPocketBase();
  pb.collection('questions').unsubscribe();
  pb.collection('session_milestones').unsubscribe();
}
```

### 9.5 Create Environment File

Create `.env` in project root:

```bash
# PocketBase Configuration
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

### 9.6 Verification

Run the TypeScript compiler to verify the types are correct:

```bash
npm run typecheck
```

### 9.7 Deliverables

- [x] `pocketbase` package installed
- [x] `src/types/comprehension.ts` created with all types
- [x] `src/services/pocketbase.ts` created with all operations
- [x] `.env` file created with PocketBase URL
- [x] TypeScript compiles without errors

---

## 10. Task 7: SSE Subscriptions

### 10.1 Objective

Implement real-time updates using PocketBase's Server-Sent Events so FastReader instantly knows when questions are generated.

### 10.2 Create Comprehension Context

Create `src/contexts/ComprehensionContext.tsx`:

```typescript
/**
 * Comprehension Context
 *
 * Provides global state management for the comprehension feature.
 * Handles PocketBase connection, real-time subscriptions, and quiz state.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import {
  checkConnection,
  getCurrentSession,
  createDocument,
  createSession,
  updateSession,
  getMilestonesForSession,
  getQuestionsForSession,
  subscribeToQuestions,
  subscribeToMilestones,
  unsubscribeAll,
} from '../services/pocketbase';

import type {
  ConnectionStatus,
  ComprehensionDocument,
  ReadingSession,
  Question,
  SessionMilestone,
  CreateDocumentInput,
} from '../types/comprehension';

// ============================================
// Context Types
// ============================================

interface ComprehensionState {
  // Connection
  connectionStatus: ConnectionStatus;

  // Current session
  currentSession: ReadingSession | null;
  currentDocument: ComprehensionDocument | null;

  // Questions and milestones
  questions: Question[];
  milestones: SessionMilestone[];
  pendingMilestone: number | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
}

interface ComprehensionActions {
  // Session management
  startNewSession: (input: CreateDocumentInput) => Promise<void>;
  updateProgress: (wordIndex: number, progressPercent: number) => Promise<void>;
  endSession: () => Promise<void>;

  // Milestone management
  dismissMilestone: () => void;

  // Manual refresh
  refreshConnection: () => Promise<void>;
}

type ComprehensionContextType = ComprehensionState & ComprehensionActions;

// ============================================
// Context Creation
// ============================================

const ComprehensionContext = createContext<ComprehensionContextType | null>(null);

// ============================================
// Provider Component
// ============================================

interface ComprehensionProviderProps {
  children: ReactNode;
}

export function ComprehensionProvider({ children }: ComprehensionProviderProps) {
  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [currentDocument, setCurrentDocument] = useState<ComprehensionDocument | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [milestones, setMilestones] = useState<SessionMilestone[]>([]);
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for cleanup
  const unsubscribeQuestionsRef = useRef<(() => void) | null>(null);
  const unsubscribeMilestonesRef = useRef<(() => void) | null>(null);

  // ----------------------------------------
  // Connection and Initialization
  // ----------------------------------------

  const initializeConnection = useCallback(async () => {
    setConnectionStatus('connecting');
    setIsLoading(true);

    try {
      const status = await checkConnection();
      setConnectionStatus(status);

      if (status === 'connected') {
        // Load current session if one exists
        const session = await getCurrentSession();

        if (session) {
          setCurrentSession(session);
          setCurrentDocument(session.expand?.document || null);

          // Load questions and milestones
          const [sessionQuestions, sessionMilestones] = await Promise.all([
            getQuestionsForSession(session.id),
            getMilestonesForSession(session.id),
          ]);

          setQuestions(sessionQuestions);
          setMilestones(sessionMilestones);

          // Check for pending milestone
          const pending = sessionMilestones.find(m => !m.quiz_prompted && !m.quiz_completed);
          setPendingMilestone(pending?.milestone_percent || null);

          // Set up subscriptions
          setupSubscriptions(session.document, session.id);
        }
      }
    } catch (error) {
      console.error('Failed to initialize comprehension context:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // ----------------------------------------
  // SSE Subscriptions
  // ----------------------------------------

  const setupSubscriptions = useCallback((documentId: string, sessionId: string) => {
    // Clean up existing subscriptions
    unsubscribeQuestionsRef.current?.();
    unsubscribeMilestonesRef.current?.();

    // Subscribe to questions
    unsubscribeQuestionsRef.current = subscribeToQuestions(documentId, (e) => {
      if (e.action === 'create') {
        console.log('SSE: New question received', e.record.id);
        setQuestions(prev => [e.record, ...prev]);
      } else if (e.action === 'update') {
        setQuestions(prev => prev.map(q => q.id === e.record.id ? e.record : q));
      } else if (e.action === 'delete') {
        setQuestions(prev => prev.filter(q => q.id !== e.record.id));
      }
    });

    // Subscribe to milestones
    unsubscribeMilestonesRef.current = subscribeToMilestones(sessionId, (e) => {
      if (e.action === 'create') {
        console.log('SSE: New milestone reached', e.record.milestone_percent);
        setMilestones(prev => [...prev, e.record]);

        // Set as pending if not yet prompted
        if (!e.record.quiz_prompted && !e.record.quiz_completed) {
          setPendingMilestone(e.record.milestone_percent);
        }
      } else if (e.action === 'update') {
        setMilestones(prev => prev.map(m => m.id === e.record.id ? e.record : m));
      }
    });
  }, []);

  // ----------------------------------------
  // Session Management
  // ----------------------------------------

  const startNewSession = useCallback(async (input: CreateDocumentInput) => {
    setIsLoading(true);

    try {
      // Create document
      const document = await createDocument(input);

      // Create session
      const session = await createSession({
        document: document.id,
        total_words: input.word_count,
      });

      setCurrentDocument(document);
      setCurrentSession(session);
      setQuestions([]);
      setMilestones([]);
      setPendingMilestone(null);

      // Set up subscriptions for new session
      setupSubscriptions(document.id, session.id);

    } catch (error) {
      console.error('Failed to start new session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setupSubscriptions]);

  const updateProgress = useCallback(async (wordIndex: number, progressPercent: number) => {
    if (!currentSession) return;

    try {
      const updated = await updateSession(currentSession.id, {
        current_word_index: wordIndex,
        progress_percent: progressPercent,
      });

      setCurrentSession(updated);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [currentSession]);

  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await updateSession(currentSession.id, {
        is_active: false,
        completed_at: new Date().toISOString(),
      });

      // Clean up
      unsubscribeQuestionsRef.current?.();
      unsubscribeMilestonesRef.current?.();

      setCurrentSession(null);
      setCurrentDocument(null);
      setQuestions([]);
      setMilestones([]);
      setPendingMilestone(null);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [currentSession]);

  // ----------------------------------------
  // Milestone Management
  // ----------------------------------------

  const dismissMilestone = useCallback(() => {
    setPendingMilestone(null);
  }, []);

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  // Initialize on mount
  useEffect(() => {
    initializeConnection();

    return () => {
      unsubscribeQuestionsRef.current?.();
      unsubscribeMilestonesRef.current?.();
      unsubscribeAll();
    };
  }, [initializeConnection]);

  // Reconnection polling when disconnected
  useEffect(() => {
    if (connectionStatus !== 'disconnected') return;

    const interval = setInterval(async () => {
      const status = await checkConnection();
      if (status === 'connected') {
        initializeConnection();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connectionStatus, initializeConnection]);

  // ----------------------------------------
  // Context Value
  // ----------------------------------------

  const value: ComprehensionContextType = {
    // State
    connectionStatus,
    currentSession,
    currentDocument,
    questions,
    milestones,
    pendingMilestone,
    isLoading,
    isInitialized,

    // Actions
    startNewSession,
    updateProgress,
    endSession,
    dismissMilestone,
    refreshConnection: initializeConnection,
  };

  return (
    <ComprehensionContext.Provider value={value}>
      {children}
    </ComprehensionContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useComprehension(): ComprehensionContextType {
  const context = useContext(ComprehensionContext);

  if (!context) {
    throw new Error('useComprehension must be used within a ComprehensionProvider');
  }

  return context;
}
```

### 10.3 Create Connection Status Component

Create `src/components/ConnectionStatus/ConnectionStatus.tsx`:

```typescript
/**
 * Connection Status Indicator
 *
 * Shows PocketBase connection state in the UI.
 */

import { useComprehension } from '../../contexts/ComprehensionContext';
import type { ConnectionStatus as ConnectionStatusType } from '../../types/comprehension';
import './ConnectionStatus.css';

const STATUS_CONFIG: Record<ConnectionStatusType, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'status-connected' },
  disconnected: { label: 'Disconnected', className: 'status-disconnected' },
  connecting: { label: 'Connecting...', className: 'status-connecting' },
  error: { label: 'Error', className: 'status-error' },
};

export function ConnectionStatus() {
  const { connectionStatus, refreshConnection } = useComprehension();
  const config = STATUS_CONFIG[connectionStatus];

  return (
    <div className={`connection-status ${config.className}`}>
      <span className="status-indicator" />
      <span className="status-label">{config.label}</span>
      {connectionStatus === 'disconnected' && (
        <button
          className="retry-button"
          onClick={refreshConnection}
          title="Retry connection"
        >
          ↻
        </button>
      )}
    </div>
  );
}
```

Create `src/components/ConnectionStatus/ConnectionStatus.css`:

```css
.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-connected .status-indicator {
  background-color: #22c55e;
}

.status-disconnected .status-indicator {
  background-color: #6b7280;
}

.status-connecting .status-indicator {
  background-color: #eab308;
  animation: pulse 1s infinite;
}

.status-error .status-indicator {
  background-color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.retry-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 14px;
  color: inherit;
}

.retry-button:hover {
  opacity: 0.7;
}
```

Create `src/components/ConnectionStatus/index.ts`:

```typescript
export { ConnectionStatus } from './ConnectionStatus';
```

### 10.4 Deliverables

- [ ] `src/contexts/ComprehensionContext.tsx` created
- [ ] `src/components/ConnectionStatus/` created
- [ ] SSE subscriptions implemented for questions and milestones

---

## 11. Task 8: Document Persistence

### 11.1 Objective

Modify FastReader to save documents to PocketBase when text is submitted.

### 11.2 Create Document Persistence Hook

Create `src/hooks/useDocumentPersistence.ts`:

```typescript
/**
 * Document Persistence Hook
 *
 * Handles saving documents to PocketBase and managing the
 * relationship between local RSVP state and persistent storage.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useComprehension } from '../contexts/ComprehensionContext';
import type { CreateDocumentInput } from '../types/comprehension';

interface UseDocumentPersistenceOptions {
  onSessionLoaded?: (text: string, wordIndex: number, settings: { wpm: number }) => void;
}

interface UseDocumentPersistenceReturn {
  saveDocument: (title: string, content: string, sourceType: 'paste' | 'file' | 'url', filePath?: string) => Promise<void>;
  syncProgress: (wordIndex: number, totalWords: number) => void;
  isBackendAvailable: boolean;
  isLoading: boolean;
}

const PROGRESS_SYNC_INTERVAL = 2000;

export function useDocumentPersistence(
  options: UseDocumentPersistenceOptions = {}
): UseDocumentPersistenceReturn {
  const { onSessionLoaded } = options;

  const {
    connectionStatus,
    currentSession,
    currentDocument,
    isLoading,
    isInitialized,
    startNewSession,
    updateProgress,
  } = useComprehension();

  const lastSyncRef = useRef<number>(0);
  const pendingProgressRef = useRef<{ wordIndex: number; percent: number } | null>(null);

  const isBackendAvailable = connectionStatus === 'connected';

  // Load existing session on mount
  useEffect(() => {
    if (!isInitialized || !isBackendAvailable) return;
    if (!currentSession || !currentDocument) return;
    if (!onSessionLoaded) return;

    onSessionLoaded(
      currentDocument.content,
      currentSession.current_word_index,
      { wpm: currentSession.wpm_setting }
    );
  }, [isInitialized, isBackendAvailable, currentSession, currentDocument, onSessionLoaded]);

  const saveDocument = useCallback(async (
    title: string,
    content: string,
    sourceType: 'paste' | 'file' | 'url',
    filePath?: string
  ) => {
    if (!isBackendAvailable) {
      console.warn('Backend not available, document will not be persisted');
      return;
    }

    const words = content.trim().split(/\s+/);
    const wordCount = words.length;

    const input: CreateDocumentInput = {
      title: title || `Document ${new Date().toLocaleDateString()}`,
      content,
      source_type: sourceType,
      source_path: filePath,
      word_count: wordCount,
    };

    await startNewSession(input);
  }, [isBackendAvailable, startNewSession]);

  const syncProgress = useCallback((wordIndex: number, totalWords: number) => {
    if (!isBackendAvailable || !currentSession) return;

    const percent = Math.round((wordIndex / totalWords) * 100);
    pendingProgressRef.current = { wordIndex, percent };

    const now = Date.now();
    if (now - lastSyncRef.current < PROGRESS_SYNC_INTERVAL) {
      return;
    }

    lastSyncRef.current = now;
    updateProgress(wordIndex, percent);
    pendingProgressRef.current = null;
  }, [isBackendAvailable, currentSession, updateProgress]);

  // Sync pending progress on unmount
  useEffect(() => {
    return () => {
      if (pendingProgressRef.current && currentSession) {
        updateProgress(
          pendingProgressRef.current.wordIndex,
          pendingProgressRef.current.percent
        );
      }
    };
  }, [currentSession, updateProgress]);

  return {
    saveDocument,
    syncProgress,
    isBackendAvailable,
    isLoading,
  };
}
```

### 11.3 Deliverables

- [ ] `src/hooks/useDocumentPersistence.ts` created
- [ ] Hook provides saveDocument and syncProgress functions
- [ ] Progress syncs are debounced to avoid excessive API calls

---

## 12. Phase 1 Integration Testing

### 12.1 Integration Test Script

Create `scripts/test-phase1-integration.sh`:

```bash
#!/bin/bash
# Phase 1 Integration Test

set -e

BASE_URL="http://127.0.0.1:8090/api"

echo "================================================"
echo "FastReader Phase 1 Integration Test"
echo "================================================"
echo ""

# Check PocketBase
echo "1. Checking PocketBase..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✅ PocketBase is running"
else
    echo "   ❌ PocketBase is not running"
    echo "   Start it with: cd fastreader-backend && ./start.sh"
    exit 1
fi

# Create test document
echo ""
echo "2. Creating test document..."
DOC_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/documents/records" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Integration Test Document",
        "content": "The quick brown fox jumps over the lazy dog. This is a test document for the FastReader integration test.",
        "source_type": "paste",
        "word_count": 20
    }')
DOC_ID=$(echo "$DOC_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Document created: $DOC_ID"

# Create session
echo ""
echo "3. Creating reading session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/sessions/records" \
    -H "Content-Type: application/json" \
    -d "{
        \"document\": \"$DOC_ID\",
        \"current_word_index\": 0,
        \"total_words\": 20,
        \"progress_percent\": 0,
        \"wpm_setting\": 300,
        \"is_active\": true
    }")
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Session created: $SESSION_ID"

# Update progress to trigger milestone
echo ""
echo "4. Simulating reading progress (30%)..."
curl -s -X PATCH "$BASE_URL/collections/sessions/records/$SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"progress_percent": 30, "current_word_index": 6}' > /dev/null

sleep 1

# Check milestone
MILESTONES=$(curl -s "$BASE_URL/collections/session_milestones/records?filter=session=\"$SESSION_ID\"")
MILESTONE_COUNT=$(echo "$MILESTONES" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
echo "   ✅ Milestone hook triggered (count: $MILESTONE_COUNT)"

# Create a question
echo ""
echo "5. Simulating AI CLI question generation..."
Q_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/questions/records" \
    -H "Content-Type: application/json" \
    -d "{
        \"document\": \"$DOC_ID\",
        \"session\": \"$SESSION_ID\",
        \"question_text\": \"What animal jumps over the lazy dog?\",
        \"question_type\": \"multiple_choice\",
        \"comprehension_type\": \"factual_recall\",
        \"difficulty\": \"easy\",
        \"options\": {\"A\": \"Cat\", \"B\": \"Fox\", \"C\": \"Bird\", \"D\": \"Rabbit\"},
        \"correct_answer\": \"B\",
        \"rationale\": \"The passage states the quick brown fox jumps over the lazy dog.\"
    }")
Q_ID=$(echo "$Q_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Question created: $Q_ID"

# Record an answer
echo ""
echo "6. Recording answer attempt..."
ATTEMPT_RESPONSE=$(curl -s -X POST "$BASE_URL/collections/question_attempts/records" \
    -H "Content-Type: application/json" \
    -d "{
        \"question\": \"$Q_ID\",
        \"user_answer\": \"B\",
        \"is_correct\": true,
        \"rating\": 3
    }")
ATTEMPT_ID=$(echo "$ATTEMPT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Attempt recorded: $ATTEMPT_ID"

sleep 1

# Verify FSRS
echo ""
echo "7. Verifying FSRS calculation..."
ATTEMPT_DATA=$(curl -s "$BASE_URL/collections/question_attempts/records/$ATTEMPT_ID")
STABILITY=$(echo "$ATTEMPT_DATA" | grep -o '"stability":[0-9.]*' | cut -d':' -f2)
DUE_AT=$(echo "$ATTEMPT_DATA" | grep -o '"due_at":"[^"]*"' | cut -d'"' -f4)

if [ -n "$STABILITY" ] && [ -n "$DUE_AT" ]; then
    echo "   ✅ FSRS calculated - Stability: $STABILITY"
else
    echo "   ❌ FSRS not calculated"
fi

# Cleanup
echo ""
echo "8. Cleaning up test data..."
curl -s -X DELETE "$BASE_URL/collections/question_attempts/records/$ATTEMPT_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/collections/questions/records/$Q_ID" > /dev/null

MILESTONE_IDS=$(echo "$MILESTONES" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
for MID in $MILESTONE_IDS; do
    curl -s -X DELETE "$BASE_URL/collections/session_milestones/records/$MID" > /dev/null
done

curl -s -X DELETE "$BASE_URL/collections/sessions/records/$SESSION_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/collections/documents/records/$DOC_ID" > /dev/null
echo "   ✅ Test data cleaned up"

echo ""
echo "================================================"
echo "✅ Phase 1 Integration Test PASSED"
echo "================================================"
echo ""
echo "All core functionality verified:"
echo "  • PocketBase running"
echo "  • Documents can be created"
echo "  • Sessions can be created/updated"
echo "  • Milestone hook triggers"
echo "  • Questions can be saved"
echo "  • FSRS hook calculates schedules"
```

```bash
mkdir -p scripts
chmod +x scripts/test-phase1-integration.sh
./scripts/test-phase1-integration.sh
```

### 12.2 Phase 1 Completion Checklist

- [ ] PocketBase running with all 5 collections
- [ ] FSRS hook calculating review schedules
- [ ] Milestone hook detecting progress thresholds
- [ ] MCP server builds and responds to tool calls
- [ ] FastReader types and services created
- [ ] Comprehension context with SSE subscriptions
- [ ] Document persistence hook created
- [ ] Integration test script passes

---

## 13. Troubleshooting

### 13.1 PocketBase Issues

**PocketBase won't start:**
```bash
lsof -i :8090
kill -9 <PID>
```

**Hooks not loading:**
- Verify files are in `pb_hooks/` directory
- Restart PocketBase after adding hooks
- Check console for syntax errors

### 13.2 Connection Issues

**FastReader shows "Disconnected":**
1. Verify PocketBase: `curl http://127.0.0.1:8090/api/health`
2. Check browser console for CORS errors
3. Verify `.env` has correct URL

### 13.3 SSE Not Working

1. Check browser DevTools → Network → filter "realtime"
2. Verify document/session IDs match subscriptions
3. Check console for subscription errors

### 13.4 MCP Server Issues

```bash
cd fastreader-mcp
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

---

## Quick Reference Commands

```bash
# Start PocketBase
cd fastreader-backend && ./start.sh

# Start FastReader
npm run dev

# Build MCP Server
cd fastreader-mcp && npm run build

# Run integration test
./scripts/test-phase1-integration.sh

# Add MCP to Claude Code
claude mcp add fastreader -- node $(pwd)/fastreader-mcp/dist/index.js

# Check PocketBase health
curl http://127.0.0.1:8090/api/health
```

---

*End of Phase 1 Implementation Guide*
