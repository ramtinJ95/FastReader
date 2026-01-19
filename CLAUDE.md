# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastReader is a speed reading web app using RSVP (Rapid Serial Visual Presentation) technique. It displays one word at a time with ORP (Optimal Recognition Point) highlighting to improve reading speed. Includes optional comprehension testing with AI-generated questions and spaced repetition (FSRS).

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build

# Backend (optional - for comprehension features)
cd fastreader-backend && ./start.sh  # Start PocketBase (http://127.0.0.1:8090)

# Testing
npm run test         # Run Vitest in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run E2E tests with UI

# Run a single test file
npx vitest run src/hooks/usePlayback.test.ts

# Code Quality
npm run lint         # ESLint check
npm run format       # Prettier format
```

## Architecture

### Core Data Flow

1. **Text Input** → `parseText()` (in `lib/rsvp-utils.ts`) splits text into words
2. **Playback Engine** → `usePlayback` hook manages word-by-word timing and state
3. **Display** → `RSVPDisplay` renders current word with ORP highlighting
4. **Comprehension** (optional) → `useComprehension` syncs to PocketBase, triggers quizzes at milestones

### Key Modules

**`src/hooks/usePlayback.ts`** - Central playback engine
- Manages play/pause/stop state machine
- Calculates word delays based on WPM, punctuation, word length
- Implements WPM ramp-up feature (gradual speed increase)
- Uses refs to avoid stale closure issues in timers

**`src/hooks/useSession.ts`** - Local session persistence
- Saves/loads reading progress to localStorage
- Shows resume prompt on page load if previous session exists

**`src/hooks/useComprehension.ts`** - Comprehension feature orchestrator
- Manages PocketBase connection status
- Syncs documents and tracks reading progress server-side
- Subscribes to SSE for real-time question delivery
- Handles quiz state and FSRS-rated answer recording

**`src/lib/rsvp-utils.ts`** - RSVP algorithms
- `getORPIndex()` / `getActualORPIndex()` - Calculate optimal recognition point
- `splitWordForDisplay()` - Split word into before/ORP/after parts
- `getWordDelay()` - Calculate display duration per word
- `extractWordFrame()` - Multi-word context display

**`src/services/pocketbase.ts`** - Backend API client
- CRUD for documents, sessions, questions, attempts
- Real-time subscriptions (SSE) for questions and milestones
- Singleton PocketBase instance with auto-cancellation disabled

**`src/types/index.ts`** - Core TypeScript interfaces
- `Settings` interface defines all configurable options
- `DEFAULT_SETTINGS` contains sensible defaults

**`src/types/comprehension.ts`** - Comprehension feature types
- Mirrors PocketBase collections (documents, sessions, questions, attempts)
- FSRS rating constants and quiz state interfaces

### Backend Architecture (fastreader-backend/)

PocketBase backend with JSVM hooks:
- **Collections**: documents, sessions, questions, question_attempts, session_milestones
- **`pb_hooks/fsrs.pb.js`** - Calculates spaced repetition scheduling on answer submission
- **`pb_hooks/sessions.pb.js`** - Creates milestones (25%, 50%, 75%, 100%) when sessions are created

### MCP Server (fastreader-mcp/)

Model Context Protocol server exposing FastReader tools to AI assistants:
- `fastreader_get_current_session` - Get active session with document content
- `fastreader_save_questions` - Persist AI-generated questions
- `fastreader_get_question_history` - Avoid duplicate questions
- `fastreader_record_answer` - Record answers with FSRS ratings

### Settings System

Settings are passed through the component tree (no global state). Key settings:
- `wordsPerMinute` - Base reading speed (50-1000)
- `fadeEnabled` / `fadeDuration` - Word transition effects
- `pauseOnPunctuation` / `punctuationPauseMultiplier` - Pause at sentence endings
- `rampUpEnabled` / `rampUpStartWpm` / `rampUpDuration` - Gradual speed increase

### Component Structure

- `App.tsx` - Main orchestrator, keyboard shortcuts, dialog management, comprehension integration
- `RSVPDisplay` - Word rendering with ORP highlighting
- `Controls` - Play/pause/stop buttons
- `ProgressBar` - Clickable progress with seek support, quiz button
- `Settings` - Configuration dialog
- `TextInput` - Text/PDF file input dialog
- `TouchControls` - Mobile gesture controls
- `Quiz/` - QuizModal, MCQQuestion, QuizFeedback, MilestonePrompt, GeneratingOverlay

## Testing Strategy

- Unit tests: `*.test.ts(x)` files co-located with source
- Integration tests: `*.integration.test.ts(x)` for hook + component interaction
- E2E tests: `e2e/` directory using Playwright

## Environment Variables

Copy `.env.example` to `.env`:
- `VITE_POCKETBASE_URL` - Backend URL (default: http://127.0.0.1:8090)

## Tech Stack

- React 18 + TypeScript
- Vite for build/dev
- Vitest for unit/integration tests
- Playwright for E2E tests
- PDF.js for PDF parsing
- PocketBase for backend (optional)
- ESLint + Prettier for code quality
