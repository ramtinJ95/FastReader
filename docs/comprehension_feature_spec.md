# FastReader Comprehension Feature Specification

**Version:** 2.0.0
**Status:** Draft
**Last Updated:** 2026-01-18

> **Note:** This specification incorporates architectural decisions documented in [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md). Refer to that document for rationale behind key technical choices.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Architecture](#3-architecture)
4. [Components](#4-components)
5. [Data Models](#5-data-models)
6. [API Specification](#6-api-specification)
7. [MCP Server Specification](#7-mcp-server-specification)
8. [User Flows](#8-user-flows)
9. [FastReader UI Changes](#9-fastreader-ui-changes)
10. [Question Generation](#10-question-generation)
11. [Spaced Repetition System](#11-spaced-repetition-system)
12. [Distribution & Installation](#12-distribution--installation)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Future Considerations](#14-future-considerations)

---

## 1. Overview

### 1.1 Purpose

Add AI-powered reading comprehension questions to FastReader that challenge users' understanding of texts they've read. The system leverages AI coding assistants (Claude Code, Codex, OpenCode, etc.) running locally on the user's machine to generate contextually relevant questions, tracks question history to avoid repetition, and implements spaced repetition for long-term retention.

### 1.2 Key Principles

- **Local-first**: All data stored locally on user's machine
- **Open-source**: Fully open-source, no proprietary dependencies
- **Privacy-preserving**: Documents and reading data never leave the user's machine
- **CLI-agnostic**: Works with any compatible AI coding assistant via MCP
- **Offline-capable reading**: Core RSVP reading works without AI (questions require AI CLI)
- **Real-time sync**: Changes sync instantly between UI and CLI via Server-Sent Events

### 1.3 Summary

| Aspect | Decision |
|--------|----------|
| User model | Single user, no authentication required |
| Document input | Paste text, file import (.txt, .md, .pdf), URL extraction |
| Quiz interface | Both FastReader UI and AI CLI conversation |
| Question formats | Multiple choice, Short answer (open-ended), Fill-in-the-blank |
| Comprehension types | Factual recall (~40%), Inference (~40%), Synthesis (~20%) |
| Quiz triggers | Milestone prompts (25/50/75/100%) + on-demand |
| Spaced repetition | FSRS-based algorithm for review scheduling |
| Backend | PocketBase (single binary with SQLite) |
| Custom logic | JavaScript hooks (pb_hooks/) |
| Text extraction | Separate Go binary (fastreader-extract) |
| AI integration | CLI-agnostic via MCP server |
| Real-time sync | PocketBase SSE subscriptions |

---

## 2. Goals & Non-Goals

### 2.1 Goals

1. **Improve reading retention**: Help users remember and understand what they read through active recall
2. **Personalized questions**: Generate questions based on the specific text being read, not generic quizzes
3. **Avoid repetition**: Track question history to never ask the same (or semantically similar) question twice
4. **Support long-term learning**: Implement spaced repetition to surface questions at optimal review intervals
5. **Seamless integration**: Work naturally with both FastReader UI and AI CLI workflows
6. **Easy setup**: Minimal binaries, minimal configuration
7. **CLI flexibility**: Support multiple AI coding assistants (Claude Code, Codex, OpenCode, etc.)

### 2.2 Non-Goals

1. **Multi-user support**: This is a single-user local application
2. **Cloud sync**: No cloud storage or synchronization (may be added later)
3. **Mobile apps**: Desktop/web only for MVP
4. **Real-time collaboration**: No sharing or collaborative features
5. **Gamification**: No points, badges, streaks, or leaderboards (may be added later)
6. **Custom question creation**: Users cannot manually create questions (AI-generated only)

---

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User's Machine                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐                    ┌─────────────────────────────┐  │
│  │                   │      HTTP + SSE    │                             │  │
│  │   FastReader      │◄──────────────────►│   PocketBase               │  │
│  │   (React SPA)     │   localhost:8090   │                             │  │
│  │                   │                    │   ┌─────────────────────┐   │  │
│  │   - RSVP Display  │                    │   │   pb_hooks/         │   │  │
│  │   - Quiz Modal    │                    │   │   ├── fsrs.pb.js    │   │  │
│  │   - CLI Spawner   │                    │   │   └── sessions.pb.js│   │  │
│  │   - SSE Client    │                    │   └─────────────────────┘   │  │
│  └─────────┬─────────┘                    │                             │  │
│            │                              │   ┌─────────────────────┐   │  │
│            │ spawns                       │   │   pb_data/          │   │  │
│            ▼                              │   │   └── data.db       │   │  │
│  ┌───────────────────┐                    │   └─────────────────────┘   │  │
│  │   AI CLI          │                    └──────────────┬──────────────┘  │
│  │   (claude/codex)  │                                   │                  │
│  │                   │      stdio         ┌──────────────▼──────────────┐  │
│  │   - Question gen  │◄──────────────────►│   MCP Server (Node.js)     │  │
│  │   - Evaluation    │   JSON-RPC 2.0     │                             │  │
│  │   - Review        │                    │   - Calls PocketBase API    │  │
│  └───────────────────┘                    │   - ~150 lines of code      │  │
│                                           └─────────────────────────────┘  │
│  ┌───────────────────┐                                                     │
│  │ fastreader-extract│  (standalone CLI for PDF/URL text extraction)      │
│  └───────────────────┘                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Language | Responsibility |
|-----------|----------|----------------|
| **FastReader** | React/TypeScript | RSVP reading, quiz UI, SSE subscription, CLI spawning |
| **PocketBase** | Go (binary) | REST API, SQLite database, real-time subscriptions |
| **pb_hooks/** | JavaScript | FSRS calculations, milestone detection, custom validation |
| **MCP Server** | Node.js/TypeScript | Translate MCP calls to PocketBase API for AI CLI |
| **fastreader-extract** | Go | PDF text extraction, URL content extraction |
| **AI CLI** | Any | Question generation, answer evaluation (via MCP) |

### 3.3 Data Flow

```
Document Input Flow:
User → FastReader UI → PocketBase API → SQLite → Document stored
       (or)
User → fastreader-extract → JSON output → FastReader → PocketBase

Question Generation Flow (UI-triggered):
User clicks "Generate Quiz" in FastReader
        ↓
FastReader spawns AI CLI in background with prompt
        ↓
AI CLI → MCP Server → PocketBase API (get session, get history)
        ↓
AI CLI generates questions
        ↓
AI CLI → MCP Server → PocketBase API (save questions)
        ↓
PocketBase emits SSE event
        ↓
FastReader receives event → Quiz modal appears with questions

Quiz Flow (FastReader UI):
FastReader → GET /api/collections/questions/records → Questions returned
User answers → POST /api/collections/question_attempts/records → Attempt recorded
        ↓
pb_hooks/fsrs.pb.js calculates next review → Updates attempt record

Quiz Flow (AI CLI):
User asks AI CLI for review → MCP Server → GET questions (filter: due_at <= now)
User answers in chat → AI evaluates → MCP Server → POST attempt record
```

---

## 4. Components

### 4.1 PocketBase Backend

PocketBase provides the entire backend as a single binary with embedded SQLite.

#### 4.1.1 Directory Structure

```
fastreader-backend/
├── pocketbase              # PocketBase binary (downloaded)
├── pb_data/
│   └── data.db             # SQLite database (auto-created)
├── pb_hooks/
│   ├── fsrs.pb.js          # FSRS spaced repetition algorithm
│   ├── sessions.pb.js      # Milestone detection hooks
│   ├── questions.pb.js     # Question validation hooks
│   └── main.pb.js          # Hook registrations and utilities
├── pb_migrations/          # Auto-generated schema migrations
└── pb_public/              # Optional: serve FastReader SPA
```

#### 4.1.2 Configuration

PocketBase is configured via CLI flags and Dashboard:

```bash
# Start PocketBase
./pocketbase serve --http="127.0.0.1:8090"

# With auto-migration (default, generates migration files on schema changes)
./pocketbase serve --automigrate

# Custom data directory
./pocketbase serve --dir="/path/to/pb_data"
```

**FastReader-specific settings** (stored in PocketBase settings):

```json
{
  "fastreader": {
    "fsrs": {
      "request_retention": 0.9,
      "maximum_interval": 36500,
      "weights": [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
    },
    "ai_assistant": {
      "command": "claude",
      "args": ["--print"],
      "timeout": 300
    }
  }
}
```

### 4.2 JavaScript Hooks (pb_hooks/)

Custom business logic implemented as PocketBase JavaScript hooks.

#### 4.2.1 FSRS Implementation

```javascript
// pb_hooks/fsrs.pb.js

/// <reference path="../pb_data/types.d.ts" />

// FSRS algorithm constants
const DECAY = -0.5;
const FACTOR = 19 / 81;

/**
 * Calculate new stability after review
 * @param {number} d - Current difficulty
 * @param {number} s - Current stability
 * @param {number} rating - User rating (1-4)
 * @returns {number} New stability
 */
function nextStability(d, s, rating) {
    if (rating === 1) {
        // Again - memory lapsed
        return Math.max(0.1, s * 0.2);
    }

    const hardPenalty = (rating === 2) ? 1.2 : 1;
    const easyBonus = (rating === 4) ? 1.3 : 1;

    return s * (1 + Math.exp(11.0) *
        Math.pow(d, -0.5) *
        (Math.pow(s, -0.2) - 1) *
        hardPenalty * easyBonus);
}

/**
 * Calculate new difficulty after review
 * @param {number} d - Current difficulty
 * @param {number} rating - User rating (1-4)
 * @returns {number} New difficulty (clamped 1-10)
 */
function nextDifficulty(d, rating) {
    const delta = (rating - 3) * 0.5;
    return Math.min(10, Math.max(1, d + delta));
}

/**
 * Calculate interval in days until next review
 * @param {number} s - Stability
 * @param {number} requestedRetention - Target retention rate
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
        return currentState === 0 ? 1 : 3; // Learning or Relearning
    }
    if (currentState === 0 || currentState === 1) {
        return rating >= 3 ? 2 : 1; // Graduate to Review or stay Learning
    }
    if (currentState === 3) {
        return rating >= 3 ? 2 : 3; // Graduate back or stay Relearning
    }
    return 2; // Stay in Review
}

// Hook: After creating a question attempt, calculate FSRS values
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    const rating = record.getInt("rating");

    if (!rating || rating < 1 || rating > 4) {
        return; // No rating provided, skip FSRS calculation
    }

    // Get current values (may be from previous attempt or defaults)
    let stability = record.getFloat("stability") || 1.0;
    let difficulty = record.getFloat("difficulty") || 5.0;
    let state = record.getInt("state") || 0;
    let reps = record.getInt("reps") || 0;
    let lapses = record.getInt("lapses") || 0;

    // Calculate new values
    const newStability = nextStability(difficulty, stability, rating);
    const newDifficulty = nextDifficulty(difficulty, rating);
    const newState = nextState(state, rating);
    const interval = nextInterval(newStability, 0.9);

    // Calculate next review date
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + interval);

    // Update counters
    reps += 1;
    if (rating === 1) {
        lapses += 1;
    }

    // Update the record
    record.set("stability", newStability);
    record.set("difficulty", newDifficulty);
    record.set("state", newState);
    record.set("due_at", dueAt.toISOString());
    record.set("reps", reps);
    record.set("lapses", lapses);

    $app.save(record);
}, "question_attempts");

module.exports = {
    nextStability,
    nextDifficulty,
    nextInterval,
    nextState
};
```

#### 4.2.2 Session Milestone Detection

```javascript
// pb_hooks/sessions.pb.js

/// <reference path="../pb_data/types.d.ts" />

const MILESTONES = [25, 50, 75, 100];

// Hook: After updating a session, check for milestones
onRecordAfterUpdateSuccess((e) => {
    const session = e.record;
    const progress = session.getFloat("progress_percent");

    // Find the highest milestone reached
    const reachedMilestones = MILESTONES.filter(m => progress >= m);
    if (reachedMilestones.length === 0) return;

    const highestMilestone = Math.max(...reachedMilestones);

    // Check if this milestone already exists
    const existing = $app.findFirstRecordByFilter(
        "session_milestones",
        `session = "${session.id}" && milestone_percent = ${highestMilestone}`
    );

    if (existing) return; // Already recorded

    // Create milestone record
    const collection = $app.findCollectionByNameOrId("session_milestones");
    const milestone = new Record(collection, {
        session: session.id,
        milestone_percent: highestMilestone,
        quiz_prompted: false,
        quiz_completed: false
    });

    $app.save(milestone);
}, "sessions");
```

### 4.3 MCP Server (Node.js)

A thin wrapper that translates MCP protocol calls to PocketBase REST API calls.

#### 4.3.1 Directory Structure

```
fastreader-mcp/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── tools.ts                 # Tool definitions
│   └── pocketbase-client.ts     # PocketBase API client
├── package.json
├── tsconfig.json
└── README.md
```

#### 4.3.2 Tool Definitions

The MCP server exposes the following tools to AI CLIs:

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `fastreader_get_current_session` | Get active reading session with document text and progress | None |
| `fastreader_get_document` | Get a specific document by ID | `documentId: string` |
| `fastreader_list_documents` | List all documents with metadata | `limit?: number, offset?: number` |
| `fastreader_get_question_history` | Get previously asked questions for deduplication | `documentId: string` |
| `fastreader_save_questions` | Save generated questions to database | `documentId: string, questions: Question[]` |
| `fastreader_record_answer` | Record user's answer and update spaced repetition | `questionId: string, answer: string, isCorrect: boolean, rating?: number` |
| `fastreader_get_due_questions` | Get questions due for spaced repetition review | `limit?: number` |
| `fastreader_get_session_stats` | Get reading and quiz statistics | `documentId?: string` |

### 4.4 Text Extractor (fastreader-extract)

A standalone Go binary for extracting text from PDFs and URLs.

#### 4.4.1 Directory Structure

```
fastreader-extract/
├── cmd/
│   └── fastreader-extract/
│       └── main.go              # Entry point
├── internal/
│   ├── pdf/
│   │   └── extractor.go         # PDF text extraction
│   └── url/
│       └── extractor.go         # URL content extraction
├── go.mod
├── go.sum
└── Makefile
```

#### 4.4.2 Usage

```bash
# Extract from URL
fastreader-extract url "https://example.com/article" --output json

# Extract from PDF
fastreader-extract pdf document.pdf --output json

# Extract from URL with custom title
fastreader-extract url "https://example.com/article" --title "Custom Title" --output json
```

#### 4.4.3 Output Format

```json
{
  "title": "Article Title",
  "content": "Extracted text content...",
  "word_count": 1542,
  "source_type": "url",
  "source_path": "https://example.com/article"
}
```

---

## 5. Data Models

### 5.1 PocketBase Collections

Collections are defined via PocketBase Dashboard or JavaScript migrations. Below is the schema specification.

#### 5.1.1 `documents` Collection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | Text | Yes | Document title |
| content | Text | Yes | Full text content |
| source_type | Select | Yes | Options: `paste`, `file`, `url` |
| source_path | Text | No | Original file path or URL |
| file_type | Select | No | Options: `txt`, `md`, `pdf` |
| word_count | Number | Yes | Total words in document |

**API Rules:**
- List: Allow all
- View: Allow all
- Create: Allow all
- Update: Allow all
- Delete: Allow all

#### 5.1.2 `sessions` Collection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| document | Relation | Yes | → documents |
| current_word_index | Number | No | Default: 0 |
| total_words | Number | Yes | From document.word_count |
| progress_percent | Number | No | Default: 0.0 |
| wpm_setting | Number | No | Default: 300 |
| chunk_size | Number | No | Default: 1 |
| is_active | Bool | No | Default: true |
| completed_at | DateTime | No | Set when finished |

**API Rules:**
- List: Allow all
- View: Allow all
- Create: Allow all
- Update: Allow all
- Delete: Allow all

#### 5.1.3 `questions` Collection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| document | Relation | Yes | → documents |
| session | Relation | No | → sessions |
| question_text | Text | Yes | The question being asked |
| question_type | Select | Yes | `multiple_choice`, `short_answer`, `fill_in_blank` |
| comprehension_type | Select | Yes | `factual_recall`, `inference`, `synthesis` |
| difficulty | Select | No | `easy`, `medium`, `hard` |
| options | JSON | No | For MCQ: `{"A": "...", "B": "...", "C": "...", "D": "..."}` |
| correct_answer | Text | Yes | For MCQ: letter; for others: model answer |
| distractor_explanations | JSON | No | For MCQ: explanations per option |
| ideal_answer | Text | No | For short_answer: model response |
| acceptable_variations | JSON | No | Array of alternative correct phrasings |
| required_concepts | JSON | No | Array of concepts that must appear |
| scoring_rubric | JSON | No | `{full_credit, partial_credit, no_credit}` |
| sentence_with_blank | Text | No | For fill_in_blank format |
| correct_answers | JSON | No | Array of acceptable fill-in answers |
| context_hint | Text | No | Optional hint for answer location |
| rationale | Text | Yes | Explanation of correct answer |
| passage_evidence | Text | No | Supporting quote from passage |
| passage_location | Text | No | Paragraph/section reference |
| chunk_start_index | Number | No | Word position where relevant text starts |
| chunk_end_index | Number | No | Word position where relevant text ends |

**API Rules:**
- List: Allow all
- View: Allow all
- Create: Allow all
- Update: Allow all
- Delete: Allow all

#### 5.1.4 `question_attempts` Collection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| question | Relation | Yes | → questions |
| user_answer | Text | No | User's response |
| is_correct | Bool | No | Whether answer was correct |
| time_spent_ms | Number | No | Time to answer in milliseconds |
| rating | Number | No | FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy |
| stability | Number | No | FSRS stability value |
| difficulty | Number | No | FSRS difficulty value (1-10) |
| due_at | DateTime | No | Next scheduled review |
| state | Number | No | 0=New, 1=Learning, 2=Review, 3=Relearning |
| reps | Number | No | Total review count |
| lapses | Number | No | Times forgotten (rating=1) |

**API Rules:**
- List: Allow all
- View: Allow all
- Create: Allow all
- Update: Allow all (needed for FSRS hook)
- Delete: Allow all

**Note:** The `pb_hooks/fsrs.pb.js` hook automatically calculates and updates FSRS fields after creation.

#### 5.1.5 `session_milestones` Collection

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| session | Relation | Yes | → sessions |
| milestone_percent | Number | Yes | 25, 50, 75, or 100 |
| quiz_prompted | Bool | No | Default: false |
| quiz_completed | Bool | No | Default: false |

**API Rules:**
- List: Allow all
- View: Allow all
- Create: Allow all
- Update: Allow all
- Delete: Allow all

**Unique constraint:** `session` + `milestone_percent`

### 5.2 TypeScript Types

```typescript
// Shared types for FastReader and MCP Server

interface Document {
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

interface Session {
  id: string;
  document: string;  // Relation ID
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

interface Question {
  id: string;
  document: string;
  session?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'fill_in_blank';
  comprehension_type: 'factual_recall' | 'inference' | 'synthesis';
  difficulty?: 'easy' | 'medium' | 'hard';

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

interface QuestionAttempt {
  id: string;
  question: string;
  user_answer?: string;
  is_correct?: boolean;
  time_spent_ms?: number;
  rating?: 1 | 2 | 3 | 4;
  stability: number;
  difficulty: number;
  due_at?: string;
  state: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
  created: string;
}

interface SessionMilestone {
  id: string;
  session: string;
  milestone_percent: 25 | 50 | 75 | 100;
  quiz_prompted: boolean;
  quiz_completed: boolean;
  created: string;
}

// Expanded types for API responses
interface SessionWithDocument extends Session {
  expand?: {
    document: Document;
  };
}

interface QuestionWithAttempts extends Question {
  expand?: {
    question_attempts_via_question?: QuestionAttempt[];
  };
}
```

---

## 6. API Specification

PocketBase provides a complete REST API out of the box. Below documents the endpoints used by FastReader and the MCP server.

### 6.1 Base URL

```
http://127.0.0.1:8090/api
```

### 6.2 Authentication

For single-user local deployment, authentication is optional. If needed:

```bash
# Create admin user
./pocketbase superuser create admin@localhost password123
```

API calls can then include the auth token:
```
Authorization: Bearer <token>
```

### 6.3 Standard CRUD Endpoints

PocketBase provides these endpoints for each collection:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/collections/{name}/records` | List records with filtering, sorting, pagination |
| `POST` | `/collections/{name}/records` | Create new record |
| `GET` | `/collections/{name}/records/{id}` | Get single record |
| `PATCH` | `/collections/{name}/records/{id}` | Update record |
| `DELETE` | `/collections/{name}/records/{id}` | Delete record |

### 6.4 Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `filter` | Filter expression | `filter=is_active=true` |
| `sort` | Sort fields (- for desc) | `sort=-created,title` |
| `page` | Page number | `page=1` |
| `perPage` | Items per page | `perPage=30` |
| `expand` | Expand relations | `expand=document,session` |
| `fields` | Select specific fields | `fields=id,title,created` |

### 6.5 Common API Patterns

#### Get Current Active Session

```http
GET /api/collections/sessions/records?filter=is_active=true&sort=-updated&perPage=1&expand=document
```

#### Get Questions for Document

```http
GET /api/collections/questions/records?filter=document="{docId}"&sort=-created
```

#### Get Due Questions for Review

```http
GET /api/collections/question_attempts/records?filter=due_at<="{now}"&sort=due_at&expand=question
```

**Note:** This requires a view or custom query to get the latest attempt per question. Alternative approach: query questions and filter in application code.

#### Create Document

```http
POST /api/collections/documents/records
Content-Type: application/json

{
  "title": "Chapter 1",
  "content": "The full text...",
  "source_type": "paste",
  "word_count": 1542
}
```

#### Save Generated Questions

```http
POST /api/collections/questions/records
Content-Type: application/json

{
  "document": "DOCUMENT_ID",
  "session": "SESSION_ID",
  "question_text": "What is the main argument?",
  "question_type": "multiple_choice",
  "comprehension_type": "inference",
  "difficulty": "medium",
  "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
  "correct_answer": "B",
  "rationale": "The author explicitly states..."
}
```

#### Record Answer Attempt

```http
POST /api/collections/question_attempts/records
Content-Type: application/json

{
  "question": "QUESTION_ID",
  "user_answer": "B",
  "is_correct": true,
  "rating": 3,
  "time_spent_ms": 15000
}
```

The FSRS hook will automatically populate `stability`, `difficulty`, `due_at`, `state`, `reps`, and `lapses`.

### 6.6 Real-Time Subscriptions (SSE)

PocketBase provides Server-Sent Events for real-time updates.

**Endpoint:** `/api/realtime`

**JavaScript Client:**
```typescript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Subscribe to all question changes
pb.collection('questions').subscribe('*', (e) => {
  console.log(e.action); // 'create', 'update', or 'delete'
  console.log(e.record); // The affected record
});

// Subscribe to specific document's questions
pb.collection('questions').subscribe('*', (e) => {
  if (e.record.document === currentDocId) {
    handleNewQuestion(e.record);
  }
});

// Unsubscribe
pb.collection('questions').unsubscribe('*');
```

---

## 7. MCP Server Specification

### 7.1 Installation

```bash
# Add to Claude Code
claude mcp add fastreader -- npx @anthropic/fastreader-mcp

# Or with local installation
npm install -g @anthropic/fastreader-mcp
claude mcp add fastreader -- fastreader-mcp

# For other AI CLIs (example for hypothetical opencode)
opencode mcp add fastreader -- npx @anthropic/fastreader-mcp
```

### 7.2 Tool Implementations

```typescript
// src/tools.ts

export const tools = [
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
              questionType: { type: "string", enum: ["multiple_choice", "short_answer", "fill_in_blank"] },
              comprehensionType: { type: "string", enum: ["factual_recall", "inference", "synthesis"] },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              options: { type: "object" },
              correctAnswer: { type: "string" },
              distractorExplanations: { type: "object" },
              idealAnswer: { type: "string" },
              acceptableVariations: { type: "array", items: { type: "string" } },
              requiredConcepts: { type: "array", items: { type: "string" } },
              scoringRubric: { type: "object" },
              sentenceWithBlank: { type: "string" },
              correctAnswers: { type: "array", items: { type: "string" } },
              contextHint: { type: "string" },
              rationale: { type: "string" },
              passageEvidence: { type: "string" },
              passageLocation: { type: "string" },
              chunkStartIndex: { type: "number" },
              chunkEndIndex: { type: "number" }
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

### 7.3 MCP Server Implementation

```typescript
// src/index.ts

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import PocketBase from 'pocketbase';
import { tools } from "./tools.js";

const POCKETBASE_URL = process.env.FASTREADER_API_URL || "http://127.0.0.1:8090";

const pb = new PocketBase(POCKETBASE_URL);

// Helper to convert camelCase to snake_case for PocketBase
function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

const server = new Server(
  { name: "fastreader", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "fastreader_get_current_session": {
        const sessions = await pb.collection('sessions').getList(1, 1, {
          filter: 'is_active = true',
          sort: '-updated',
          expand: 'document'
        });
        if (sessions.items.length === 0) {
          result = { error: "No active session found" };
        } else {
          const session = sessions.items[0];
          const milestones = await pb.collection('session_milestones').getList(1, 100, {
            filter: `session = "${session.id}"`
          });
          result = {
            session,
            document: session.expand?.document,
            milestones: milestones.items,
            pendingQuizMilestone: milestones.items.find(m => !m.quiz_completed)?.milestone_percent
          };
        }
        break;
      }

      case "fastreader_get_document": {
        result = await pb.collection('documents').getOne(args.documentId);
        break;
      }

      case "fastreader_list_documents": {
        const page = args.offset ? Math.floor(args.offset / (args.limit || 50)) + 1 : 1;
        result = await pb.collection('documents').getList(page, args.limit || 50, {
          sort: '-created'
        });
        break;
      }

      case "fastreader_get_question_history": {
        result = await pb.collection('questions').getList(1, 500, {
          filter: `document = "${args.documentId}"`,
          sort: '-created'
        });
        break;
      }

      case "fastreader_save_questions": {
        const saved = [];
        for (const q of args.questions) {
          const record = await pb.collection('questions').create({
            document: args.documentId,
            session: args.sessionId,
            ...toSnakeCase(q)
          });
          saved.push({ id: record.id, questionText: q.questionText });
        }
        result = { saved: saved.length, questions: saved };
        break;
      }

      case "fastreader_record_answer": {
        const attempt = await pb.collection('question_attempts').create({
          question: args.questionId,
          user_answer: args.userAnswer,
          is_correct: args.isCorrect,
          rating: args.rating,
          time_spent_ms: args.timeSpentMs
        });
        // Fetch updated record (FSRS hook may have updated it)
        const updated = await pb.collection('question_attempts').getOne(attempt.id);
        result = {
          attemptId: updated.id,
          questionId: args.questionId,
          isCorrect: updated.is_correct,
          nextReview: {
            dueAt: updated.due_at,
            stability: updated.stability,
            state: updated.state
          }
        };
        break;
      }

      case "fastreader_get_due_questions": {
        const now = new Date().toISOString();
        let filter = `due_at <= "${now}"`;
        if (args.documentId) {
          filter += ` && question.document = "${args.documentId}"`;
        }
        const attempts = await pb.collection('question_attempts').getList(1, args.limit || 20, {
          filter,
          sort: 'due_at',
          expand: 'question'
        });
        result = {
          questions: attempts.items.map(a => ({
            ...a.expand?.question,
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
        const docs = await pb.collection('documents').getList(1, 1);
        const questions = await pb.collection('questions').getList(1, 1);
        const attempts = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'is_correct = true'
        });
        const totalAttempts = await pb.collection('question_attempts').getList(1, 1);

        result = {
          totalDocuments: docs.totalItems,
          totalQuestionsGenerated: questions.totalItems,
          totalQuestionsAnswered: totalAttempts.totalItems,
          correctAnswerRate: totalAttempts.totalItems > 0
            ? attempts.totalItems / totalAttempts.totalItems
            : 0
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

    // Check for common errors
    if (message.includes('ECONNREFUSED')) {
      return {
        content: [{
          type: "text",
          text: "Error: PocketBase is not running. Please start it with: ./pocketbase serve"
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error: ${message}`
      }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FastReader MCP server running");
}

main().catch(console.error);
```

---

## 8. User Flows

### 8.1 Initial Setup

```
1. User downloads binaries from GitHub releases
   ├── pocketbase (or downloads separately from pocketbase.io)
   └── fastreader-extract

2. User starts PocketBase
   $ ./pocketbase serve
   > PocketBase server running on http://127.0.0.1:8090
   > Admin UI: http://127.0.0.1:8090/_/

3. User creates collections via Admin UI (first time only)
   └── Or imports provided schema migration

4. User adds MCP server to their AI CLI
   $ claude mcp add fastreader -- npx @anthropic/fastreader-mcp
   > Added MCP server: fastreader

5. User opens FastReader in browser
   > FastReader detects PocketBase at localhost:8090
   > Shows "Connected" indicator
   > Subscribes to real-time updates via SSE
```

### 8.2 Reading with In-App Question Generation

This is the primary user flow enabled by real-time sync:

```
1. User pastes/imports text into FastReader
   └── Document created in PocketBase
   └── New session started

2. User begins RSVP reading at chosen WPM

3. At 25% progress:
   └── pb_hooks/sessions.pb.js creates milestone record
   └── FastReader receives SSE event
   └── Shows "Quiz available" badge

4. User clicks "Generate Quiz" button in FastReader:
   └── FastReader shows "Generating questions..." overlay
   └── FastReader spawns AI CLI in background:
       spawn('claude', ['--print', 'Generate 5 comprehension questions...'])

5. AI CLI executes:
   └── Calls fastreader_get_current_session via MCP
   └── Gets document text and progress
   └── Calls fastreader_get_question_history via MCP
   └── Generates 5 questions avoiding duplicates
   └── Calls fastreader_save_questions via MCP
   └── Questions saved to PocketBase

6. PocketBase emits SSE events for new questions
   └── FastReader receives events instantly
   └── "Generating..." overlay closes
   └── Quiz modal appears with questions

7. User answers questions in FastReader UI:
   └── Selects MCQ answers or types responses
   └── Submits answer → creates question_attempt
   └── FSRS hook calculates next review
   └── Shows feedback with explanation

8. User continues reading to next milestone...
```

### 8.3 On-Demand Question Generation (CLI)

```
1. User is reading in FastReader

2. User opens terminal and starts AI CLI:
   $ claude "I want to test my understanding of what I just read"

3. AI CLI:
   └── Calls fastreader_get_current_session
   └── Sees user is at 42% through "Chapter 3: The Industrial Revolution"
   └── Calls fastreader_get_question_history (finds 8 existing questions)
   └── Generates 5 new questions focused on recently read section
   └── Calls fastreader_save_questions
   └── Presents questions in conversation

4. FastReader (in background):
   └── Receives SSE events for new questions
   └── Updates quiz badge silently

5. User answers in AI CLI conversation:
   User: "I think the answer is B"
   Claude: "That's correct! [explanation]... How would you rate that question?"
   User: "It was medium difficulty"
   └── Claude calls fastreader_record_answer with rating=3 (Good)

6. After quiz:
   Claude: "You got 4/5 correct. Your next review for these questions is scheduled."
```

### 8.4 Spaced Repetition Review

```
1. User opens AI CLI for daily review:
   $ claude "What questions do I have due for review?"

2. AI CLI:
   └── Calls fastreader_get_due_questions
   └── Returns 7 questions due across 3 documents

3. Claude: "You have 7 questions due for review:
   - 3 from 'Chapter 1: Introduction'
   - 2 from 'The Art of War'
   - 2 from 'Economics 101'
   Would you like to review all of them or focus on a specific document?"

4. User: "Let's do all of them"

5. Claude presents questions one by one:
   └── Shows question
   └── User answers
   └── Claude evaluates and records with FSRS rating
   └── Shows next question

6. After review:
   Claude: "Review complete!
   - 6/7 correct
   - Next reviews: 2 tomorrow, 3 in 3 days, 2 in a week"
```

### 8.5 Document Import from URL/PDF

```
1. User has a PDF or wants to import web article

2. Option A - CLI extraction:
   $ fastreader-extract url "https://example.com/article" > article.json
   $ curl -X POST http://localhost:8090/api/collections/documents/records \
       -H "Content-Type: application/json" \
       -d @article.json

3. Option B - FastReader UI (calls extractor):
   └── User clicks "Import" → "From URL"
   └── Enters URL
   └── FastReader calls fastreader-extract internally
   └── Document created and session started

4. User begins reading the imported content
```

---

## 9. FastReader UI Changes

### 9.1 New Components

#### 9.1.1 Backend Status Indicator

```
┌─────────────────────────────────────────────────────┐
│  FastReader                    [●] Connected  [⚙]  │
└─────────────────────────────────────────────────────┘

States:
- [●] Connected (green) - PocketBase running, SSE active
- [○] Disconnected (gray) - PocketBase not running
- [!] Error (red) - Connection error
- [↻] Reconnecting (yellow) - SSE reconnecting
```

#### 9.1.2 Quiz Generation Button

```
┌─────────────────────────────────────────────────────┐
│  Progress: 47%  ████████░░░░░░░░░  [Generate Quiz]  │
└─────────────────────────────────────────────────────┘

When clicked:
┌─────────────────────────────────────────────────────┐
│  Progress: 47%  ████████░░░░░░░░░  [Generating...]  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  🤖 Generating questions with Claude...     │   │
│  │                                              │   │
│  │  This may take 30-60 seconds.               │   │
│  │                                              │   │
│  │  [Cancel]                                    │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

#### 9.1.3 Quiz Milestone Prompt

Appears when milestone is reached (via SSE event):

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│          ┌─────────────────────────────┐           │
│          │   25% Complete              │           │
│          │   ────────────────────      │           │
│          │   Ready for a quiz?         │           │
│          │                             │           │
│          │   [Generate Quiz]  [Later]  │           │
│          └─────────────────────────────┘           │
│                                                     │
│              [current word display]                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 9.1.4 Quiz Modal (Multiple Choice)

```
┌─────────────────────────────────────────────────────────────────┐
│  Quiz: Chapter 1 - Introduction                    [X] Close   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Question 2 of 5 (Multiple Choice)               [Inference]   │
│                                           Progress: ██░░░ 40%  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  What is the main argument presented in the first       │   │
│  │  section of this chapter?                                │   │
│  │                                                          │   │
│  │  ○ A) The author argues for increased regulation        │   │
│  │  ● B) The author challenges conventional wisdom         │   │
│  │  ○ C) The author provides statistical analysis          │   │
│  │  ○ D) The author presents a historical overview         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Previous]                              [Submit Answer →]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.1.5 Answer Feedback

```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Correct!                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  The author indeed challenges conventional wisdom by            │
│  presenting evidence that contradicts the commonly held...      │
│                                                                 │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  How difficult was this question?                               │
│                                                                 │
│  [Again]    [Hard]    [Good]    [Easy]                         │
│  (forgot)   (struggled) (ok)    (too easy)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 State Management

```typescript
// src/contexts/ComprehensionContext.tsx

import PocketBase from 'pocketbase';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ComprehensionState {
  // Connection
  backendConnected: boolean;
  sseConnected: boolean;

  // Current session
  currentSession: Session | null;
  currentDocument: Document | null;

  // Quiz state
  pendingMilestone: number | null;
  currentQuiz: {
    questions: Question[];
    currentIndex: number;
    answers: Map<string, QuestionAttempt>;
  } | null;
  isGenerating: boolean;

  // Actions
  generateQuiz: (count?: number) => Promise<void>;
  submitAnswer: (questionId: string, answer: string, rating: number) => Promise<void>;
  dismissMilestone: () => void;
}

const pb = new PocketBase('http://127.0.0.1:8090');

export function ComprehensionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComprehensionState>({...});

  useEffect(() => {
    // Subscribe to questions collection
    pb.collection('questions').subscribe('*', (e) => {
      if (e.action === 'create' && e.record.session === state.currentSession?.id) {
        // New question for current session - add to quiz
        setState(prev => ({
          ...prev,
          currentQuiz: prev.currentQuiz ? {
            ...prev.currentQuiz,
            questions: [...prev.currentQuiz.questions, e.record]
          } : {
            questions: [e.record],
            currentIndex: 0,
            answers: new Map()
          },
          isGenerating: false
        }));
      }
    });

    // Subscribe to milestones
    pb.collection('session_milestones').subscribe('*', (e) => {
      if (e.action === 'create' && e.record.session === state.currentSession?.id) {
        setState(prev => ({
          ...prev,
          pendingMilestone: e.record.milestone_percent
        }));
      }
    });

    return () => {
      pb.collection('questions').unsubscribe('*');
      pb.collection('session_milestones').unsubscribe('*');
    };
  }, [state.currentSession?.id]);

  const generateQuiz = async (count = 5) => {
    setState(prev => ({ ...prev, isGenerating: true }));

    // Spawn AI CLI in background
    const config = await getConfig(); // Get from settings or localStorage
    const proc = spawn(config.ai_assistant.command, [
      ...config.ai_assistant.args,
      `Generate ${count} comprehension questions for my current FastReader session. ` +
      `Focus on the content I've read so far (${state.currentSession?.progress_percent}% progress). ` +
      `Save the questions using the fastreader_save_questions tool.`
    ]);

    // Set timeout
    const timeout = setTimeout(() => {
      proc.kill();
      setState(prev => ({ ...prev, isGenerating: false }));
    }, config.ai_assistant.timeout * 1000);

    proc.on('exit', () => {
      clearTimeout(timeout);
      // Questions will arrive via SSE, isGenerating cleared when first question arrives
    });
  };

  // ... rest of implementation
}
```

### 9.3 CLI Spawning Service

```typescript
// src/services/aiCli.ts

import { spawn, ChildProcess } from 'child_process';

interface AICliConfig {
  command: string;
  args: string[];
  timeout: number;
}

const DEFAULT_CONFIG: AICliConfig = {
  command: 'claude',
  args: ['--print'],
  timeout: 300
};

export class AICliService {
  private config: AICliConfig;
  private activeProcess: ChildProcess | null = null;

  constructor(config: Partial<AICliConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateQuestions(sessionId: string, count: number): Promise<void> {
    if (this.activeProcess) {
      throw new Error('Question generation already in progress');
    }

    const prompt = `Generate ${count} comprehension questions for my current FastReader session. ` +
      `Use the fastreader_get_current_session tool to get the document and progress, ` +
      `use fastreader_get_question_history to avoid duplicates, ` +
      `then save questions using fastreader_save_questions.`;

    return new Promise((resolve, reject) => {
      this.activeProcess = spawn(this.config.command, [
        ...this.config.args,
        prompt
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const timeout = setTimeout(() => {
        this.cancel();
        reject(new Error('Question generation timed out'));
      }, this.config.timeout * 1000);

      this.activeProcess.on('exit', (code) => {
        clearTimeout(timeout);
        this.activeProcess = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`AI CLI exited with code ${code}`));
        }
      });

      this.activeProcess.on('error', (err) => {
        clearTimeout(timeout);
        this.activeProcess = null;
        reject(err);
      });
    });
  }

  cancel(): void {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.activeProcess = null;
    }
  }

  isRunning(): boolean {
    return this.activeProcess !== null;
  }
}
```

---

## 10. Question Generation

This section defines the prompt engineering architecture for generating high-quality reading comprehension questions. See the original specification for full details on composable templates and few-shot examples.

### 10.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Explicit instruction primacy** | Lead with action verbs. Specify desired behavior positively. |
| **Few-shot examples are essential** | Include 3-5 diverse examples per question type. |
| **Chain-of-thought for cognitive alignment** | Prompt to reason before generating. |
| **Structured output via prompt specification** | Embed complete JSON schema in prompt. |
| **Moderate complexity beats maximal** | Skill definitions + 1-2 examples improves quality ~15%. |
| **Ground truth rationale as output** | Require explanations alongside answers. |

### 10.2 Question Distribution

| Comprehension Type | Target % | Description |
|--------------------|----------|-------------|
| Factual Recall | ~40% | Explicit information retrieval |
| Inference | ~40% | Drawing conclusions not explicitly stated |
| Synthesis | ~20% | Integrating multiple parts of passage |

### 10.3 Deduplication

Before generating questions, the AI should:

1. Fetch existing questions via `fastreader_get_question_history`
2. Compare semantic similarity of new questions to existing ones
3. Avoid questions that:
   - Ask about the same specific fact
   - Use similar wording (>70% overlap)
   - Test the same concept from the same angle

---

## 11. Spaced Repetition System

### 11.1 Algorithm: FSRS

We implement FSRS (Free Spaced Repetition Scheduler) via JavaScript hooks.

#### 11.1.1 Core Concepts

| Term | Description |
|------|-------------|
| **Stability** | How long a memory will last (in days) |
| **Difficulty** | Inherent difficulty of the question (1-10) |
| **Retrievability** | Probability of recalling the answer |
| **State** | Learning stage: New → Learning → Review → Relearning |

#### 11.1.2 Rating Scale

| Rating | Name | When to Use |
|--------|------|-------------|
| 1 | Again | Complete blackout, couldn't recall |
| 2 | Hard | Recalled with significant difficulty |
| 3 | Good | Recalled with some effort |
| 4 | Easy | Instant recall, too easy |

#### 11.1.3 Implementation

The FSRS algorithm is implemented in `pb_hooks/fsrs.pb.js` (see Section 4.2.1). Key calculations:

```javascript
// Stability increases with successful reviews, decreases on failure
newStability = rating === 1
  ? s * 0.2  // Forgot - significant decrease
  : s * (1 + exp(11) * d^(-0.5) * (s^(-0.2) - 1) * penalties * bonuses)

// Difficulty adjusts based on rating relative to "Good" (3)
newDifficulty = clamp(d + (rating - 3) * 0.5, 1, 10)

// Interval calculated from stability and target retention
interval = round(stability * ln(targetRetention) / ln(0.9))
```

### 11.2 Review Scheduling

- Questions become due when `current_time >= due_at`
- Due questions sorted by: overdue first, then by due_at
- The hook automatically updates `due_at` after each attempt

---

## 12. Distribution & Installation

### 12.1 Required Binaries

| Binary | Source | Purpose |
|--------|--------|---------|
| `pocketbase` | pocketbase.io | Backend server |
| `fastreader-extract` | GitHub releases | PDF/URL extraction |

### 12.2 PocketBase Installation

```bash
# Download from pocketbase.io/docs
# Or use package manager:

# macOS
brew install pocketbase/tap/pocketbase

# Linux (manual)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.23.0/pocketbase_0.23.0_linux_amd64.zip
unzip pocketbase_0.23.0_linux_amd64.zip

# Start server
./pocketbase serve
```

### 12.3 fastreader-extract Installation

```bash
# Download from GitHub releases
curl -L https://github.com/username/fastreader/releases/latest/download/fastreader-extract-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o fastreader-extract
chmod +x fastreader-extract
sudo mv fastreader-extract /usr/local/bin/
```

**Build Targets:**

| Platform | Binary Name |
|----------|-------------|
| Linux amd64 | `fastreader-extract-linux-amd64` |
| Linux arm64 | `fastreader-extract-linux-arm64` |
| macOS amd64 | `fastreader-extract-darwin-amd64` |
| macOS arm64 | `fastreader-extract-darwin-arm64` |
| Windows amd64 | `fastreader-extract-windows-amd64.exe` |

### 12.4 MCP Server Installation

```bash
# Via npx (no install)
claude mcp add fastreader -- npx @anthropic/fastreader-mcp

# Or global install
npm install -g @anthropic/fastreader-mcp
claude mcp add fastreader -- fastreader-mcp
```

### 12.5 FastReader Configuration

FastReader needs to know where PocketBase is running:

```typescript
// Environment variable or localStorage
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL
  || localStorage.getItem('pocketbase_url')
  || 'http://127.0.0.1:8090';
```

### 12.6 Quick Start

```bash
# 1. Start PocketBase
./pocketbase serve

# 2. Import schema (first time)
./pocketbase migrate up

# 3. Add MCP server to AI CLI
claude mcp add fastreader -- npx @anthropic/fastreader-mcp

# 4. Open FastReader
open http://localhost:5173  # or wherever FastReader is served
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation

**Goal**: PocketBase + basic question storage

| Task | Component | Priority |
|------|-----------|----------|
| Download and configure PocketBase | Backend | P0 |
| Create collections via Dashboard or migrations | Backend | P0 |
| Implement FSRS hook | pb_hooks | P0 |
| Implement milestone detection hook | pb_hooks | P0 |
| Basic MCP server with core tools | fastreader-mcp | P0 |
| FastReader: PocketBase client integration | FastReader | P0 |
| FastReader: SSE subscription setup | FastReader | P0 |
| FastReader: Save documents to PocketBase | FastReader | P0 |

**Deliverable**: User can read in FastReader, ask AI CLI for questions, questions sync back via SSE.

### Phase 2: In-App Generation

**Goal**: Generate questions from FastReader UI

| Task | Component | Priority |
|------|-----------|----------|
| CLI spawner service | FastReader | P1 |
| "Generate Quiz" button and overlay | FastReader | P1 |
| Quiz modal component | FastReader | P1 |
| MCQ question component | FastReader | P1 |
| Answer submission to PocketBase | FastReader | P1 |
| Answer feedback with FSRS rating | FastReader | P1 |
| Milestone prompt UI | FastReader | P1 |

**Deliverable**: User can generate and answer questions entirely within FastReader UI.

### Phase 3: Additional Question Types

**Goal**: Short answer and fill-in-blank

| Task | Component | Priority |
|------|-----------|----------|
| Short answer question component | FastReader | P2 |
| Fill-in-blank question component | FastReader | P2 |
| Self-assessment UI | FastReader | P2 |
| AI evaluation integration | FastReader | P2 |

**Deliverable**: All three question types work in FastReader UI.

### Phase 4: Text Extraction

**Goal**: Import from PDF and URL

| Task | Component | Priority |
|------|-----------|----------|
| fastreader-extract CLI | fastreader-extract | P3 |
| PDF extraction (Go) | fastreader-extract | P3 |
| URL extraction (Go) | fastreader-extract | P3 |
| Import UI in FastReader | FastReader | P3 |
| Integration with extractor | FastReader | P3 |

**Deliverable**: Users can import PDFs and web articles.

### Phase 5: Review Dashboard

**Goal**: Spaced repetition management

| Task | Component | Priority |
|------|-----------|----------|
| Review dashboard page | FastReader | P4 |
| Due questions display | FastReader | P4 |
| Review session flow | FastReader | P4 |
| Statistics display | FastReader | P4 |

**Deliverable**: Users can manage and complete spaced repetition reviews in FastReader.

### Phase 6: Polish & Distribution

**Goal**: Easy installation and great UX

| Task | Component | Priority |
|------|-----------|----------|
| GitHub releases for fastreader-extract | fastreader-extract | P5 |
| npm package for MCP server | fastreader-mcp | P5 |
| PocketBase migration scripts | Backend | P5 |
| Installation documentation | All | P5 |
| Error handling improvements | All | P5 |

**Deliverable**: Polished, easy-to-install product.

---

## 14. Future Considerations

### 14.1 Potential Features (Post-MVP)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Cloud sync** | Optional backup/sync via PocketBase S3 | Medium |
| **Multiple AI CLIs** | UI to select/configure preferred CLI | Low |
| **Custom questions** | Allow users to add their own questions | Low |
| **Highlights & notes** | Integrate with existing highlighting features | Medium |
| **Export data** | Export questions/stats to Anki, CSV, etc. | Low |
| **Gamification** | Streaks, achievements, XP | Medium |
| **Mobile app** | React Native or PWA | High |
| **Reading analytics** | WPM trends, comprehension over time | Medium |

### 14.2 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Backend exposed to network | PocketBase binds to 127.0.0.1 only by default |
| CLI spawning | Only spawn configured command, sanitize inputs |
| Data at rest | SQLite file in user's directory |
| SSE connections | Local only, no auth needed for single-user |

### 14.3 Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Large documents | Stream content, paginate in UI |
| Many questions | PocketBase auto-indexes, paginated queries |
| FSRS calculations | Lightweight JS, sub-millisecond |
| SSE connections | PocketBase handles cleanup automatically |
| CLI spawning | One process at a time, timeout enforcement |

---

## Appendix A: Configuration Reference

### A.1 AI Assistant Configuration

```yaml
# ~/.fastreader/config.yaml (or localStorage in FastReader)

ai_assistant:
  # The CLI command to execute
  command: "claude"

  # Additional arguments (--print for non-interactive mode)
  args: ["--print"]

  # Timeout in seconds before killing the process
  timeout: 300

# Alternative configurations:
#
# For Codex CLI:
# ai_assistant:
#   command: "codex"
#   args: ["--quiet"]
#   timeout: 300
#
# For OpenCode:
# ai_assistant:
#   command: "opencode"
#   args: ["run"]
#   timeout: 300
```

### A.2 PocketBase Settings

Access via Admin Dashboard: `http://127.0.0.1:8090/_/`

| Setting | Location | Default |
|---------|----------|---------|
| Server port | CLI flag `--http` | 8090 |
| Data directory | CLI flag `--dir` | ./pb_data |
| Auto-migrate | CLI flag `--automigrate` | true |

---

## Appendix B: Troubleshooting

### B.1 PocketBase Not Running

```
Error: PocketBase is not running. Please start it with: ./pocketbase serve
```

**Solution:**
```bash
cd /path/to/fastreader-backend
./pocketbase serve
```

### B.2 MCP Server Not Found

```
Error: MCP server 'fastreader' not found
```

**Solution:**
```bash
# Re-add the MCP server
claude mcp add fastreader -- npx @anthropic/fastreader-mcp

# Verify it's registered
claude mcp list
```

### B.3 SSE Connection Lost

FastReader will show "Reconnecting..." status. This is automatic - no action needed. If it persists:

1. Check PocketBase is still running
2. Check browser console for errors
3. Refresh the page

### B.4 Question Generation Timeout

```
Error: Question generation timed out
```

**Solutions:**
1. Increase timeout in config (default 300 seconds)
2. Try generating fewer questions
3. Check AI CLI is properly configured and authenticated

---

*End of Specification*
