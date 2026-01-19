# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastReader is a speed reading web app using RSVP (Rapid Serial Visual Presentation) technique. It displays one word at a time with ORP (Optimal Recognition Point) highlighting to improve reading speed.

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build

# Testing
npm run test         # Run Vitest in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run E2E tests with UI

# Code Quality
npm run lint         # ESLint check
npm run format       # Prettier format
```

## Architecture

### Core Data Flow

1. **Text Input** → `parseText()` (in `lib/rsvp-utils.ts`) splits text into words
2. **Playback Engine** → `usePlayback` hook manages word-by-word timing and state
3. **Display** → `RSVPDisplay` renders current word with ORP highlighting

### Key Modules

**`src/hooks/usePlayback.ts`** - Central playback engine
- Manages play/pause/stop state machine
- Calculates word delays based on WPM, punctuation, word length
- Implements WPM ramp-up feature (gradual speed increase)
- Uses refs to avoid stale closure issues in timers

**`src/hooks/useSession.ts`** - Session persistence
- Saves/loads reading progress to localStorage
- Shows resume prompt on page load if previous session exists

**`src/lib/rsvp-utils.ts`** - RSVP algorithms
- `getORPIndex()` / `getActualORPIndex()` - Calculate optimal recognition point
- `splitWordForDisplay()` - Split word into before/ORP/after parts
- `getWordDelay()` - Calculate display duration per word
- `extractWordFrame()` - Multi-word context display

**`src/types/index.ts`** - TypeScript interfaces
- `Settings` interface defines all configurable options
- `DEFAULT_SETTINGS` contains sensible defaults

### Settings System

Settings are passed through the component tree (no global state). The `Settings` interface includes:
- `wordsPerMinute` - Base reading speed (50-1000)
- `fadeEnabled` / `fadeDuration` - Word transition effects
- `pauseOnPunctuation` / `punctuationPauseMultiplier` - Pause at sentence endings
- `wordLengthWPMMultiplier` - Extra time for long words
- `rampUpEnabled` / `rampUpStartWpm` / `rampUpDuration` - Gradual speed increase

### Component Structure

- `App.tsx` - Main orchestrator, keyboard shortcuts, dialog management
- `RSVPDisplay` - Word rendering with ORP highlighting
- `Controls` - Play/pause/stop buttons
- `ProgressBar` - Clickable progress with seek support
- `Settings` - Configuration dialog
- `TextInput` - Text/PDF file input dialog
- `TouchControls` - Mobile gesture controls
- `dialogs/` - JumpToDialog, SavedSessionPrompt

## Testing Strategy

- Unit tests: `*.test.ts(x)` files co-located with source
- Integration tests: `*.integration.test.ts(x)` for hook + component interaction
- E2E tests: `e2e/` directory using Playwright

## Tech Stack

- React 18 + TypeScript
- Vite for build/dev
- Vitest for unit/integration tests
- Playwright for E2E tests
- PDF.js for PDF parsing
- ESLint + Prettier for code quality
