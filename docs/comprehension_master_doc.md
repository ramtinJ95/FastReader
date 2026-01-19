# FastReader Comprehension Feature - Implementation Guide

**Purpose**: This document provides big-picture context for implementing the comprehension feature across all phases. Each phase has its own detailed implementation document that should be read alongside this guide.

---

## What We're Building

FastReader is an RSVP (Rapid Serial Visual Presentation) speed reading application. We're adding **AI-powered reading comprehension** that:

1. **Generates contextual questions** about what the user is reading
2. **Tracks question history** to avoid repetition
3. **Implements spaced repetition (FSRS)** for long-term retention
4. **Works with any AI coding assistant** (Claude Code, Codex, etc.) via MCP

### Key Principles

| Principle | What It Means |
|-----------|---------------|
| **Local-first** | All data on user's machine, no cloud dependency |
| **Privacy-preserving** | Documents never leave the user's machine |
| **CLI-agnostic** | Works with any MCP-compatible AI assistant |
| **Real-time sync** | Changes sync instantly via Server-Sent Events |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Machine                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                  ┌─────────────────────┐  │
│  │  FastReader     │   HTTP + SSE     │  PocketBase         │  │
│  │  (React SPA)    │◄────────────────►│  (Backend + SQLite) │  │
│  │                 │  localhost:8090  │                     │  │
│  │  - RSVP Display │                  │  - REST API         │  │
│  │  - Quiz Modal   │                  │  - SSE Subscriptions│  │
│  │  - CLI Spawner  │                  │  - pb_hooks/ (FSRS) │  │
│  └────────┬────────┘                  └──────────┬──────────┘  │
│           │                                      │              │
│           │ spawns                               │              │
│           ▼                                      ▼              │
│  ┌─────────────────┐                  ┌─────────────────────┐  │
│  │  AI CLI         │      stdio       │  MCP Server         │  │
│  │  (claude/codex) │◄────────────────►│  (Node.js)          │  │
│  │                 │   JSON-RPC 2.0   │                     │  │
│  │  - Question gen │                  │  - Calls PocketBase │  │
│  │  - Evaluation   │                  │  - ~150 LOC         │  │
│  └─────────────────┘                  └─────────────────────┘  │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │fastreader-extract│  (standalone CLI for PDF/URL extraction) │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Tech | What It Does |
|-----------|------|--------------|
| **FastReader** | React/TS | RSVP reading UI, quiz interface, spawns AI CLI, listens to SSE |
| **PocketBase** | Go binary | REST API, SQLite storage, real-time subscriptions |
| **pb_hooks/** | JavaScript | FSRS algorithm, milestone detection, validation |
| **MCP Server** | Node.js/TS | Translates MCP tool calls to PocketBase API |
| **fastreader-extract** | Go | Extracts text from PDFs and URLs |
| **AI CLI** | Any | Generates questions, evaluates answers |

---

## Data Model Summary

Five collections in PocketBase:

```
documents          sessions           questions
├── title          ├── document →     ├── document →
├── content        ├── current_word   ├── session →
├── source_type    ├── progress_%     ├── question_text
├── word_count     ├── wpm_setting    ├── question_type
                   ├── is_active      ├── comprehension_type
                                      ├── options (MCQ)
                                      ├── correct_answer
                                      ├── rationale

question_attempts          session_milestones
├── question →             ├── session →
├── user_answer            ├── milestone_percent
├── is_correct             ├── quiz_prompted
├── rating (1-4)           ├── quiz_completed
├── stability (FSRS)
├── difficulty (FSRS)
├── due_at
├── state
```

---

## Data Flow Patterns

### Pattern 1: Document → Reading → Milestone
```
User pastes text → POST /documents → Session created
        ↓
User reads (RSVP) → PATCH /sessions (progress updates)
        ↓
At 25/50/75/100% → pb_hooks creates milestone record
        ↓
SSE event → FastReader shows "Quiz available"
```

### Pattern 2: Question Generation (UI-triggered)
```
User clicks "Generate Quiz" → FastReader spawns AI CLI
        ↓
AI CLI → MCP → GET /sessions (get document context)
        ↓
AI CLI → MCP → GET /questions (get history for dedup)
        ↓
AI CLI generates questions
        ↓
AI CLI → MCP → POST /questions (save generated)
        ↓
PocketBase → SSE event → FastReader shows quiz modal
```

### Pattern 3: Answer → FSRS Scheduling
```
User answers → POST /question_attempts (answer + rating)
        ↓
pb_hooks/fsrs.pb.js calculates:
  - new stability
  - new difficulty
  - next due_at
        ↓
Record updated with FSRS values
```

---

## Implementation Phases

### Phase 1: Foundation
**Goal**: Core backend infrastructure

| Deliverable | Description |
|-------------|-------------|
| PocketBase setup | Download, configure, create collections |
| FSRS hook | Spaced repetition calculations in pb_hooks |
| Milestone hook | Auto-detect 25/50/75/100% progress |
| MCP server | Core tools for AI CLI integration |
| FastReader integration | PocketBase client + SSE subscriptions |

**After Phase 1**: User can read in FastReader, ask AI CLI for questions via conversation, questions sync back to UI via SSE.

---

### Phase 2: In-App Generation
**Goal**: Generate questions from FastReader UI

| Deliverable | Description |
|-------------|-------------|
| CLI spawner service | Spawn AI CLI from browser (Electron/Tauri) |
| Generate Quiz button | UI to trigger generation |
| Quiz modal | Display questions in FastReader |
| MCQ component | Multiple choice question UI |
| Answer submission | Record attempts to PocketBase |
| FSRS rating UI | Again/Hard/Good/Easy buttons |

**After Phase 2**: User can generate and answer questions entirely within FastReader UI, without opening terminal.

---

### Phase 3: Additional Question Types
**Goal**: Short answer and fill-in-blank support

| Deliverable | Description |
|-------------|-------------|
| Short answer component | Text input + self-assessment |
| Fill-in-blank component | Sentence with blank UI |
| AI evaluation flow | Optional AI grading for short answers |

**After Phase 3**: All three question types (MCQ, short answer, fill-in-blank) work in UI.

---

### Phase 4: Text Extraction
**Goal**: Import from PDF and URL

| Deliverable | Description |
|-------------|-------------|
| fastreader-extract CLI | Go binary for extraction |
| PDF extraction | Parse PDF text content |
| URL extraction | Fetch and clean web articles |
| Import UI | FastReader UI for import workflow |

**After Phase 4**: Users can import PDFs and web articles, not just pasted text.

---

### Phase 5: Review Dashboard
**Goal**: Spaced repetition management

| Deliverable | Description |
|-------------|-------------|
| Review dashboard | Page showing due questions |
| Review session flow | Guided review experience |
| Statistics display | Accuracy, retention metrics |

**After Phase 5**: Users can see what's due and complete spaced repetition reviews in FastReader.

---

### Phase 6: Polish & Distribution
**Goal**: Easy installation

| Deliverable | Description |
|-------------|-------------|
| GitHub releases | Cross-platform binaries |
| npm package | MCP server on npm |
| Migration scripts | Easy schema setup |
| Documentation | Install guides, troubleshooting |

**After Phase 6**: Polished, easy-to-install product.

---

## Key Technical Decisions

### Why PocketBase?
- Single binary (no separate database setup)
- Built-in REST API, SSE, admin dashboard
- JavaScript hooks for custom logic (FSRS)
- SQLite = simple backup (just copy the file)

### Why MCP for AI Integration?
- CLI-agnostic (works with Claude, Codex, OpenCode, etc.)
- Standardized protocol (JSON-RPC over stdio)
- AI can call tools without custom integration per CLI

### Why FSRS for Spaced Repetition?
- Modern algorithm (better than SM-2)
- Simple to implement (~50 lines)
- Well-documented with clear formulas

### Why Spawn AI CLI vs Direct API?
- Uses user's existing CLI authentication
- Works with any MCP-compatible CLI
- No need to manage API keys in FastReader

---

## Question Types & Distribution

| Type | Target % | Example |
|------|----------|---------|
| **Factual Recall** | ~40% | "What year did X happen?" |
| **Inference** | ~40% | "What does the author imply about X?" |
| **Synthesis** | ~20% | "How does concept A relate to concept B?" |

| Format | When to Use |
|--------|-------------|
| **Multiple Choice** | Factual recall, clear right/wrong |
| **Short Answer** | Deeper understanding, explanation |
| **Fill-in-blank** | Specific terminology, key phrases |

---

## FSRS Rating Scale

When user answers a question, they rate difficulty:

| Rating | Name | Meaning | Effect on Schedule |
|--------|------|---------|-------------------|
| 1 | Again | Couldn't recall | Short interval, stability drops |
| 2 | Hard | Recalled with difficulty | Longer interval with penalty |
| 3 | Good | Recalled with some effort | Normal interval increase |
| 4 | Easy | Instant recall | Longest interval, bonus |

---

## File Structure (Final State)

```
FastReader/
├── src/                          # React frontend
│   ├── contexts/
│   │   └── ComprehensionContext.tsx
│   ├── components/
│   │   ├── Quiz/
│   │   │   ├── QuizModal.tsx
│   │   │   ├── MCQQuestion.tsx
│   │   │   ├── ShortAnswerQuestion.tsx
│   │   │   └── FillBlankQuestion.tsx
│   │   └── ReviewDashboard/
│   └── services/
│       ├── pocketbase.ts
│       └── aiCli.ts
│
├── fastreader-backend/           # PocketBase backend
│   ├── pocketbase                # Binary
│   ├── pb_data/
│   │   └── data.db               # SQLite database
│   ├── pb_hooks/
│   │   ├── fsrs.pb.js            # FSRS algorithm
│   │   ├── sessions.pb.js        # Milestone detection
│   │   └── main.pb.js            # Hook registration
│   └── pb_migrations/            # Schema migrations
│
├── fastreader-mcp/               # MCP server
│   ├── src/
│   │   ├── index.ts
│   │   ├── tools.ts
│   │   └── pocketbase-client.ts
│   └── package.json
│
└── fastreader-extract/           # Text extraction CLI
    ├── cmd/
    │   └── fastreader-extract/
    │       └── main.go
    └── internal/
        ├── pdf/
        └── url/
```

---

## Reading the Phase Documents

Each phase document contains:

1. **Prerequisites** - What must be complete before starting
2. **Detailed Tasks** - Step-by-step implementation guide with verification
3. **Code Examples** - Complete, copy-paste ready code
4. **Testing Scripts** - Automated verification for each task
5. **Integration Testing** - End-to-end validation

**Available Phase Documents:**
- [Phase 1: Foundation](./PHASE_1_IMPLEMENTATION.md) - PocketBase + basic question storage

Read this guide first for context, then the phase document for implementation specifics.

---

## Quick Reference: API Endpoints

```
# Documents
GET    /api/collections/documents/records
POST   /api/collections/documents/records
GET    /api/collections/documents/records/{id}

# Sessions
GET    /api/collections/sessions/records?filter=is_active=true
PATCH  /api/collections/sessions/records/{id}

# Questions
GET    /api/collections/questions/records?filter=document="{id}"
POST   /api/collections/questions/records

# Attempts
POST   /api/collections/question_attempts/records

# Real-time
GET    /api/realtime (SSE)
```

---

## Quick Reference: MCP Tools

| Tool | Purpose |
|------|---------|
| `fastreader_get_current_session` | Get active session + document |
| `fastreader_get_document` | Get document by ID |
| `fastreader_list_documents` | List all documents |
| `fastreader_get_question_history` | Get existing questions (for dedup) |
| `fastreader_save_questions` | Save generated questions |
| `fastreader_record_answer` | Record answer + FSRS rating |
| `fastreader_get_due_questions` | Get questions due for review |
| `fastreader_get_session_stats` | Get reading/quiz statistics |

---

*For detailed implementation steps, see the phase-specific documents.*
