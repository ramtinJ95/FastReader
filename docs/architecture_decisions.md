# FastReader Comprehension Feature - Architecture Decisions

**Created:** 2026-01-18
**Status:** Approved
**Related Document:** [COMPREHENSION_FEATURE_SPEC.md](./COMPREHENSION_FEATURE_SPEC.md)

---

## Purpose

This document records key architectural decisions made during the design phase of the FastReader comprehension feature. These decisions override or modify the original specification and should be referenced when implementing each phase.

---

## Decision Log

### ADR-001: PocketBase Instead of Custom Go Backend

**Status:** Approved

**Context:**
The original spec proposed a custom Go backend (`fastreader-server`) with hand-written handlers, services, and SQLite management. This would require implementing:
- Database migrations
- Concurrent access handling
- Backup/export functionality
- Error recovery
- Logging infrastructure
- Configuration validation

**Decision:**
Use [PocketBase](https://pocketbase.io/) as the backend instead of a custom Go server.

**Rationale:**
PocketBase is a single-binary backend that provides all required functionality out of the box:

| Requirement | PocketBase Solution |
|-------------|---------------------|
| Schema migrations | Built-in with auto-generation (`--automigrate`) |
| Concurrent access | Transaction-based single-writer model |
| Backup/export | Built-in ZIP backups, S3 support, cron scheduling |
| Error recovery | Transaction rollbacks, automatic cleanup |
| Logging | Structured `slog` logging throughout |
| Configuration | Dashboard UI + CLI flags |
| REST API | Complete CRUD + filtering/sorting/pagination |
| Real-time sync | Server-Sent Events (SSE) subscriptions |
| Authentication | Multiple options (password, OAuth2, API keys) |

**Consequences:**
- Eliminates ~2000+ lines of custom Go code
- Reduces Phase 1 implementation time significantly
- Provides admin Dashboard for debugging and data inspection
- Requires learning PocketBase conventions
- Custom logic implemented via hooks instead of handlers

**References:**
- [PocketBase Documentation](https://pocketbase.io/docs/)
- [PocketBase GitHub](https://github.com/pocketbase/pocketbase)

---

### ADR-002: Real-Time Sync Between FastReader UI and Claude Code

**Status:** Approved

**Context:**
The original spec assumed users would manually refresh FastReader after generating questions in Claude Code, or switch between interfaces frequently.

**Decision:**
Implement real-time synchronization using PocketBase's Server-Sent Events (SSE) so that:
1. FastReader UI subscribes to question/session changes
2. When Claude Code saves questions to PocketBase, FastReader receives updates instantly
3. No manual refresh required

**Rationale:**
This enables a critical user workflow:

```
User in FastReader UI
        │
        ▼
Clicks "Generate Quiz" button
        │
        ▼
FastReader spawns AI CLI in background (claude, codex, opencode, etc.)
        │
        ▼
AI CLI generates questions → saves to PocketBase
        │
        ▼
PocketBase pushes update via SSE
        │
        ▼
Questions appear in FastReader UI automatically
        │
        ▼
User never leaves FastReader - seamless experience
```

**Consequences:**
- Superior user experience - no context switching required
- FastReader must implement SSE client
- Must handle connection drops and reconnection
- Enables future features like live progress indicators

**Implementation Notes:**
```javascript
// FastReader subscribes to questions collection
pb.collection('questions').subscribe('*', (e) => {
    if (e.action === 'create') {
        // New question appeared - update quiz UI
        addQuestionToQuiz(e.record);
    }
});
```

---

### ADR-003: CLI-Agnostic AI Assistant Integration

**Status:** Approved

**Context:**
The original spec was tightly coupled to Claude Code. However, users may prefer other AI coding assistants like Codex CLI, OpenCode, Aider, or future tools.

**Decision:**
FastReader spawns the AI assistant via configurable CLI command, defaulting to `claude` but allowing alternatives.

**Rationale:**
- User choice and flexibility
- Future-proofing against ecosystem changes
- Same MCP server works with any compatible CLI

**Configuration:**
```yaml
# ~/.fastreader/config.yaml
ai_assistant:
  command: "claude"  # or "codex", "opencode", "aider", etc.
  args: []           # additional CLI arguments
  timeout: 300       # seconds before killing process
```

**Implementation:**
```typescript
// FastReader spawns CLI as background process
const proc = spawn(config.ai_assistant.command, [
    ...config.ai_assistant.args,
    '--print',  // non-interactive mode
    `Generate ${count} comprehension questions for document ${docId}`
], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
});
```

**Consequences:**
- MCP server must be registered with the chosen CLI tool
- Different CLIs may have different argument conventions
- Need to document setup for each supported CLI
- FastReader UI needs to show "generating..." state while CLI runs

---

### ADR-004: JavaScript Hooks for Custom Logic (Not Go Extension)

**Status:** Approved

**Context:**
PocketBase supports two extension methods:
1. JavaScript hooks in `pb_hooks/` directory (interpreted)
2. Go framework extension (compiled custom binary)

**Decision:**
Use JavaScript hooks for all custom logic including FSRS spaced repetition.

**Rationale:**

| Factor | JavaScript | Go Extension |
|--------|------------|--------------|
| Setup | Drop files in folder | Requires Go toolchain |
| Deployment | Standard PocketBase binary | Custom compiled binary |
| Hot reload | Yes | No (rebuild required) |
| Contributor accessibility | Most devs know JS | Requires Go knowledge |
| FSRS complexity | ~50-100 lines pure JS | Import go-fsrs package |
| Debugging | console.log → logs | Go debugger |
| Performance | Adequate for single-user | Overkill |

FSRS algorithm is straightforward math (exponentials, min/max) that works fine in JavaScript:

```javascript
// pb_hooks/fsrs.pb.js
function nextStability(d, s, rating) {
    const hardPenalty = (rating === 2) ? 1.2 : 1;
    const easyBonus = (rating === 4) ? 1.3 : 1;
    return s * (1 + Math.exp(11.0) * Math.pow(d, -0.5) *
        (Math.pow(s, -0.2) - 1) * hardPenalty * easyBonus);
}
```

**Consequences:**
- Use official PocketBase binary (easier updates)
- No Go toolchain required for contributors
- Cannot use npm packages directly (CommonJS only, must inline dependencies)
- Hot reload during development

**Hook Files Structure:**
```
pb_hooks/
├── fsrs.pb.js        # FSRS algorithm implementation
├── questions.pb.js   # Question-related hooks
├── sessions.pb.js    # Session milestone detection
└── main.pb.js        # Hook registrations
```

---

### ADR-005: Separate Binary for PDF/URL Text Extraction

**Status:** Approved

**Context:**
The comprehension feature requires extracting text from:
- PDF files
- Web URLs (articles, blog posts)

Options considered:
1. PocketBase Go extension (contradicts ADR-004)
2. JavaScript hook with external service call (adds dependency)
3. Client-side in FastReader (limited PDF support in browser)
4. Separate extraction binary

**Decision:**
Create a separate small Go binary (`fastreader-extract`) for PDF and URL text extraction.

**Rationale:**
- Keeps PocketBase vanilla (JS hooks only)
- Go has excellent PDF libraries (pdfcpu, unipdf)
- Go has robust HTTP client and HTML parsing (colly, goquery)
- Single-purpose tool is easier to test and maintain
- Can be used standalone or called by FastReader

**Usage:**
```bash
# Extract from URL
fastreader-extract url "https://example.com/article" --output json

# Extract from PDF
fastreader-extract pdf document.pdf --output json

# Output format
{
  "title": "Article Title",
  "content": "Extracted text content...",
  "wordCount": 1542,
  "sourceType": "url",
  "sourcePath": "https://example.com/article"
}
```

**Integration with FastReader:**
```typescript
// FastReader calls extractor, then POSTs to PocketBase
const result = await execAsync(`fastreader-extract url "${url}" --output json`);
const doc = JSON.parse(result.stdout);
await pb.collection('documents').create(doc);
```

**Consequences:**
- Two binaries to distribute (PocketBase + fastreader-extract)
- Clear separation of concerns
- Extractor can evolve independently
- Could potentially be replaced with cloud service later

**Build Targets:**
| Platform | Binary Name |
|----------|-------------|
| Linux amd64 | `fastreader-extract-linux-amd64` |
| Linux arm64 | `fastreader-extract-linux-arm64` |
| macOS amd64 | `fastreader-extract-darwin-amd64` |
| macOS arm64 | `fastreader-extract-darwin-arm64` |
| Windows amd64 | `fastreader-extract-windows-amd64.exe` |

---

### ADR-006: PocketBase Collections Schema

**Status:** Approved

**Context:**
The original spec defined raw SQLite schema. With PocketBase, collections are defined via Dashboard or migrations.

**Decision:**
Define collections that map to the original data model but leverage PocketBase's built-in features.

**Collections:**

#### `documents`
| Field | Type | Notes |
|-------|------|-------|
| title | Text | Required |
| content | Text | Required |
| source_type | Select | Options: paste, file, url |
| source_path | Text | Original file path or URL |
| file_type | Select | Options: txt, md, pdf (nullable) |
| word_count | Number | Required |

#### `sessions`
| Field | Type | Notes |
|-------|------|-------|
| document | Relation | → documents (required) |
| current_word_index | Number | Default: 0 |
| total_words | Number | Required |
| progress_percent | Number | Default: 0.0 |
| wpm_setting | Number | Default: 300 |
| chunk_size | Number | Default: 1 |
| is_active | Bool | Default: true |
| completed_at | DateTime | Nullable |

#### `questions`
| Field | Type | Notes |
|-------|------|-------|
| document | Relation | → documents (required) |
| session | Relation | → sessions (nullable) |
| question_text | Text | Required |
| question_type | Select | multiple_choice, short_answer, fill_in_blank |
| comprehension_type | Select | factual_recall, inference, synthesis |
| difficulty | Select | easy, medium, hard |
| options | JSON | For MCQ: {A, B, C, D} |
| correct_answer | Text | Required |
| distractor_explanations | JSON | For MCQ |
| ideal_answer | Text | For short_answer |
| acceptable_variations | JSON | Array of strings |
| required_concepts | JSON | Array of strings |
| scoring_rubric | JSON | {full_credit, partial_credit, no_credit} |
| sentence_with_blank | Text | For fill_in_blank |
| correct_answers | JSON | Array for fill_in_blank |
| context_hint | Text | Optional hint |
| rationale | Text | Required |
| passage_evidence | Text | Supporting quote |
| passage_location | Text | Paragraph reference |
| chunk_start_index | Number | Word position start |
| chunk_end_index | Number | Word position end |

#### `question_attempts`
| Field | Type | Notes |
|-------|------|-------|
| question | Relation | → questions (required) |
| user_answer | Text | Nullable |
| is_correct | Bool | Nullable |
| time_spent_ms | Number | Nullable |
| rating | Number | 1-4 (FSRS scale) |
| stability | Number | FSRS stability |
| difficulty | Number | FSRS difficulty (different from question difficulty) |
| due_at | DateTime | Next review date |
| state | Number | 0=New, 1=Learning, 2=Review, 3=Relearning |
| reps | Number | Review count |
| lapses | Number | Failure count |

#### `session_milestones`
| Field | Type | Notes |
|-------|------|-------|
| session | Relation | → sessions (required) |
| milestone_percent | Number | 25, 50, 75, or 100 |
| quiz_prompted | Bool | Default: false |
| quiz_completed | Bool | Default: false |

**Consequences:**
- Schema defined in Dashboard or via JS migrations
- PocketBase handles indexes automatically
- Relations provide automatic cascading
- JSON fields for flexible nested data

---

### ADR-007: Revised Component Architecture

**Status:** Approved

**Context:**
With the above decisions, the system architecture changes significantly from the original spec.

**Decision:**
The new architecture consists of four components:

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
│  │                   │                    │   └─────────────────────┘   │  │
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
│  └───────────────────┘                    │   - ~100 lines of code      │  │
│                                           └─────────────────────────────┘  │
│  ┌───────────────────┐                                                     │
│  │ fastreader-extract│  (standalone CLI for PDF/URL extraction)           │
│  └───────────────────┘                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Component Responsibilities:**

| Component | Language | Responsibility |
|-----------|----------|----------------|
| **FastReader** | React/TypeScript | RSVP reading, quiz UI, SSE subscription, CLI spawning |
| **PocketBase** | Go (binary) | REST API, SQLite, real-time subscriptions, auth |
| **pb_hooks/** | JavaScript | FSRS calculations, milestone detection, custom logic |
| **MCP Server** | Node.js/TypeScript | Translate MCP calls to PocketBase API for AI CLI |
| **fastreader-extract** | Go | PDF text extraction, URL content extraction |
| **AI CLI** | Any | Question generation, answer evaluation (via MCP) |

**Consequences:**
- Simpler architecture with fewer custom components
- Clear separation between data layer (PocketBase) and AI layer (CLI + MCP)
- FastReader has more responsibility (CLI spawning, SSE handling)
- Standard PocketBase binary means easier updates

---

## Summary of Changes to Original Spec

| Original Spec Section | Change Required |
|-----------------------|-----------------|
| Section 3 (Architecture) | Replace diagram and component table |
| Section 4.1 (fastreader-server) | Remove entirely, replace with PocketBase + hooks |
| Section 4.2 (MCP Server) | Update to call PocketBase API |
| Section 5 (Data Models) | Convert to PocketBase collections |
| Section 6 (API Specification) | Replace with PocketBase standard API reference |
| Section 7 (MCP Server Spec) | Update endpoint URLs to PocketBase format |
| Section 8 (User Flows) | Add CLI spawning flow, SSE subscription |
| Section 9 (FastReader UI) | Add CLI spawner component, SSE state management |
| Section 11 (Spaced Repetition) | Replace Go code with JS hook |
| Section 12 (Distribution) | Update for PocketBase + fastreader-extract |
| Section 13 (Roadmap) | Simplify phases, reduce backend work |
| New Section | Add fastreader-extract specification |

---

## Appendix: Technology Versions

| Technology | Version | Notes |
|------------|---------|-------|
| PocketBase | 0.23+ | Required for rate limiting features |
| Node.js | 18+ | For MCP server |
| Go | 1.21+ | For fastreader-extract |
| React | 18+ | For FastReader |

---

*End of Architecture Decisions Document*
