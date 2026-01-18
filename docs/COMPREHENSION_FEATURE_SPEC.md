# FastReader Comprehension Feature Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-18

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

Add AI-powered reading comprehension questions to FastReader that challenge users' understanding of texts they've read. The system leverages Claude Code running locally on the user's machine to generate contextually relevant questions, tracks question history to avoid repetition, and implements spaced repetition for long-term retention.

### 1.2 Key Principles

- **Local-first**: All data stored locally on user's machine
- **Open-source**: Fully open-source, no proprietary dependencies
- **Privacy-preserving**: Documents and reading data never leave the user's machine
- **Claude Code native**: Integrates seamlessly with Claude Code via MCP
- **Offline-capable reading**: Core RSVP reading works without AI (questions require Claude Code)

### 1.3 Summary

| Aspect | Decision |
|--------|----------|
| User model | Single user, no authentication |
| Document input | Paste text, file import (.txt, .md, .pdf), URL extraction |
| Quiz interface | Both FastReader UI and Claude Code conversation |
| Question formats | Multiple choice, Short answer (open-ended), Fill-in-the-blank |
| Comprehension types | Factual recall (~40%), Inference (~40%), Synthesis (~20%) |
| Quiz triggers | Milestone prompts (25/50/75/100%) + on-demand |
| Spaced repetition | FSRS-based algorithm for review scheduling |
| Distribution | Go binary download from GitHub releases |
| Backend requirement | Required for all comprehension features |

---

## 2. Goals & Non-Goals

### 2.1 Goals

1. **Improve reading retention**: Help users remember and understand what they read through active recall
2. **Personalized questions**: Generate questions based on the specific text being read, not generic quizzes
3. **Avoid repetition**: Track question history to never ask the same (or semantically similar) question twice
4. **Support long-term learning**: Implement spaced repetition to surface questions at optimal review intervals
5. **Seamless integration**: Work naturally with both FastReader UI and Claude Code workflows
6. **Easy setup**: Single binary download, minimal configuration

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
│  │                   │      HTTP          │                             │  │
│  │   FastReader      │◄──────────────────►│   fastreader-server (Go)   │  │
│  │   (React SPA)     │   localhost:8745   │                             │  │
│  │                   │                    │   ┌─────────────────────┐   │  │
│  │   - RSVP Display  │                    │   │   SQLite Database   │   │  │
│  │   - Quiz Modal    │                    │   │   ~/.fastreader/    │   │  │
│  │   - Progress UI   │                    │   │   fastreader.db     │   │  │
│  │                   │                    │   └─────────────────────┘   │  │
│  └───────────────────┘                    │                             │  │
│                                           └──────────────┬──────────────┘  │
│                                                          │                  │
│  ┌───────────────────┐                    ┌──────────────▼──────────────┐  │
│  │                   │      stdio         │                             │  │
│  │   Claude Code     │◄──────────────────►│   MCP Server (Node.js)     │  │
│  │   CLI             │   JSON-RPC 2.0     │                             │  │
│  │                   │                    │   - Thin HTTP client        │  │
│  │   - Question gen  │                    │   - Calls fastreader-server │  │
│  │   - Evaluation    │                    │   - ~100 lines of code      │  │
│  │   - Review        │                    │                             │  │
│  └───────────────────┘                    └─────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Language | Responsibility |
|-----------|----------|----------------|
| **FastReader** | React/TypeScript | RSVP reading, quiz UI, progress display |
| **fastreader-server** | Go | REST API, SQLite database, business logic |
| **MCP Server** | Node.js/TypeScript | Translate MCP calls to REST API calls for Claude Code |
| **Claude Code** | - | Question generation, answer evaluation, reviews |

### 3.3 Data Flow

```
Document Input Flow:
User → FastReader UI → POST /api/documents → SQLite → Document stored

Question Generation Flow:
User → Claude Code → MCP Server → GET /api/sessions/current → SQLite
                  ↓
Claude generates questions
                  ↓
          MCP Server → POST /api/questions → SQLite → Questions stored

Quiz Flow (FastReader UI):
FastReader → GET /api/sessions/:id/quiz → Questions returned
User answers → POST /api/questions/:id/answer → Attempt recorded + FSRS updated

Quiz Flow (Claude Code):
User asks Claude → MCP Server → GET /api/questions/due → Due questions returned
User answers in chat → Claude evaluates → MCP Server → POST /api/questions/:id/answer
```

---

## 4. Components

### 4.1 fastreader-server (Go)

The main backend service handling all data persistence and business logic.

#### 4.1.1 Directory Structure

```
fastreader-server/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Configuration management
│   ├── db/
│   │   ├── db.go                # SQLite connection
│   │   ├── migrations.go        # Schema migrations
│   │   └── queries.go           # SQL queries
│   ├── handlers/
│   │   ├── documents.go         # Document CRUD
│   │   ├── sessions.go          # Reading session management
│   │   ├── questions.go         # Question storage & retrieval
│   │   └── health.go            # Health check endpoint
│   ├── models/
│   │   ├── document.go
│   │   ├── session.go
│   │   ├── question.go
│   │   └── attempt.go
│   ├── services/
│   │   ├── document_service.go  # Document processing (URL fetch, PDF parse)
│   │   ├── session_service.go
│   │   ├── question_service.go
│   │   └── fsrs_service.go      # Spaced repetition calculations
│   └── router/
│       └── router.go            # HTTP router setup
├── pkg/
│   └── extractor/
│       ├── pdf.go               # PDF text extraction
│       ├── url.go                # URL content extraction
│       └── text.go               # Plain text processing
├── go.mod
├── go.sum
└── Makefile
```

#### 4.1.2 Configuration

```yaml
# ~/.fastreader/config.yaml (auto-created with defaults)
server:
  port: 8745
  host: "127.0.0.1"  # Local only, never expose externally

database:
  path: "~/.fastreader/fastreader.db"

fsrs:
  # FSRS algorithm parameters
  request_retention: 0.9
  maximum_interval: 36500  # 100 years in days
  weights: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
```

### 4.2 MCP Server (Node.js)

A thin wrapper that translates MCP protocol calls to REST API calls.

#### 4.2.1 Directory Structure

```
fastreader-mcp/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── tools.ts                 # Tool definitions
│   └── api-client.ts            # HTTP client for fastreader-server
├── package.json
├── tsconfig.json
└── README.md
```

#### 4.2.2 Tool Definitions

The MCP server exposes the following tools to Claude Code:

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

---

## 5. Data Models

### 5.1 SQLite Schema

```sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Documents table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('paste', 'file', 'url')),
    source_path TEXT,              -- Original file path or URL
    file_type TEXT,                -- 'txt', 'md', 'pdf', or NULL for paste
    word_count INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_created ON documents(created_at DESC);

-- Reading sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    current_word_index INTEGER DEFAULT 0,
    total_words INTEGER NOT NULL,
    progress_percent REAL DEFAULT 0.0,
    wpm_setting INTEGER DEFAULT 300,
    chunk_size INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE INDEX idx_sessions_document ON sessions(document_id);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;

-- Generated questions
CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,

    -- Question content
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'fill_in_blank')),
    comprehension_type TEXT NOT NULL CHECK (comprehension_type IN ('factual_recall', 'inference', 'synthesis')),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),

    -- For multiple_choice format
    options_json TEXT,                    -- JSON object: {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_answer TEXT NOT NULL,         -- For MCQ: "A", "B", etc. For others: model answer
    distractor_explanations_json TEXT,    -- JSON object explaining why each option is correct/incorrect

    -- For short_answer format
    ideal_answer TEXT,                    -- Model answer (1-3 sentences)
    acceptable_variations_json TEXT,      -- JSON array of alternative correct phrasings
    required_concepts_json TEXT,          -- JSON array of concepts that must appear
    scoring_rubric_json TEXT,             -- JSON: {"full_credit": "...", "partial_credit": "...", "no_credit": "..."}

    -- For fill_in_blank format
    sentence_with_blank TEXT,             -- "The _____ was the primary cause of..."
    correct_answers_json TEXT,            -- JSON array of acceptable fill-in answers
    context_hint TEXT,                    -- Optional hint for where to find answer

    -- Required for all formats
    rationale TEXT NOT NULL,              -- Detailed explanation of why the answer is correct
    passage_evidence TEXT,                -- Direct quote(s) from passage supporting answer
    passage_location TEXT,                -- Paragraph number or section reference

    -- Position metadata
    chunk_start_index INTEGER,            -- Word index where relevant text starts
    chunk_end_index INTEGER,              -- Word index where relevant text ends

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_document ON questions(document_id);
CREATE INDEX idx_questions_session ON questions(session_id);
CREATE INDEX idx_questions_comprehension_type ON questions(comprehension_type);

-- Question attempts and spaced repetition state
CREATE TABLE question_attempts (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

    -- Attempt data
    user_answer TEXT,
    is_correct BOOLEAN,
    time_spent_ms INTEGER,
    rating INTEGER CHECK (rating BETWEEN 1 AND 4),  -- 1=Again, 2=Hard, 3=Good, 4=Easy

    -- FSRS spaced repetition fields
    stability REAL DEFAULT 0.0,
    difficulty REAL DEFAULT 0.0,
    due_at DATETIME,
    state INTEGER DEFAULT 0 CHECK (state BETWEEN 0 AND 3),  -- 0=New, 1=Learning, 2=Review, 3=Relearning
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    last_review_at DATETIME,

    -- Timestamps
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attempts_question ON question_attempts(question_id);
CREATE INDEX idx_attempts_due ON question_attempts(due_at) WHERE due_at IS NOT NULL;

-- Track which questions have been asked to avoid repetition
-- (Latest attempt per question determines current spaced rep state)
CREATE VIEW question_review_state AS
SELECT
    q.id AS question_id,
    q.document_id,
    q.question_text,
    q.question_type,
    a.stability,
    a.difficulty,
    a.due_at,
    a.state,
    a.reps,
    a.lapses,
    a.last_review_at
FROM questions q
LEFT JOIN question_attempts a ON a.id = (
    SELECT id FROM question_attempts
    WHERE question_id = q.id
    ORDER BY attempted_at DESC
    LIMIT 1
);

-- Milestone checkpoints for progress-based quiz triggers
CREATE TABLE session_milestones (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    milestone_percent INTEGER NOT NULL CHECK (milestone_percent IN (25, 50, 75, 100)),
    reached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    quiz_prompted BOOLEAN DEFAULT FALSE,
    quiz_completed BOOLEAN DEFAULT FALSE,
    UNIQUE(session_id, milestone_percent)
);

CREATE INDEX idx_milestones_session ON session_milestones(session_id);
```

### 5.2 TypeScript Types (for MCP Server and FastReader)

```typescript
// Shared types between MCP server and FastReader

interface Document {
  id: string;
  title: string;
  content: string;
  sourceType: 'paste' | 'file' | 'url';
  sourcePath?: string;
  fileType?: 'txt' | 'md' | 'pdf';
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  documentId: string;
  currentWordIndex: number;
  totalWords: number;
  progressPercent: number;
  wpmSetting: number;
  chunkSize: number;
  isActive: boolean;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
}

interface Question {
  id: string;
  documentId: string;
  sessionId?: string;

  // Core question content
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'fill_in_blank';
  comprehensionType: 'factual_recall' | 'inference' | 'synthesis';
  difficulty: 'easy' | 'medium' | 'hard';

  // For multiple_choice format
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;  // For MCQ: "A"|"B"|"C"|"D", for others: model answer
  distractorExplanations?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };

  // For short_answer format
  idealAnswer?: string;
  acceptableVariations?: string[];
  requiredConcepts?: string[];
  scoringRubric?: {
    fullCredit: string;
    partialCredit: string;
    noCredit: string;
  };

  // For fill_in_blank format
  sentenceWithBlank?: string;
  correctAnswers?: string[];  // Array of acceptable fill-in answers
  contextHint?: string;

  // Required for all formats
  rationale: string;
  passageEvidence?: string;
  passageLocation?: string;

  // Position metadata
  chunkStartIndex?: number;
  chunkEndIndex?: number;
  createdAt: string;
}

interface QuestionAttempt {
  id: string;
  questionId: string;
  userAnswer?: string;
  isCorrect?: boolean;
  timeSpentMs?: number;
  rating?: 1 | 2 | 3 | 4;  // FSRS rating
  // FSRS state
  stability: number;
  difficulty: number;
  dueAt?: string;
  state: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
  lastReviewAt?: string;
  attemptedAt: string;
}

interface QuestionWithReviewState extends Question {
  reviewState?: {
    stability: number;
    difficulty: number;
    dueAt?: string;
    state: number;
    reps: number;
    lapses: number;
  };
}

interface SessionMilestone {
  id: string;
  sessionId: string;
  milestonePercent: 25 | 50 | 75 | 100;
  reachedAt: string;
  quizPrompted: boolean;
  quizCompleted: boolean;
}

// API response types
interface CurrentSessionResponse {
  session: Session;
  document: Document;
  milestones: SessionMilestone[];
  pendingQuizMilestone?: number;  // Next milestone that needs a quiz
}

interface QuizResponse {
  questions: QuestionWithReviewState[];
  newQuestions: number;      // Questions never attempted
  reviewQuestions: number;   // Questions due for review
}

interface AnswerRequest {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  rating: 1 | 2 | 3 | 4;
  timeSpentMs?: number;
}

interface StatsResponse {
  totalDocuments: number;
  totalReadingSessions: number;
  totalQuestionsGenerated: number;
  totalQuestionsAnswered: number;
  correctAnswerRate: number;
  questionsReviewedToday: number;
  questionsDueForReview: number;
}
```

---

## 6. API Specification

### 6.1 Base URL

```
http://localhost:8745/api
```

### 6.2 Endpoints

#### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/documents` | List all documents |
| `POST` | `/documents` | Create new document |
| `GET` | `/documents/:id` | Get document by ID |
| `DELETE` | `/documents/:id` | Delete document and all related data |
| `POST` | `/documents/import/file` | Import document from file upload |
| `POST` | `/documents/import/url` | Import document from URL |

#### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sessions` | List all sessions |
| `POST` | `/sessions` | Create new reading session |
| `GET` | `/sessions/current` | Get current active session |
| `GET` | `/sessions/:id` | Get session by ID |
| `PATCH` | `/sessions/:id` | Update session progress |
| `POST` | `/sessions/:id/complete` | Mark session as completed |

#### Questions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sessions/:id/quiz` | Get quiz questions for session |
| `GET` | `/documents/:id/questions` | Get all questions for document |
| `POST` | `/questions` | Save generated questions |
| `POST` | `/questions/:id/answer` | Record answer attempt |
| `GET` | `/questions/due` | Get questions due for spaced repetition |

#### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Get overall statistics |
| `GET` | `/stats/document/:id` | Get stats for specific document |

#### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

### 6.3 Detailed Endpoint Specifications

#### `POST /api/documents`

Create a new document from pasted text.

**Request:**
```json
{
  "title": "Chapter 1: Introduction",
  "content": "The full text content...",
  "sourceType": "paste"
}
```

**Response:**
```json
{
  "id": "doc_abc123",
  "title": "Chapter 1: Introduction",
  "content": "The full text content...",
  "sourceType": "paste",
  "wordCount": 1542,
  "createdAt": "2026-01-18T10:30:00Z",
  "updatedAt": "2026-01-18T10:30:00Z"
}
```

#### `POST /api/documents/import/url`

Import document content from a URL.

**Request:**
```json
{
  "url": "https://example.com/article",
  "title": "Optional custom title"
}
```

**Response:**
```json
{
  "id": "doc_def456",
  "title": "Article Title (extracted or custom)",
  "content": "Extracted text content...",
  "sourceType": "url",
  "sourcePath": "https://example.com/article",
  "wordCount": 2103,
  "createdAt": "2026-01-18T10:35:00Z",
  "updatedAt": "2026-01-18T10:35:00Z"
}
```

#### `GET /api/sessions/current`

Get the current active reading session with full context.

**Response:**
```json
{
  "session": {
    "id": "sess_xyz789",
    "documentId": "doc_abc123",
    "currentWordIndex": 450,
    "totalWords": 1542,
    "progressPercent": 29.2,
    "wpmSetting": 350,
    "chunkSize": 1,
    "isActive": true,
    "startedAt": "2026-01-18T10:30:00Z",
    "lastActiveAt": "2026-01-18T10:45:00Z"
  },
  "document": {
    "id": "doc_abc123",
    "title": "Chapter 1: Introduction",
    "content": "The full text content...",
    "wordCount": 1542
  },
  "milestones": [
    {
      "milestonePercent": 25,
      "reachedAt": "2026-01-18T10:40:00Z",
      "quizPrompted": true,
      "quizCompleted": true
    }
  ],
  "pendingQuizMilestone": null
}
```

#### `POST /api/questions`

Save generated questions (called by Claude Code via MCP).

**Request:**
```json
{
  "documentId": "doc_abc123",
  "sessionId": "sess_xyz789",
  "questions": [
    {
      "questionText": "What is the main argument presented in the introduction?",
      "questionType": "multiple_choice",
      "comprehensionType": "inference",
      "difficulty": "medium",
      "options": {
        "A": "The author argues for increased regulation",
        "B": "The author presents a historical overview",
        "C": "The author challenges conventional wisdom",
        "D": "The author provides statistical analysis"
      },
      "correctAnswer": "C",
      "distractorExplanations": {
        "A": "Incorrect. The passage does not discuss regulation.",
        "B": "Incorrect. While history is mentioned, it's not the main focus.",
        "C": "Correct. The author explicitly states their goal is to challenge the accepted narrative.",
        "D": "Incorrect. No statistical analysis is presented in this section."
      },
      "rationale": "The author explicitly states their goal is to challenge the accepted narrative, requiring readers to infer the main argument from contextual clues.",
      "passageEvidence": "The author writes: 'My aim is to overturn the comfortable assumptions...'",
      "passageLocation": "Paragraph 2",
      "chunkStartIndex": 0,
      "chunkEndIndex": 450
    },
    {
      "questionText": "In your own words, explain the significance of the opening example.",
      "questionType": "short_answer",
      "comprehensionType": "synthesis",
      "difficulty": "hard",
      "idealAnswer": "The opening example of the factory closure illustrates how economic decisions affect real communities. It highlights the human impact, contrasts with corporate messaging, and foreshadows the book's themes.",
      "acceptableVariations": [
        "The factory example shows the disconnect between corporate decisions and community consequences.",
        "It demonstrates how abstract economic policies have concrete human effects."
      ],
      "requiredConcepts": ["human impact", "corporate decisions", "community effects"],
      "scoringRubric": {
        "fullCredit": "Mentions human impact AND connects to broader themes",
        "partialCredit": "Mentions human impact OR thematic connection, but not both",
        "noCredit": "Only summarizes the example without analysis"
      },
      "rationale": "This question tests understanding of authorial intent and narrative structure by requiring synthesis of the example's purpose within the larger argument.",
      "passageEvidence": "The passage opens with: 'When the Millbrook plant closed its doors...'",
      "passageLocation": "Paragraph 1",
      "chunkStartIndex": 50,
      "chunkEndIndex": 200
    }
  ]
}
```

**Response:**
```json
{
  "saved": 2,
  "questions": [
    { "id": "q_001", "questionText": "What is the main argument..." },
    { "id": "q_002", "questionText": "In your own words..." }
  ]
}
```

#### `POST /api/questions/:id/answer`

Record user's answer and update spaced repetition state.

**Request:**
```json
{
  "userAnswer": "C",
  "isCorrect": true,
  "rating": 3,
  "timeSpentMs": 15000
}
```

**Response:**
```json
{
  "attemptId": "att_123",
  "questionId": "q_001",
  "isCorrect": true,
  "nextReview": {
    "dueAt": "2026-01-19T10:45:00Z",
    "stability": 1.2,
    "state": 2
  }
}
```

#### `GET /api/questions/due`

Get questions due for spaced repetition review.

**Query Parameters:**
- `limit` (optional): Maximum questions to return (default: 20)
- `documentId` (optional): Filter to specific document

**Response:**
```json
{
  "questions": [
    {
      "id": "q_001",
      "documentId": "doc_abc123",
      "questionText": "What is the main argument...",
      "questionType": "multiple_choice",
      "comprehensionType": "inference",
      "difficulty": "medium",
      "options": {
        "A": "The author argues for increased regulation",
        "B": "The author challenges conventional wisdom",
        "C": "The author provides statistical analysis",
        "D": "The author presents a historical overview"
      },
      "correctAnswer": "B",
      "rationale": "The author explicitly states their goal is to challenge accepted narratives.",
      "reviewState": {
        "dueAt": "2026-01-18T10:00:00Z",
        "stability": 0.8,
        "state": 2,
        "reps": 2,
        "lapses": 0
      }
    }
  ],
  "totalDue": 5
}
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
              options: {
                type: "object",
                properties: {
                  A: { type: "string" },
                  B: { type: "string" },
                  C: { type: "string" },
                  D: { type: "string" }
                },
                description: "For multiple_choice format only"
              },
              correctAnswer: { type: "string" },
              distractorExplanations: { type: "object", description: "For multiple_choice format" },
              idealAnswer: { type: "string", description: "For short_answer format" },
              acceptableVariations: { type: "array", items: { type: "string" }, description: "For short_answer format" },
              requiredConcepts: { type: "array", items: { type: "string" }, description: "For short_answer format" },
              scoringRubric: { type: "object", description: "For short_answer format" },
              sentenceWithBlank: { type: "string", description: "For fill_in_blank format" },
              correctAnswers: { type: "array", items: { type: "string" }, description: "For fill_in_blank format" },
              contextHint: { type: "string", description: "For fill_in_blank format" },
              rationale: { type: "string" },
              passageEvidence: { type: "string" },
              passageLocation: { type: "string" },
              chunkStartIndex: { type: "number" },
              chunkEndIndex: { type: "number" }
            },
            required: ["questionText", "questionType", "comprehensionType", "difficulty", "correctAnswer", "rationale"]
          }
        }
      },
      required: ["documentId", "questions"]
    }
  },
  {
    name: "fastreader_record_answer",
    description: `Record the user's answer to a question.
Use this when the user answers a question in the Claude Code conversation.
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

### 7.3 Example MCP Server Implementation

```typescript
// src/index.ts

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";

const BACKEND_URL = process.env.FASTREADER_API_URL || "http://localhost:8745/api";

async function callBackend(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }

  return response.json();
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
      case "fastreader_get_current_session":
        result = await callBackend("GET", "/sessions/current");
        break;

      case "fastreader_get_document":
        result = await callBackend("GET", `/documents/${args.documentId}`);
        break;

      case "fastreader_list_documents":
        const params = new URLSearchParams();
        if (args.limit) params.set("limit", String(args.limit));
        if (args.offset) params.set("offset", String(args.offset));
        result = await callBackend("GET", `/documents?${params}`);
        break;

      case "fastreader_get_question_history":
        result = await callBackend("GET", `/documents/${args.documentId}/questions`);
        break;

      case "fastreader_save_questions":
        result = await callBackend("POST", "/questions", {
          documentId: args.documentId,
          sessionId: args.sessionId,
          questions: args.questions,
        });
        break;

      case "fastreader_record_answer":
        result = await callBackend("POST", `/questions/${args.questionId}/answer`, {
          userAnswer: args.userAnswer,
          isCorrect: args.isCorrect,
          rating: args.rating,
          timeSpentMs: args.timeSpentMs,
        });
        break;

      case "fastreader_get_due_questions":
        const dueParams = new URLSearchParams();
        if (args.limit) dueParams.set("limit", String(args.limit));
        if (args.documentId) dueParams.set("documentId", args.documentId);
        result = await callBackend("GET", `/questions/due?${dueParams}`);
        break;

      case "fastreader_get_session_stats":
        const statsPath = args.documentId
          ? `/stats/document/${args.documentId}`
          : "/stats";
        result = await callBackend("GET", statsPath);
        break;

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
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
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
1. User downloads fastreader-server binary from GitHub releases
   └── Available for: linux-amd64, linux-arm64, darwin-amd64, darwin-arm64, windows-amd64

2. User runs the server
   $ fastreader-server
   > FastReader server running on http://localhost:8745
   > Database: ~/.fastreader/fastreader.db

3. User adds MCP server to Claude Code
   $ claude mcp add fastreader -- npx @anthropic/fastreader-mcp
   > Added MCP server: fastreader

4. User opens FastReader in browser
   > FastReader detects backend at localhost:8745
   > Shows "Connected to local server" indicator
```

### 8.2 Reading with Milestone Quizzes

```
1. User pastes/imports text into FastReader
   └── Text sent to backend, document created
   └── New session started

2. User begins RSVP reading at chosen WPM

3. At 25% progress:
   └── Backend records milestone
   └── FastReader shows subtle "Quiz available" indicator
   └── User can continue reading or take quiz

4. User clicks "Take Quiz":
   └── FastReader prompts: "Generate questions with Claude?"
   └── User confirms
   └── Claude Code opens (or user switches to terminal)
   └── User: "Generate comprehension questions for my FastReader session"

5. Claude Code:
   └── Calls fastreader_get_current_session
   └── Gets document text and progress
   └── Calls fastreader_get_question_history
   └── Generates 3-5 questions avoiding duplicates
   └── Calls fastreader_save_questions
   └── Confirms: "I've generated 4 questions. You can answer them here or in FastReader."

6. User returns to FastReader:
   └── Quiz modal shows new questions
   └── User answers MCQ questions
   └── For open-ended: types answer, self-assesses or asks Claude to evaluate
   └── Results recorded, FSRS schedule updated

7. User continues reading to next milestone...
```

### 8.3 On-Demand Question Generation

```
1. User is reading in FastReader

2. At any point, user opens Claude Code:
   $ claude "I want to test my understanding of what I just read"

3. Claude Code:
   └── Calls fastreader_get_current_session
   └── Sees user is at 42% through "Chapter 3: The Industrial Revolution"
   └── Calls fastreader_get_question_history (finds 8 existing questions)
   └── Generates 5 new questions focused on recently read section
   └── Calls fastreader_save_questions
   └── Presents questions in conversation

4. User answers in Claude Code conversation:
   User: "I think the answer is B"
   Claude: "That's correct! [explanation]... How would you rate that question?"
   User: "It was medium difficulty"
   └── Claude calls fastreader_record_answer with rating=3 (Good)

5. After quiz:
   Claude: "You got 4/5 correct. Your next review for these questions is scheduled based on your performance."
```

### 8.4 Spaced Repetition Review

```
1. User opens Claude Code for daily review:
   $ claude "What questions do I have due for review?"

2. Claude Code:
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

### 8.5 Open-Ended Question Evaluation

```
1. Claude presents open-ended question:
   "In your own words, explain why the author argues that..."

2. User types response:
   "I think the author is saying that economic growth doesn't always..."

3. Claude can:
   a) Self-assessment mode:
      "Here's the model answer: [shows correct answer]
       How well do you think you answered?
       1 - Completely wrong
       2 - Partially correct but missing key points
       3 - Good answer with minor gaps
       4 - Excellent, covered all key points"

   b) Claude evaluation mode:
      "Let me evaluate your answer...
       Your response correctly identifies [X] and [Y].
       However, you missed the key point about [Z].
       I'd rate this as a 'Good' answer (3/4).
       Would you like me to record this rating?"

4. User confirms, answer recorded with chosen rating
```

---

## 9. FastReader UI Changes

### 9.1 New Components

#### 9.1.1 Backend Status Indicator

Small indicator in the header showing connection status:

```
┌─────────────────────────────────────────────────────┐
│  FastReader                    [●] Connected  [⚙]  │
└─────────────────────────────────────────────────────┘

States:
- [●] Connected (green) - Backend running
- [○] Disconnected (gray) - Backend not running
- [!] Error (red) - Connection error
```

#### 9.1.2 Quiz Milestone Prompt

Subtle notification when milestone is reached:

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

#### 9.1.3 Quiz Modal (Multiple Choice)

Full-screen modal for answering questions:

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

#### 9.1.4 Short Answer (Open-Ended) Question UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Question 4 of 5 (Short Answer)                      [Synthesis]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  In your own words, explain the significance of the            │
│  opening example used by the author.                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Your answer:                                            │   │
│  │                                                          │   │
│  │  The opening example illustrates how economic            │   │
│  │  decisions at the corporate level have direct            │   │
│  │  consequences for working-class communities...           │   │
│  │  _                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Submit & Self-Assess]  [Submit & Ask Claude to Evaluate]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.1.5 Fill-in-the-Blank Question UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Question 3 of 5 (Fill-in-the-Blank)            [Factual Recall]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Complete the sentence based on the passage:                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  The author argues that _____________ was the primary    │   │
│  │  cause of the economic downturn in the 1970s.           │   │
│  │                                                          │   │
│  │  Your answer: [________________]                         │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Hint: See paragraph 3                                          │
│                                                                 │
│  [← Previous]                              [Submit Answer →]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.1.6 Answer Feedback

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

#### 9.1.7 Review Dashboard (Optional)

Accessible from settings or menu:

```
┌─────────────────────────────────────────────────────────────────┐
│  Review Dashboard                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Due Today: 12 questions                                        │
│  ───────────────────────────────                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Chapter 1: Introduction          5 due    [Review]      │   │
│  │ The Art of War                   4 due    [Review]      │   │
│  │ Economics 101                    3 due    [Review]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Stats:                                                         │
│  • Total questions: 47                                          │
│  • Correct rate: 78%                                            │
│  • Streak: 5 days                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 State Management

New React context for comprehension features:

```typescript
interface ComprehensionState {
  // Connection
  backendConnected: boolean;
  backendUrl: string;

  // Current quiz
  currentQuiz: {
    sessionId: string;
    questions: Question[];
    currentIndex: number;
    answers: Map<string, AnswerAttempt>;
  } | null;

  // Milestones
  pendingMilestone: number | null;  // 25, 50, 75, or 100

  // Actions
  generateQuiz: () => Promise<void>;
  submitAnswer: (questionId: string, answer: AnswerRequest) => Promise<void>;
  dismissMilestone: () => void;
}
```

---

## 10. Question Generation

This section defines the prompt engineering architecture for generating high-quality reading comprehension questions. The approach is based on research-validated principles that emphasize composable templates, explicit cognitive level targeting, and structured output schemas.

### 10.1 Core Principles

Six research-validated principles govern all question generation prompts:

| Principle | Description |
|-----------|-------------|
| **Explicit instruction primacy** | Lead with action verbs ("Generate," "Create," "Analyze"). Specify desired behavior positively rather than listing what not to do. |
| **Few-shot examples are essential** | Include 3-5 diverse examples per question type. Research shows this improves question-skill alignment from ~66% to ~73%. |
| **Chain-of-thought for cognitive alignment** | Prompt the model to reason before generating ("First, identify testable concepts. Then, formulate questions..."). Critical for inference and synthesis questions. |
| **Structured output via prompt specification** | Embed the complete JSON schema in the prompt text with explicit field descriptions. |
| **Moderate complexity beats maximal** | Adding skill definitions and 1-2 examples improves quality by ~15%, but excessive detail degrades performance. |
| **Ground truth rationale as output** | Require explanations alongside answers for self-consistency reasoning and verification. |

### 10.2 Composable Template Architecture

Rather than maintaining separate templates for each combination, use a modular architecture with 5 composable modules:

```
┌─────────────────────────────────────────────────────────────┐
│  MODULE 1: System Role + Task Definition                    │
├─────────────────────────────────────────────────────────────┤
│  MODULE 2: Comprehension Type Specification                 │
│  (factual_recall | inference | synthesis)                   │
├─────────────────────────────────────────────────────────────┤
│  MODULE 3: Question Format Specification                    │
│  (multiple_choice | short_answer | fill_in_blank)           │
├─────────────────────────────────────────────────────────────┤
│  MODULE 4: Output Schema + Examples                         │
├─────────────────────────────────────────────────────────────┤
│  MODULE 5: Passage + Generation Instructions                │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Module Definitions

#### Module 1: System Role (Universal)

```
You are an expert educational assessment designer specializing in reading
comprehension evaluation. Your task is to generate high-quality comprehension
questions that accurately test reader understanding of provided passages.

For every question, you must also generate:
- The correct answer (ground truth)
- A rationale explaining why this answer is correct
- For multiple choice: explanations for why each distractor is incorrect

Quality criteria:
- Questions must be answerable solely from the passage content
- Difficulty should match the specified cognitive level
- Language should be clear and unambiguous
- Distractors must be plausible but definitively wrong
```

#### Module 2: Comprehension Type Specifications

**Factual Recall (Bloom's: Remember/Understand)**
```
COMPREHENSION TYPE: Factual Recall

Generate questions that test explicit information retrieval from the passage.
These questions have answers directly stated in the text—readers should be able
to locate and identify the relevant information.

Target cognitive skills:
- Identifying explicitly stated facts, dates, names, definitions
- Recognizing key details and sequences
- Locating specific information in the text

Question stems to use: "According to the passage...", "The author states that...",
"Which of the following is mentioned in the text...", "What does the passage say about..."

Avoid: Questions requiring inference, interpretation, or external knowledge.
```

**Inference/Reasoning (Bloom's: Apply/Analyze)**
```
COMPREHENSION TYPE: Inference and Reasoning

Generate questions that require readers to draw conclusions not explicitly stated.
Answers must be logically derivable from textual evidence but not directly quoted.

Target cognitive skills:
- Drawing logical conclusions from stated information
- Identifying cause-effect relationships
- Recognizing implied meanings and author's purpose
- Comparing and contrasting ideas within the passage

Question stems to use: "Based on the passage, it can be inferred that...",
"The author implies that...", "What conclusion can be drawn from...",
"Why does the author most likely..."

Requirement: The rationale must cite specific textual evidence supporting the inference.
```

**Synthesis (Bloom's: Evaluate/Create)**
```
COMPREHENSION TYPE: Synthesis

Generate questions that require integrating multiple parts of the passage or
connecting ideas to form new understandings.

Target cognitive skills:
- Connecting themes across different sections of the passage
- Evaluating the strength of arguments or evidence
- Identifying how different elements contribute to the whole
- Applying passage concepts to new scenarios

Question stems to use: "How do the examples in paragraphs X and Y together support...",
"Which statement best synthesizes the author's main argument...",
"If the principles described were applied to [scenario], what would likely..."

Requirement: Rationale must reference at least two distinct parts of the passage.
```

#### Module 3: Question Format Specifications

**Multiple Choice**
```
QUESTION FORMAT: Multiple Choice

Structure:
- One clear question stem
- Four answer options labeled A, B, C, D
- Exactly one correct answer
- Three distractors that are plausible but definitively incorrect

Distractor design principles:
- Each distractor should represent a common misconception or misreading
- Avoid "all of the above" or "none of the above"
- Options should be similar in length and grammatical structure
- Distractors should not be obviously wrong to someone who hasn't read the passage
```

**Short Answer (Open-ended)**
```
QUESTION FORMAT: Short Answer (Open-ended)

Structure:
- One clear question requiring a 1-3 sentence response
- Question should have a focused, specific answer (not open to interpretation)
- Answer should require demonstration of understanding, not just copying

Ground truth answer requirements:
- Provide an ideal response (1-3 sentences)
- Provide 2-3 acceptable answer variations/phrasings
- Specify required key concepts that must appear in any correct answer
- Provide a scoring rubric: full credit / partial credit / no credit criteria
```

**Fill-in-the-Blank**
```
QUESTION FORMAT: Fill-in-the-Blank

Structure:
- A statement from or about the passage with one key term/phrase blanked
- The blank should test understanding, not just vocabulary recall
- Provide 1-3 acceptable answers (accounting for synonyms/phrasings)

Design principles:
- Blank should be a meaningful content word, not a function word
- Surrounding context should constrain the answer without making it trivial
- For longer passages, include the sentence/paragraph reference
```

### 10.4 Output Schema

The complete JSON schema for question generation output:

```json
{
  "passage_analysis": {
    "main_topic": "string - one sentence summary of passage subject",
    "key_concepts": ["array of 3-5 central concepts/facts in the passage"],
    "complexity_level": "elementary | intermediate | advanced"
  },
  "questions": [
    {
      "question_id": "string - unique identifier (q1, q2, etc.)",
      "question_text": "string - the question being asked",
      "comprehension_type": "factual_recall | inference | synthesis",
      "format": "multiple_choice | short_answer | fill_in_blank",
      "difficulty": "easy | medium | hard",

      // For multiple_choice format:
      "options": {
        "A": "string - first option",
        "B": "string - second option",
        "C": "string - third option",
        "D": "string - fourth option"
      },
      "correct_answer": "A | B | C | D",
      "distractor_explanations": {
        "A": "string - why this is correct/incorrect",
        "B": "string - why this is incorrect",
        "C": "string - why this is incorrect",
        "D": "string - why this is incorrect"
      },

      // For short_answer format:
      "ideal_answer": "string - model answer (1-3 sentences)",
      "acceptable_variations": ["array of alternative correct phrasings"],
      "required_concepts": ["concepts that must appear in correct answer"],
      "scoring_rubric": {
        "full_credit": "string - criteria for full marks",
        "partial_credit": "string - criteria for partial marks",
        "no_credit": "string - criteria for zero marks"
      },

      // For fill_in_blank format:
      "sentence_with_blank": "string - The _____ was the primary cause of...",
      "correct_answers": ["array of acceptable fill-in answers"],
      "context_hint": "string - optional hint for where to find answer",

      // Required for all formats:
      "rationale": "string - detailed explanation of why the answer is correct",
      "passage_evidence": "string - direct quote(s) from passage supporting answer",
      "passage_location": "string - paragraph number or section reference"
    }
  ],
  "generation_metadata": {
    "passage_word_count": "integer",
    "questions_generated": "integer",
    "cognitive_level_distribution": {
      "factual_recall": "integer",
      "inference": "integer",
      "synthesis": "integer"
    }
  }
}
```

### 10.5 Few-Shot Example (Multiple Choice, Factual Recall)

```json
{
  "question_id": "q1",
  "question_text": "According to the passage, what year was the first successful vaccine developed?",
  "comprehension_type": "factual_recall",
  "format": "multiple_choice",
  "difficulty": "easy",
  "options": {
    "A": "1796",
    "B": "1823",
    "C": "1885",
    "D": "1901"
  },
  "correct_answer": "A",
  "distractor_explanations": {
    "A": "Correct. The passage explicitly states 'Edward Jenner developed the first successful vaccine in 1796.'",
    "B": "Incorrect. 1823 is when Jenner died, mentioned later in the passage.",
    "C": "Incorrect. 1885 is when Pasteur developed the rabies vaccine, a different milestone.",
    "D": "Incorrect. This date is not mentioned in the passage."
  },
  "rationale": "This tests direct recall of a key date explicitly stated in paragraph 1.",
  "passage_evidence": "Edward Jenner developed the first successful vaccine in 1796.",
  "passage_location": "Paragraph 1"
}
```

### 10.6 Generation Instructions Template

```
PASSAGE TO ANALYZE:
---
{passage_text}
---
Word count: approximately {word_count} words

EXISTING QUESTIONS (avoid semantic overlap):
{list of previous question texts for this document}

GENERATION INSTRUCTIONS:
1. First, analyze the passage silently to identify its main topic, key concepts,
   and testable elements.
2. Generate {num_questions} questions following the specifications above.
3. Ensure questions cover different parts of the passage (not all from one paragraph).
4. Target cognitive distribution: ~40% factual, ~40% inference, ~20% synthesis.
5. Calibrate difficulty appropriately:
   - Easy: Surface-level, clearly stated information
   - Medium: Requires careful reading or simple inference
   - Hard: Requires synthesis or subtle inference
6. Verify each question is answerable from the passage alone.
7. Double-check that your JSON is valid before responding.

Respond with the JSON output only. Begin your response with {
```

### 10.7 Passage Length Adaptations

| Passage Length | Word Count | Adaptations |
|----------------|------------|-------------|
| **Short** | <1000 words | Reduce question count (3-4). Prioritize factual and inference over synthesis. Add: "Given the passage brevity, focus on the most significant testable concepts." |
| **Standard** | 1000-3000 words | Use templates as specified. Target 5-8 questions with balanced cognitive distribution. |
| **Long** | >3000 words | Add chunking guidance: "Ensure questions draw from all major sections. For synthesis questions, require integration across introduction, body, and conclusion." |

### 10.8 Deduplication Strategy

Before generating questions, Claude should:

1. Fetch existing questions via `fastreader_get_question_history`
2. Compare semantic similarity of new questions to existing ones
3. Avoid questions that:
   - Ask about the same specific fact
   - Use similar wording (>70% overlap)
   - Test the same concept from the same angle

### 10.9 Quality Validation Pipeline

Research shows even high-performing models produce questions with ~78% quality rates and ~66% cognitive-level alignment. Implement multi-layer validation:

#### Layer 1: Structural Validation (Automated, Instant)

| Check | Implementation | Failure Action |
|-------|----------------|----------------|
| JSON syntax valid | Standard JSON parser | Retry with "Fix this JSON: {output}" |
| Schema compliance | JSON Schema validator | Retry with schema violations highlighted |
| Required fields present | Schema validation | Flag for regeneration |
| Enum values valid | Schema validation | Auto-correct if close match, else retry |

#### Layer 2: Content Quality Checks (Automated, Heuristic)

- **Answerability verification**: Use a second LLM call to attempt answering each question using only the passage. If the model cannot answer correctly, flag the question.
- **Passage evidence validation**: Check that `passage_evidence` field contains text that actually appears in the source passage (fuzzy string matching with >80% similarity threshold).
- **Difficulty calibration check**: Verify that "easy" questions have shorter, more explicit evidence; "hard" questions require more inference.

#### Layer 3: Semantic Quality Checks (Model-based)

- **Distractor quality scoring**: For multiple choice, verify each distractor is:
  - Not a near-synonym of the correct answer (embedding similarity <0.85)
  - Plausible (embedding similarity to question >0.3)
  - Distinct from other distractors (pairwise similarity <0.8)
- **Cognitive level verification**: Use a classifier prompt to verify claimed comprehension type matches actual cognitive demand.

#### Layer 4: Batch-Level Statistical Monitoring

| Metric | Target |
|--------|--------|
| Schema compliance rate | >98% |
| Answerability rate | >95% |
| Cognitive level alignment | >75% |
| Distractor quality score | >0.7 average |
| Evidence match rate | >90% |

---

## 11. Spaced Repetition System

### 11.1 Algorithm: FSRS

We implement FSRS (Free Spaced Repetition Scheduler), a modern algorithm that outperforms SM-2 (used by Anki).

#### 11.1.1 Core Concepts

| Term | Description |
|------|-------------|
| **Stability** | How long a memory will last (in days) |
| **Difficulty** | Inherent difficulty of the question (0-1) |
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

```go
// internal/services/fsrs_service.go

type FSRSParams struct {
    RequestRetention float64   // Target retention rate (default: 0.9)
    MaximumInterval  int       // Max days between reviews (default: 36500)
    Weights          []float64 // Model weights (17 values)
}

type CardState struct {
    Stability  float64
    Difficulty float64
    DueAt      time.Time
    State      int // 0=New, 1=Learning, 2=Review, 3=Relearning
    Reps       int
    Lapses     int
}

func (f *FSRSService) CalculateNextReview(card CardState, rating int) CardState {
    // FSRS algorithm implementation
    // Returns updated card state with new due date
}
```

#### 11.1.4 State Transitions

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│   New   │───►│Learning │───►│ Review  │───►│Relearning│─┘
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │              │              │
                    │              │              │
                    └──────────────┴──────────────┘
                         (Rating = 1: Again)
```

### 11.2 Review Scheduling

- Questions become due when `current_time >= due_at`
- Due questions sorted by: overdue first, then by due_at
- Daily review limit: configurable (default: no limit)
- Review sessions can be done in FastReader UI or Claude Code

---

## 12. Distribution & Installation

### 12.1 fastreader-server Binary

#### 12.1.1 Build Targets

| Platform | Architecture | Binary Name |
|----------|--------------|-------------|
| Linux | amd64 | `fastreader-server-linux-amd64` |
| Linux | arm64 | `fastreader-server-linux-arm64` |
| macOS | amd64 | `fastreader-server-darwin-amd64` |
| macOS | arm64 | `fastreader-server-darwin-arm64` |
| Windows | amd64 | `fastreader-server-windows-amd64.exe` |

#### 12.1.2 Installation

```bash
# Linux/macOS
curl -L https://github.com/username/fastreader/releases/latest/download/fastreader-server-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o fastreader-server
chmod +x fastreader-server
sudo mv fastreader-server /usr/local/bin/

# Or with Homebrew (future)
brew install fastreader-server

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/username/fastreader/releases/latest/download/fastreader-server-windows-amd64.exe" -OutFile "fastreader-server.exe"
```

#### 12.1.3 Running

```bash
# Start server (foreground)
fastreader-server

# Start server (background)
fastreader-server &

# With custom port
fastreader-server --port 9000

# With custom data directory
fastreader-server --data-dir /path/to/data
```

### 12.2 MCP Server

#### 12.2.1 Installation via npm

```bash
# Global install
npm install -g @anthropic/fastreader-mcp

# Add to Claude Code
claude mcp add fastreader -- fastreader-mcp
```

#### 12.2.2 Installation via npx (no install)

```bash
claude mcp add fastreader -- npx @anthropic/fastreader-mcp
```

### 12.3 FastReader Web App

#### 12.3.1 Configuration

FastReader needs to know where the backend is:

```typescript
// Environment variable or localStorage
const FASTREADER_API_URL = process.env.VITE_FASTREADER_API_URL
  || localStorage.getItem('fastreader_api_url')
  || 'http://localhost:8745';
```

#### 12.3.2 Backend Detection

On startup, FastReader:
1. Attempts to connect to configured backend URL
2. Falls back to `localhost:8745` if not configured
3. Shows connection status in UI
4. Disables comprehension features if backend unavailable

### 12.4 Docker (Future)

```yaml
# docker-compose.yml
version: '3.8'

services:
  fastreader-server:
    image: ghcr.io/username/fastreader-server:latest
    ports:
      - "8745:8745"
    volumes:
      - ~/.fastreader:/root/.fastreader
    restart: unless-stopped

  fastreader-mcp:
    image: ghcr.io/username/fastreader-mcp:latest
    depends_on:
      - fastreader-server
    environment:
      - FASTREADER_API_URL=http://fastreader-server:8745
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation (MVP)

**Goal**: Basic question generation and storage

| Task | Component | Priority |
|------|-----------|----------|
| Set up Go project structure | fastreader-server | P0 |
| Implement SQLite schema and migrations | fastreader-server | P0 |
| Document CRUD endpoints | fastreader-server | P0 |
| Session management endpoints | fastreader-server | P0 |
| Question storage endpoints | fastreader-server | P0 |
| Basic MCP server with 4 core tools | fastreader-mcp | P0 |
| FastReader: Backend connection | FastReader | P0 |
| FastReader: Save documents to backend | FastReader | P0 |
| FastReader: Session sync with backend | FastReader | P0 |

**Deliverable**: User can read in FastReader, ask Claude Code for questions, questions are saved to database.

### Phase 2: Quiz Interface

**Goal**: Answer questions in FastReader UI

| Task | Component | Priority |
|------|-----------|----------|
| Quiz modal component | FastReader | P1 |
| MCQ question component | FastReader | P1 |
| Open-ended question component | FastReader | P1 |
| Answer submission to backend | FastReader | P1 |
| Answer feedback display | FastReader | P1 |
| Milestone detection and prompts | FastReader | P1 |
| Milestone API endpoints | fastreader-server | P1 |

**Deliverable**: User can answer questions in FastReader UI with feedback.

### Phase 3: Spaced Repetition

**Goal**: FSRS-based review scheduling

| Task | Component | Priority |
|------|-----------|----------|
| FSRS algorithm implementation | fastreader-server | P2 |
| Due questions endpoint | fastreader-server | P2 |
| Rating submission and state update | fastreader-server | P2 |
| MCP tools for review workflow | fastreader-mcp | P2 |
| Review dashboard UI | FastReader | P2 |
| Daily due questions display | FastReader | P2 |

**Deliverable**: Questions are scheduled for review, users can do daily reviews.

### Phase 4: Document Import

**Goal**: Import from files and URLs

| Task | Component | Priority |
|------|-----------|----------|
| PDF text extraction | fastreader-server | P3 |
| URL content extraction | fastreader-server | P3 |
| File upload endpoint | fastreader-server | P3 |
| Import UI in FastReader | FastReader | P3 |

**Deliverable**: Users can import PDFs and web articles.

### Phase 5: Polish & Distribution

**Goal**: Easy installation and great UX

| Task | Component | Priority |
|------|-----------|----------|
| GitHub releases with binaries | fastreader-server | P4 |
| npm package for MCP server | fastreader-mcp | P4 |
| Installation documentation | All | P4 |
| Error handling and edge cases | All | P4 |
| Performance optimization | All | P4 |

**Deliverable**: Polished, easy-to-install product.

---

## 14. Future Considerations

### 14.1 Potential Features (Not in MVP)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Cloud sync** | Optional backup/sync to user's cloud storage | High |
| **Multiple users** | Profiles with separate data | Medium |
| **Custom questions** | Allow users to add their own questions | Low |
| **Highlights & notes** | Integrate with existing highlighting features | Medium |
| **Export data** | Export questions/stats to Anki, CSV, etc. | Low |
| **Gamification** | Streaks, achievements, XP | Medium |
| **Mobile app** | React Native or PWA | High |
| **Reading analytics** | WPM trends, comprehension over time | Medium |
| **Semantic deduplication** | Use embeddings to detect similar questions | Medium |

### 14.2 Alternative Architectures Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Tauri desktop app** | Native, single binary | Overkill, harder to develop | Rejected |
| **Browser extension** | No server needed | Limited storage, complex | Rejected |
| **SaaS backend** | Easy scaling, no local setup | Not local-first, privacy concerns | Rejected |
| **SQLite in browser (OPFS)** | No server needed | No Claude Code integration | Rejected |
| **File-based storage** | Simplest | Harder queries, no ACID | Rejected |

### 14.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Backend exposed to network | Bind to 127.0.0.1 only by default |
| API authentication | Not needed for single-user local |
| Data at rest | SQLite file in user's home directory |
| MCP server permissions | Only accesses local backend |

### 14.4 Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Large documents | Stream content, paginate in UI |
| Many questions | Index on document_id, paginated queries |
| FSRS calculations | Lightweight, sub-millisecond |
| Backend startup time | Go binary starts in <100ms |

---

## Appendix A: Example Interactions

### A.1 Claude Code: Generate Questions

```
User: Generate some comprehension questions for what I've been reading

Claude: I'll check your current reading session and generate some questions.

[Calls fastreader_get_current_session]
[Calls fastreader_get_question_history]

You're reading "The Innovator's Dilemma" and you're 34% through (about 8,500 words).
You've already answered 6 questions on this document.

Let me generate 5 new questions focused on what you just read about disruptive innovation...

[Generates questions]
[Calls fastreader_save_questions]

I've created 5 new questions:

1. (MCQ) According to Christensen, what distinguishes disruptive innovations from sustaining innovations?
2. (MCQ) What example does the author use to illustrate the "performance oversupply" concept?
3. (Open-ended) Explain why established companies often fail to adopt disruptive technologies despite being aware of them.
4. (MCQ) The concept of "value networks" suggests that...
5. (Open-ended) How does the steel mini-mill example support the book's central thesis?

Would you like to answer these now, or save them for later in FastReader?
```

### A.2 Claude Code: Review Session

```
User: What do I have to review today?

Claude: [Calls fastreader_get_due_questions]

You have 8 questions due for review today:

📚 "The Innovator's Dilemma" - 5 questions
📚 "Thinking, Fast and Slow" - 3 questions

Would you like to start reviewing? I can quiz you here, or you can do it in FastReader.

User: Let's do it here

Claude: Great! Let's start.

Question 1 of 8 (from "The Innovator's Dilemma"):

What distinguishes disruptive innovations from sustaining innovations?

A) Disruptive innovations are always technologically superior
B) Disruptive innovations initially underperform on traditional metrics but excel on new ones
C) Sustaining innovations are cheaper to develop
D) Disruptive innovations require more R&D investment

User: B

Claude: ✓ Correct!

Disruptive innovations typically start with worse performance on metrics that mainstream customers care about, but they offer other benefits (simplicity, convenience, lower cost) that appeal to different customers or create new markets.

How would you rate that question?
1 - Again (forgot)
2 - Hard (struggled to remember)
3 - Good (remembered with some effort)
4 - Easy (instant recall)

User: 3

Claude: [Calls fastreader_record_answer with rating=3]

Got it. This question will come up again in about 4 days.

Question 2 of 8...
```

---

## Appendix B: Error Handling

### B.1 Backend Not Running

FastReader should gracefully handle missing backend:

```typescript
// On API call failure
if (error.code === 'ECONNREFUSED') {
  showNotification({
    type: 'warning',
    title: 'Backend not running',
    message: 'Start fastreader-server to enable comprehension features',
    action: {
      label: 'How to start',
      onClick: () => openDocs('setup')
    }
  });
}
```

### B.2 MCP Server Errors

```typescript
// In MCP server
try {
  const result = await callBackend(method, path, body);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    return {
      content: [{
        type: "text",
        text: "Error: FastReader backend is not running. Please start it with: fastreader-server"
      }],
      isError: true
    };
  }
  // ... other error handling
}
```

---

*End of Specification*
