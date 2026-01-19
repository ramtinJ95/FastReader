# FastReader

A fast, distraction-free speed reading app using RSVP (Rapid Serial Visual Presentation) technique.

## Features

- **RSVP Reading**: Display one word at a time at a fixed focal point
- **ORP Highlighting**: Optimal Recognition Point highlighting for faster comprehension
- **Adjustable Speed**: 50-1000 WPM with preset buttons
- **PDF Support**: Upload and read PDF documents
- **Session Persistence**: Save and resume your reading progress
- **Keyboard Shortcuts**: Full keyboard navigation
- **Mobile Friendly**: Touch controls for mobile devices
- **Dark Theme**: Easy on the eyes for extended reading
- **Comprehension Quizzes** (optional): AI-generated questions at reading milestones (25%, 50%, 75%, 100%)
- **Spaced Repetition**: FSRS-based review scheduling for long-term retention

## Running Locally

### Prerequisites

- Node.js 18+ (check with `node --version`)
- npm (comes with Node.js)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ramtinJ95/FastReader.git
   cd FastReader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

### Backend Setup (Optional)

The comprehension features require a PocketBase backend. Skip this if you only want the core RSVP reader.

1. Copy environment config:
   ```bash
   cp .env.example .env
   ```

2. Start PocketBase:
   ```bash
   cd fastreader-backend
   ./start.sh
   ```

3. Access the admin UI at http://127.0.0.1:8090/_/ to create an admin account on first run

The frontend will show a connection indicator (●/○) in the header when the backend is available.

### Production Build

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

The production build outputs to `dist/` and can be served by any static file host.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause/Resume |
| `Escape` | Stop playback / Close dialogs |
| `G` | Jump to position |
| `S` | Open settings |
| `T` | Open text input |
| `Ctrl+S` | Save session |
| `↑` / `↓` | Increase/Decrease WPM |
| `←` / `→` | Skip backward/forward |

## Settings

- **Words per Minute (WPM)**: 50-1000, with presets at 200, 300, 400, 500
- **Fade Effect**: Smooth transitions between words
- **Punctuation Pauses**: Longer pauses at sentence endings
- **Long Word Adjustment**: Extra time for complex words
- **Periodic Pause**: Auto-pause every N words
- **Context Words**: Show surrounding words for context

## Technology Stack

- React 18
- TypeScript
- Vite
- PDF.js for PDF parsing
- PocketBase for backend (optional)
- Vitest for testing
- Playwright for E2E tests

## Development

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
├── components/       # React components (RSVPDisplay, Quiz/, dialogs/)
├── hooks/           # Custom React hooks (usePlayback, useComprehension)
├── services/        # API clients (pocketbase.ts, aiCli.ts)
├── lib/             # Utility functions
├── types/           # TypeScript types
└── __tests__/       # Integration tests

fastreader-backend/  # PocketBase backend (optional)
├── pb_hooks/        # JSVM hooks (FSRS, milestones)
├── pb_migrations/   # Collection schemas
└── start.sh         # Startup script

fastreader-mcp/      # MCP server for AI assistants
└── src/             # Tool definitions for question generation
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

## License

MIT

## Acknowledgments

Based on [thomaskolmans/rsvp-reading](https://github.com/thomaskolmans/rsvp-reading)
