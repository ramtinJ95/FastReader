# FastReader

A speed reading application using RSVP (Rapid Serial Visual Presentation) technique. Displays one word at a time at a fixed focal point with ORP (Optimal Recognition Point) highlighting to eliminate eye movement during reading.

## Features

- **ORP Highlighting** - Red highlighted letter at optimal focus point
- **Adjustable WPM** - 50-1000 words per minute with presets
- **Punctuation Pauses** - Longer delays on sentence endings
- **Focus Mode** - Minimal UI during reading
- **Progress Tracking** - Seekable progress bar with time remaining
- **Session Persistence** - Save/resume reading sessions
- **PDF Support** - Extract text from PDF files
- **Keyboard Shortcuts** - Full keyboard navigation

## Tech Stack

- React 18
- TypeScript
- Vite
- Vitest (testing)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Format code
npm run format
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause/Resume toggle |
| `Escape` | Close panels / Exit focus mode |
| `G` | Open jump-to dialog |
| `Ctrl+S` / `Cmd+S` | Save session |
| `Arrow Up` | +25 WPM |
| `Arrow Down` | -25 WPM |
| `Arrow Left` | Skip back 2 words |
| `Arrow Right` | Skip forward 1 word |

## License

MIT
