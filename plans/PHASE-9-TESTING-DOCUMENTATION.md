# Phase 9: Testing & Documentation

> **Goal**: Comprehensive testing and documentation for production deployment.
>
> **Estimated Tasks**: 8
> **Prerequisites**: Phases 1-8 completed

---

## Overview

This phase implements:
1. Complete unit test coverage
2. Component integration tests
3. End-to-end tests with Playwright
4. README documentation
5. Build verification
6. Deployment configuration

---

## Task 1: Verify Unit Test Coverage ✅ COMPLETED

### 1.1 Instructions

Run coverage report:

```bash
npm run test:coverage
```

### 1.2 Coverage Targets

| Category | Target | Files |
|----------|--------|-------|
| Utilities | 95%+ | rsvp-utils.ts, progress-storage.ts, file-parsers.ts |
| Hooks | 90%+ | usePlayback.ts, useSession.ts, useKeyboardShortcuts.ts |
| Components | 80%+ | All component files |

### 1.3 Add Missing Tests

Review coverage report and add tests for any uncovered branches.

Example - add edge case tests to `src/lib/rsvp-utils.test.ts`:

```typescript
describe('Edge Cases', () => {
  describe('parseText', () => {
    it('should handle text with only whitespace', () => {
      expect(parseText('   \n\t   ')).toEqual([]);
    });

    it('should handle very long words', () => {
      const longWord = 'a'.repeat(100);
      expect(parseText(longWord)).toEqual([longWord]);
    });
  });

  describe('getORPIndex', () => {
    it('should handle words with only punctuation', () => {
      expect(getORPIndex('...')).toBe(0);
    });

    it('should handle mixed Unicode', () => {
      // Mix of Latin and emoji
      expect(getORPIndex('hello😀world')).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWordDelay', () => {
    it('should handle extremely high WPM', () => {
      const delay = getWordDelay('hello', 10000, false);
      expect(delay).toBe(6); // 60000 / 10000 = 6ms
    });

    it('should handle very long words with multiplier', () => {
      const longWord = 'a'.repeat(50);
      const delay = getWordDelay(longWord, 300, false, 2, 10);
      expect(delay).toBeGreaterThan(200);
    });
  });

  describe('formatTimeRemaining', () => {
    it('should handle large word counts', () => {
      expect(formatTimeRemaining(100000, 300)).toMatch(/\d+:\d{2}/);
    });
  });
});
```

### 1.4 Test: Verify Coverage

```bash
npm run test:coverage
```

**Expected Result**: All targets met.

---

## Task 2: Create Component Integration Tests ✅ COMPLETED

### 2.1 Instructions

Create `src/__tests__/App.integration.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render app title', () => {
      render(<App />);
      expect(screen.getByText('FastReader')).toBeInTheDocument();
    });

    it('should render control buttons', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<App />);
      expect(screen.getByRole('slider', { name: /progress/i })).toBeInTheDocument();
    });
  });

  describe('Playback Flow', () => {
    it('should start playback when play clicked', async () => {
      render(<App />);

      const playButton = screen.getByRole('button', { name: /play/i });
      await userEvent.click(playButton);

      // Should now show pause button
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should pause playback when pause clicked', async () => {
      render(<App />);

      // Start playback
      await userEvent.click(screen.getByRole('button', { name: /play/i }));

      // Pause
      await userEvent.click(screen.getByRole('button', { name: /pause/i }));

      // Should show resume button
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });

    it('should stop playback when stop clicked', async () => {
      render(<App />);

      // Start playback
      await userEvent.click(screen.getByRole('button', { name: /play/i }));

      // Stop
      await userEvent.click(screen.getByRole('button', { name: /stop/i }));

      // Should show play button again
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });
  });

  describe('Settings', () => {
    it('should open settings panel', async () => {
      render(<App />);

      const settingsBtn = screen.getByRole('button', { name: /settings/i });
      await userEvent.click(settingsBtn);

      expect(screen.getByText('Reading Speed')).toBeInTheDocument();
    });

    it('should close settings on overlay click', async () => {
      render(<App />);

      await userEvent.click(screen.getByRole('button', { name: /settings/i }));
      expect(screen.getByText('Reading Speed')).toBeInTheDocument();

      // Click overlay
      const overlay = document.querySelector('.settings-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }

      await waitFor(() => {
        expect(screen.queryByText('Reading Speed')).not.toBeInTheDocument();
      });
    });
  });

  describe('Text Input', () => {
    it('should open text input panel', async () => {
      render(<App />);

      const loadBtn = screen.getByRole('button', { name: /load text/i });
      await userEvent.click(loadBtn);

      expect(screen.getByText('Load Text')).toBeInTheDocument();
    });

    it('should load new text when applied', async () => {
      render(<App />);

      await userEvent.click(screen.getByRole('button', { name: /load text/i }));

      const textarea = screen.getByPlaceholderText(/paste/i);
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'New test content here');

      await userEvent.click(screen.getByRole('button', { name: /load text$/i }));

      // Panel should close
      await waitFor(() => {
        expect(screen.queryByText('Load Text')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should toggle playback on Space', async () => {
      render(<App />);

      // Space to play
      await userEvent.keyboard(' ');
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

      // Space to pause
      await userEvent.keyboard(' ');
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });

    it('should open jump-to on G', async () => {
      render(<App />);

      await userEvent.keyboard('g');

      expect(screen.getByText('Jump to')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('should save session', async () => {
      render(<App />);

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/session saved/i)).toBeInTheDocument();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
```

### 2.2 Test: Run Integration Tests

```bash
npm run test:run -- src/__tests__/App.integration.test.tsx
```

**Expected Result**: All tests pass.

---

## Task 3: Set Up Playwright for E2E Tests

### 3.1 Instructions

Install Playwright:

```bash
npm install -D @playwright/test
npx playwright install
```

### 3.2 Create Playwright Config

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.3 Create E2E Test Directory

```bash
mkdir -p e2e
```

### 3.4 Create E2E Tests

Create `e2e/app.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('FastReader E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display app title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'FastReader' })).toBeVisible();
  });

  test('should start and pause playback', async ({ page }) => {
    // Click play
    await page.getByRole('button', { name: /play/i }).click();

    // Should show pause button
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();

    // Click pause
    await page.getByRole('button', { name: /pause/i }).click();

    // Should show resume button
    await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();
  });

  test('should open and close settings', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByText('Reading Speed')).toBeVisible();

    // Close via close button
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByText('Reading Speed')).not.toBeVisible();
  });

  test('should change WPM via slider', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();

    // Find WPM slider and change it
    const slider = page.getByLabel(/words per minute/i);
    await slider.fill('500');

    // Verify value changed
    await expect(page.getByText('500')).toBeVisible();
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    // Press space to play
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();

    // Press space to pause
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();

    // Press Escape to stop
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /play/i })).toBeVisible();
  });

  test('should open jump-to dialog with G key', async ({ page }) => {
    await page.keyboard.press('g');
    await expect(page.getByText('Jump to')).toBeVisible();
  });

  test('should load custom text', async ({ page }) => {
    // Open text input
    await page.getByRole('button', { name: /load text/i }).click();

    // Clear and enter new text
    const textarea = page.getByPlaceholderText(/paste/i);
    await textarea.fill('Custom test content for reading');

    // Apply
    await page.getByRole('button', { name: /load text$/i }).click();

    // Panel should close
    await expect(page.getByPlaceholderText(/paste/i)).not.toBeVisible();
  });

  test('should save session', async ({ page }) => {
    // Click save
    await page.getByRole('button', { name: /save/i }).click();

    // Should show confirmation
    await expect(page.getByText(/session saved/i)).toBeVisible();
  });

  test('should seek via progress bar', async ({ page }) => {
    const progressBar = page.getByRole('slider', { name: /progress/i });

    // Click at 50%
    const box = await progressBar.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    // Progress should update
    await expect(page.getByText(/50/)).toBeVisible();
  });
});

test.describe('Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show touch controls during playback', async ({ page }) => {
    await page.goto('/');

    // Start playback
    await page.getByRole('button', { name: /play/i }).click();

    // Touch controls should be visible on mobile
    await expect(page.getByRole('button', { name: /skip back/i })).toBeVisible();
  });
});
```

### 3.5 Add E2E Scripts to package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 3.6 Test: Run E2E Tests

```bash
npm run test:e2e
```

**Expected Result**: All E2E tests pass.

---

## Task 4: Create README Documentation

### 4.1 Instructions

Create `README.md`:

```markdown
# FastReader

A fast, distraction-free speed reading app using RSVP (Rapid Serial Visual Presentation) technique.

![FastReader Screenshot](screenshot.png)

## Features

- **RSVP Reading**: Display one word at a time at a fixed focal point
- **ORP Highlighting**: Optimal Recognition Point highlighting for faster comprehension
- **Adjustable Speed**: 50-1000 WPM with preset buttons
- **PDF Support**: Upload and read PDF documents
- **Session Persistence**: Save and resume your reading progress
- **Keyboard Shortcuts**: Full keyboard navigation
- **Mobile Friendly**: Touch controls for mobile devices
- **Dark Theme**: Easy on the eyes for extended reading

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

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
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── types/           # TypeScript types
└── __tests__/       # Integration tests
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
```

---

## Task 5: Build Verification

### 5.1 Instructions

```bash
# Run production build
npm run build

# Preview production build
npm run preview
```

### 5.2 Verify Build Output

Check `dist/` directory:

```bash
ls -la dist/
```

**Expected files**:
- `index.html`
- `assets/` directory with JS and CSS bundles
- Bundle size should be reasonable (<500KB gzipped)

### 5.3 Test: Preview Production Build

```bash
npm run preview
```

Open http://localhost:4173 and verify:
- App loads correctly
- All features work
- No console errors

---

## Task 6: Create Deployment Configuration

### 6.1 Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### 6.2 Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 6.3 GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:run

      - name: Run build
        run: npm run build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Task 7: Final Test Run

### 7.1 Instructions

Run all tests:

```bash
# Unit and integration tests
npm run test:run

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# Lint
npm run lint

# Build
npm run build
```

### 7.2 Test Checklist

| Test | Command | Expected |
|------|---------|----------|
| Unit tests | `npm run test:run` | All pass |
| Coverage | `npm run test:coverage` | >80% |
| E2E tests | `npm run test:e2e` | All pass |
| Lint | `npm run lint` | No errors |
| Build | `npm run build` | Successful |

---

## Task 8: Create CHANGELOG

### 8.1 Instructions

Create `CHANGELOG.md`:

```markdown
# Changelog

All notable changes to FastReader will be documented in this file.

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- RSVP reading with ORP highlighting
- Adjustable reading speed (50-1000 WPM)
- PDF file support
- Session save/restore
- Keyboard shortcuts
- Mobile touch controls
- Dark theme
- Settings panel with all options
- Jump-to dialog
- Progress tracking with seek

### Technical
- React 18 + TypeScript
- Vite build system
- Vitest for unit testing
- Playwright for E2E testing
- Comprehensive test coverage
```

---

## Phase 9 Completion Checklist

**Final Verification**:
- [ ] Unit test coverage >80%
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] ESLint passes with no errors
- [ ] Production build successful
- [ ] README complete
- [ ] CHANGELOG created
- [ ] CI/CD configuration ready
- [ ] Deployment configs ready

---

## Files Created in This Phase

```
src/__tests__/
└── App.integration.test.tsx   ✓ Integration tests

e2e/
└── app.spec.ts                ✓ E2E tests

Root files:
├── README.md                  ✓ Documentation
├── CHANGELOG.md               ✓ Version history
├── playwright.config.ts       ✓ Playwright config
├── vercel.json                ✓ Vercel deployment
├── netlify.toml               ✓ Netlify deployment
└── .github/workflows/ci.yml   ✓ GitHub Actions CI
```

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Manual

```bash
npm run build
# Upload dist/ to your hosting provider
```

---

## Project Complete!

Congratulations! FastReader is now ready for production deployment.

### Summary

- **9 Phases** completed
- **120+ Tests** (unit, integration, E2E)
- **Full Feature Set** matching original rsvp-reading project
- **Production Ready** with CI/CD and deployment configs

### What's Next?

Potential future enhancements:
- User accounts and cloud sync
- Reading statistics and history
- More file format support (EPUB, MOBI)
- Custom themes
- Browser extension
- PWA with offline support
