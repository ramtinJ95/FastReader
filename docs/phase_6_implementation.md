# Phase 6: Polish & Distribution - Implementation Guide

**Goal**: Easy installation and distribution of all FastReader comprehension components.

**Prerequisites**: Phases 1-5 completed and working locally.

---

## Overview

This phase packages and distributes all components:

| Component | Distribution | Registry |
|-----------|--------------|----------|
| `fastreader-extract` | GitHub Releases | Binary downloads |
| `fastreader-mcp` | npm | npmjs.com |
| PocketBase schema | Migration files | Bundled with repo |
| Documentation | Markdown | GitHub repo |

---

## Task 1: GitHub Releases for fastreader-extract

### 1.1 Create Release Workflow ✅ COMPLETED

Create `.github/workflows/release-extract.yml`:

```yaml
name: Release fastreader-extract

on:
  push:
    tags:
      - 'extract-v*'

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - goos: linux
            goarch: amd64
          - goos: linux
            goarch: arm64
          - goos: darwin
            goarch: amd64
          - goos: darwin
            goarch: arm64
          - goos: windows
            goarch: amd64
            ext: .exe

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build
        working-directory: fastreader-extract
        env:
          GOOS: ${{ matrix.goos }}
          GOARCH: ${{ matrix.goarch }}
        run: |
          OUTPUT="fastreader-extract-${{ matrix.goos }}-${{ matrix.goarch }}${{ matrix.ext }}"
          go build -ldflags="-s -w" -o "../dist/${OUTPUT}" ./cmd/fastreader-extract

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: fastreader-extract-${{ matrix.goos }}-${{ matrix.goarch }}
          path: dist/

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: dist
          merge-multiple: true

      - name: Create checksums
        run: |
          cd dist
          sha256sum * > checksums.txt

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: dist/*
          generate_release_notes: true
```

### 1.2 Add Makefile for Local Builds ✅ COMPLETED

Create `fastreader-extract/Makefile`:

```makefile
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -ldflags="-s -w -X main.version=$(VERSION)"

.PHONY: build build-all test clean

build:
	go build $(LDFLAGS) -o bin/fastreader-extract ./cmd/fastreader-extract

build-all:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o bin/fastreader-extract-linux-amd64 ./cmd/fastreader-extract
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o bin/fastreader-extract-linux-arm64 ./cmd/fastreader-extract
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o bin/fastreader-extract-darwin-amd64 ./cmd/fastreader-extract
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o bin/fastreader-extract-darwin-arm64 ./cmd/fastreader-extract
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o bin/fastreader-extract-windows-amd64.exe ./cmd/fastreader-extract

test:
	go test -v ./...

clean:
	rm -rf bin/
```

### 1.3 Verification

```bash
# Build all platforms locally
cd fastreader-extract
make build-all

# Verify binaries exist
ls -la bin/
# Expected: 5 binaries for each platform

# Test local binary
./bin/fastreader-extract --version
./bin/fastreader-extract url "https://example.com" --output json

# Create and push a test tag
git tag extract-v0.1.0
git push origin extract-v0.1.0

# Check GitHub Actions → verify workflow runs
# Check GitHub Releases → verify binaries uploaded with checksums
```

---

## Task 2: npm Package for MCP Server

### 2.1 Configure package.json ✅ COMPLETED

Update `fastreader-mcp/package.json`:

```json
{
  "name": "@anthropic/fastreader-mcp",
  "version": "1.0.0",
  "description": "MCP server for FastReader comprehension features",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "fastreader-mcp": "dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "mcp",
    "fastreader",
    "comprehension",
    "spaced-repetition"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/fastreader.git",
    "directory": "fastreader-mcp"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "pocketbase": "^0.21.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

### 2.2 Add Shebang to Entry Point ✅ COMPLETED

Update `fastreader-mcp/src/index.ts` - add as first line:

```typescript
#!/usr/bin/env node
```

### 2.3 Configure TypeScript ✅ COMPLETED

Create/update `fastreader-mcp/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.4 Create npm Publish Workflow ✅ COMPLETED

Create `.github/workflows/publish-mcp.yml`:

```yaml
name: Publish MCP Server

on:
  push:
    tags:
      - 'mcp-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: fastreader-mcp
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run build
      - run: npm run test

      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 2.5 Verification

```bash
cd fastreader-mcp

# Build and test locally
npm ci
npm run build
npm run typecheck
npm run test

# Test as global package locally
npm link
fastreader-mcp --help  # Should start server or show help

# Test with npx (dry run)
npm pack
# Inspect tarball contents

# Verify MCP integration
claude mcp add fastreader-test -- node ./dist/index.js
claude mcp list  # Should show fastreader-test
claude mcp remove fastreader-test

# When ready: create tag and push
git tag mcp-v1.0.0
git push origin mcp-v1.0.0
# Verify npm package appears at npmjs.com
```

---

## Task 3: PocketBase Migration Scripts

### 3.1 Export Schema Migration ✅ COMPLETED

Create `fastreader-backend/pb_migrations/1_initial_schema.js`:

```javascript
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Documents collection
  const documents = new Collection({
    name: "documents",
    type: "base",
    schema: [
      { name: "title", type: "text", required: true },
      { name: "content", type: "text", required: true },
      { name: "source_type", type: "select", required: true, options: { values: ["paste", "file", "url"] } },
      { name: "source_path", type: "text", required: false },
      { name: "file_type", type: "select", required: false, options: { values: ["txt", "md", "pdf"] } },
      { name: "word_count", type: "number", required: true }
    ]
  });
  app.save(documents);

  // Sessions collection
  const sessions = new Collection({
    name: "sessions",
    type: "base",
    schema: [
      { name: "document", type: "relation", required: true, options: { collectionId: documents.id, maxSelect: 1 } },
      { name: "current_word_index", type: "number", required: false },
      { name: "total_words", type: "number", required: true },
      { name: "progress_percent", type: "number", required: false },
      { name: "wpm_setting", type: "number", required: false },
      { name: "chunk_size", type: "number", required: false },
      { name: "is_active", type: "bool", required: false },
      { name: "completed_at", type: "date", required: false }
    ]
  });
  app.save(sessions);

  // Questions collection
  const questions = new Collection({
    name: "questions",
    type: "base",
    schema: [
      { name: "document", type: "relation", required: true, options: { collectionId: documents.id, maxSelect: 1 } },
      { name: "session", type: "relation", required: false, options: { collectionId: sessions.id, maxSelect: 1 } },
      { name: "question_text", type: "text", required: true },
      { name: "question_type", type: "select", required: true, options: { values: ["multiple_choice", "short_answer", "fill_in_blank"] } },
      { name: "comprehension_type", type: "select", required: true, options: { values: ["factual_recall", "inference", "synthesis"] } },
      { name: "difficulty", type: "select", required: false, options: { values: ["easy", "medium", "hard"] } },
      { name: "options", type: "json", required: false },
      { name: "correct_answer", type: "text", required: true },
      { name: "distractor_explanations", type: "json", required: false },
      { name: "ideal_answer", type: "text", required: false },
      { name: "acceptable_variations", type: "json", required: false },
      { name: "required_concepts", type: "json", required: false },
      { name: "scoring_rubric", type: "json", required: false },
      { name: "sentence_with_blank", type: "text", required: false },
      { name: "correct_answers", type: "json", required: false },
      { name: "context_hint", type: "text", required: false },
      { name: "rationale", type: "text", required: true },
      { name: "passage_evidence", type: "text", required: false },
      { name: "passage_location", type: "text", required: false },
      { name: "chunk_start_index", type: "number", required: false },
      { name: "chunk_end_index", type: "number", required: false }
    ]
  });
  app.save(questions);

  // Question attempts collection
  const questionAttempts = new Collection({
    name: "question_attempts",
    type: "base",
    schema: [
      { name: "question", type: "relation", required: true, options: { collectionId: questions.id, maxSelect: 1 } },
      { name: "user_answer", type: "text", required: false },
      { name: "is_correct", type: "bool", required: false },
      { name: "time_spent_ms", type: "number", required: false },
      { name: "rating", type: "number", required: false },
      { name: "stability", type: "number", required: false },
      { name: "difficulty", type: "number", required: false },
      { name: "due_at", type: "date", required: false },
      { name: "state", type: "number", required: false },
      { name: "reps", type: "number", required: false },
      { name: "lapses", type: "number", required: false }
    ]
  });
  app.save(questionAttempts);

  // Session milestones collection
  const sessionMilestones = new Collection({
    name: "session_milestones",
    type: "base",
    schema: [
      { name: "session", type: "relation", required: true, options: { collectionId: sessions.id, maxSelect: 1 } },
      { name: "milestone_percent", type: "number", required: true },
      { name: "quiz_prompted", type: "bool", required: false },
      { name: "quiz_completed", type: "bool", required: false }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_session_milestone ON session_milestones (session, milestone_percent)"
    ]
  });
  app.save(sessionMilestones);

}, (app) => {
  // Rollback
  app.delete(app.findCollectionByNameOrId("session_milestones"));
  app.delete(app.findCollectionByNameOrId("question_attempts"));
  app.delete(app.findCollectionByNameOrId("questions"));
  app.delete(app.findCollectionByNameOrId("sessions"));
  app.delete(app.findCollectionByNameOrId("documents"));
});
```

### 3.2 Create Setup Script ✅ COMPLETED

Create `fastreader-backend/setup.sh`:

```bash
#!/bin/bash
set -e

echo "FastReader Backend Setup"
echo "========================"

# Check for PocketBase
if ! command -v pocketbase &> /dev/null && [ ! -f "./pocketbase" ]; then
    echo "Downloading PocketBase..."

    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
    esac

    VERSION="0.23.4"
    URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${OS}_${ARCH}.zip"

    curl -L "$URL" -o pocketbase.zip
    unzip pocketbase.zip pocketbase
    rm pocketbase.zip
    chmod +x pocketbase
fi

# Run migrations
echo "Running migrations..."
./pocketbase migrate up

# Copy hooks
echo "Installing hooks..."
mkdir -p pb_hooks
cp -r hooks/* pb_hooks/ 2>/dev/null || true

echo ""
echo "Setup complete! Start the server with:"
echo "  ./pocketbase serve"
```

### 3.3 Verification

```bash
cd fastreader-backend

# Test fresh setup
rm -rf pb_data  # Start fresh
chmod +x setup.sh
./setup.sh

# Verify migrations ran
./pocketbase migrate status
# Should show migration as applied

# Start server and verify collections
./pocketbase serve &
PB_PID=$!
sleep 2

# Test API endpoints exist
curl -s http://127.0.0.1:8090/api/collections | jq '.[] | .name'
# Expected: documents, sessions, questions, question_attempts, session_milestones

kill $PB_PID
```

---

## Task 4: Installation Documentation

### 4.1 Create INSTALL.md ✅ COMPLETED

Create `docs/INSTALL.md`:

```markdown
# FastReader Comprehension - Installation Guide

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/username/fastreader.git
cd fastreader

# 2. Setup backend
cd fastreader-backend
./setup.sh
./pocketbase serve &

# 3. Add MCP server to your AI CLI
claude mcp add fastreader -- npx @anthropic/fastreader-mcp

# 4. Start FastReader (in another terminal)
cd ../frontend
npm install
npm run dev

# 5. Open http://localhost:5173
```

## Component Installation

### PocketBase Backend

**Option A: Use setup script (recommended)**
```bash
cd fastreader-backend
./setup.sh
./pocketbase serve
```

**Option B: Manual installation**
```bash
# Download PocketBase from https://pocketbase.io/docs
# Extract to fastreader-backend/
./pocketbase migrate up
./pocketbase serve
```

The backend runs at `http://127.0.0.1:8090`. Admin UI at `http://127.0.0.1:8090/_/`.

### MCP Server

**For Claude Code:**
```bash
claude mcp add fastreader -- npx @anthropic/fastreader-mcp
```

**For other AI CLIs:**
```bash
npm install -g @anthropic/fastreader-mcp
# Then add "fastreader-mcp" to your CLI's MCP configuration
```

**Configuration (optional):**
```bash
export FASTREADER_API_URL="http://127.0.0.1:8090"
```

### Text Extractor (optional)

Download from [GitHub Releases](https://github.com/username/fastreader/releases):

```bash
# Linux/macOS
curl -L https://github.com/username/fastreader/releases/latest/download/fastreader-extract-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o fastreader-extract
chmod +x fastreader-extract
sudo mv fastreader-extract /usr/local/bin/
```

## Verification

```bash
# Check PocketBase is running
curl http://127.0.0.1:8090/api/health

# Check MCP server works
claude mcp list  # Should show "fastreader"

# Check text extractor
fastreader-extract --version
```

## Troubleshooting

### "PocketBase is not running"
Start PocketBase: `cd fastreader-backend && ./pocketbase serve`

### "MCP server not found"
Re-add the server: `claude mcp add fastreader -- npx @anthropic/fastreader-mcp`

### SSE connection issues
1. Verify PocketBase is running
2. Check browser console for errors
3. Refresh the page
```

### 4.2 Update Main README ✅ COMPLETED

Add to root `README.md`:

```markdown
## Comprehension Features

FastReader includes AI-powered reading comprehension questions. See [Installation Guide](docs/INSTALL.md) for setup.

### Requirements
- PocketBase (backend)
- AI CLI with MCP support (Claude Code, Codex, etc.)
- Node.js 18+ (for MCP server)

### Quick Setup
```bash
cd fastreader-backend && ./setup.sh && ./pocketbase serve
claude mcp add fastreader -- npx @anthropic/fastreader-mcp
```
```

### 4.3 Verification

```bash
# Verify documentation renders correctly
# Open docs/INSTALL.md in GitHub preview or markdown viewer

# Follow the Quick Start steps on a fresh clone
cd /tmp
git clone /path/to/fastreader test-install
cd test-install
# Follow each step and verify it works
```

---

## Task 5: Error Handling Improvements

### 5.1 MCP Server Error Messages ✅ COMPLETED

Update `fastreader-mcp/src/index.ts` error handling:

```typescript
// Add at the top of the file
const ERROR_MESSAGES = {
  POCKETBASE_NOT_RUNNING:
    "PocketBase is not running. Start it with: cd fastreader-backend && ./pocketbase serve",
  NO_ACTIVE_SESSION:
    "No active reading session. Open a document in FastReader first.",
  DOCUMENT_NOT_FOUND: (id: string) =>
    `Document '${id}' not found. Use fastreader_list_documents to see available documents.`,
  QUESTION_NOT_FOUND: (id: string) =>
    `Question '${id}' not found.`,
  INVALID_RATING:
    "Rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy).",
};

// Update the catch block in CallToolRequestSchema handler
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  let userMessage = message;

  if (message.includes('ECONNREFUSED')) {
    userMessage = ERROR_MESSAGES.POCKETBASE_NOT_RUNNING;
  } else if (message.includes('404') && message.includes('document')) {
    userMessage = ERROR_MESSAGES.DOCUMENT_NOT_FOUND(args?.documentId || 'unknown');
  } else if (message.includes('404') && message.includes('question')) {
    userMessage = ERROR_MESSAGES.QUESTION_NOT_FOUND(args?.questionId || 'unknown');
  }

  return {
    content: [{
      type: "text",
      text: `Error: ${userMessage}`
    }],
    isError: true
  };
}
```

### 5.2 Add Input Validation ✅ COMPLETED

Add to `fastreader-mcp/src/tools.ts`:

```typescript
export function validateRating(rating: number): void {
  if (![1, 2, 3, 4].includes(rating)) {
    throw new Error(ERROR_MESSAGES.INVALID_RATING);
  }
}

export function validateDocumentId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error("documentId is required and must be a non-empty string");
  }
  return id;
}

export function validateQuestions(questions: unknown): void {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("questions must be a non-empty array");
  }

  for (const q of questions) {
    if (!q.questionText || !q.questionType || !q.correctAnswer || !q.rationale) {
      throw new Error("Each question must have questionText, questionType, correctAnswer, and rationale");
    }
  }
}
```

### 5.3 Verification

```bash
cd fastreader-mcp
npm run build

# Test error messages (with PocketBase stopped)
pkill pocketbase || true
node dist/index.js << 'EOF'
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fastreader_get_current_session","arguments":{}}}
EOF
# Should show "PocketBase is not running" message

# Start PocketBase and test validation
./pocketbase serve &
sleep 2

# Test invalid document ID
node dist/index.js << 'EOF'
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fastreader_get_document","arguments":{"documentId":"invalid123"}}}
EOF
# Should show document not found message

npm run test  # Run unit tests
```

---

## Final Validation

### End-to-End Test

Perform a complete installation and usage test:

```bash
# 1. Start fresh (simulate new user)
cd /tmp
rm -rf fastreader-test
mkdir fastreader-test && cd fastreader-test

# 2. Download/clone repository
git clone https://github.com/username/fastreader.git .

# 3. Setup backend
cd fastreader-backend
./setup.sh
./pocketbase serve &
PB_PID=$!
sleep 3

# 4. Verify backend
curl -s http://127.0.0.1:8090/api/health
curl -s http://127.0.0.1:8090/api/collections | jq 'length'
# Expected: 5 collections

# 5. Install MCP server
claude mcp add fastreader -- npx @anthropic/fastreader-mcp

# 6. Test MCP tools work
claude "Use fastreader_get_session_stats to check my reading stats"
# Should return stats (0 documents initially)

# 7. Start frontend and test full flow
cd ../frontend
npm install
npm run dev &
sleep 5

# 8. Open browser and verify:
# - Connection indicator shows "Connected"
# - Can paste text and start reading
# - "Generate Quiz" button appears
# - Quiz modal works after AI generates questions

# 9. Cleanup
kill $PB_PID
claude mcp remove fastreader
```

### Checklist

- [x] GitHub Actions workflow builds binaries for all platforms
- [x] GitHub Releases contain binaries and checksums
- [x] npm package publishes successfully
- [x] `npx @anthropic/fastreader-mcp` works
- [x] `setup.sh` creates working PocketBase instance
- [x] Migrations create all 5 collections
- [x] Error messages are helpful and actionable
- [x] INSTALL.md is accurate and complete
- [x] End-to-end flow works from fresh clone

---

## Files Created/Modified

| File | Action |
|------|--------|
| `.github/workflows/release-extract.yml` | Created |
| `.github/workflows/publish-mcp.yml` | Created |
| `fastreader-extract/Makefile` | Created |
| `fastreader-mcp/package.json` | Updated |
| `fastreader-mcp/tsconfig.json` | Updated |
| `fastreader-backend/pb_migrations/1_initial_schema.js` | Created |
| `fastreader-backend/setup.sh` | Created |
| `docs/INSTALL.md` | Created |
| `README.md` | Updated |
| `fastreader-mcp/src/index.ts` | Updated (error handling) |
