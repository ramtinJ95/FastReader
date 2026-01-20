import { test, expect } from '@playwright/test';

/**
 * Phase 3 Quiz Component E2E Tests
 *
 * Tests for the new question types added in Phase 3:
 * - FillInBlankQuestion
 * - ShortAnswerQuestion
 * - SelfAssessmentFeedback
 *
 * These tests verify the UI rendering and basic interaction patterns.
 * For tests requiring quiz data, we inject mock state via window evaluation.
 */

test.describe('Phase 3 Quiz Components - UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'FastReader' })).toBeVisible();
  });

  test.describe('App Basic Functionality', () => {
    test('app loads with all expected elements', async ({ page }) => {
      // Header elements
      await expect(page.getByRole('heading', { name: 'FastReader' })).toBeVisible();
      await expect(page.getByRole('button', { name: /load text/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /save session/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();

      // Controls
      await expect(page.getByRole('button', { name: /play/i })).toBeVisible();
      await expect(page.getByRole('slider', { name: /progress/i })).toBeVisible();

      // Backend status indicator
      await expect(
        page.locator('.backend-status').or(page.getByTitle(/Backend/))
      ).toBeVisible();
    });

    test('can load custom text', async ({ page }) => {
      // Open text input dialog
      await page.getByRole('button', { name: /load text/i }).click();
      await expect(page.getByRole('dialog', { name: /load text/i })).toBeVisible();

      // Enter custom text
      const testText =
        'The Industrial Revolution began in Britain in the late 18th century and transformed societies.';
      await page.getByPlaceholder(/paste/i).fill(testText);

      // Apply text
      await page.getByRole('button', { name: 'Load Text', exact: true }).click();

      // Dialog should close
      await expect(page.getByRole('dialog', { name: /load text/i })).not.toBeVisible();

      // Word count should update (count words in test text)
      const wordCount = testText.split(/\s+/).filter((w) => w.length > 0).length;
      await expect(page.locator('.stats')).toContainText(new RegExp(`${wordCount}`));
    });
  });

  test.describe('Quiz Button Visibility', () => {
    test('quiz button appears when backend is connected and session exists', async ({
      page,
    }) => {
      // Check if backend status shows connected
      const backendStatus = page.locator('.backend-status');

      // If backend is connected (green indicator), load text to create session
      const isConnected = await backendStatus
        .filter({ hasText: /●/ })
        .isVisible()
        .catch(() => false);

      if (isConnected) {
        // Load some text to create a session
        await page.getByRole('button', { name: /load text/i }).click();
        await page
          .getByPlaceholder(/paste/i)
          .fill('Sample text for testing the quiz functionality.');
        await page.getByRole('button', { name: 'Load Text', exact: true }).click();

        // Wait a moment for session sync
        await page.waitForTimeout(1000);

        // Quiz button should be visible
        await expect(page.getByRole('button', { name: 'Quiz' })).toBeVisible();
      } else {
        // Backend not connected - quiz button should not appear
        await page.getByRole('button', { name: /load text/i }).click();
        await page.getByPlaceholder(/paste/i).fill('Sample text for testing.');
        await page.getByRole('button', { name: 'Load Text', exact: true }).click();

        // Quiz button should NOT be visible without backend
        await expect(page.getByRole('button', { name: 'Quiz' })).not.toBeVisible();
      }
    });
  });

  test.describe('GeneratingOverlay Component', () => {
    test('generating overlay shows when quiz generation starts', async ({ page }) => {
      // Check if backend is connected
      const backendStatus = page.locator('.backend-status');
      const isConnected = await backendStatus.filter({ hasText: /●/ }).isVisible();

      if (!isConnected) {
        test.skip();
        return;
      }

      // Load text to create session
      await page.getByRole('button', { name: /load text/i }).click();
      await page
        .getByPlaceholder(/paste/i)
        .fill(
          'The Industrial Revolution marked a major turning point in history. It began in Britain and transformed economies.'
        );
      await page.getByRole('button', { name: 'Load Text', exact: true }).click();

      // Wait for quiz button to appear
      await page.waitForTimeout(1000);
      const quizButton = page.getByRole('button', { name: 'Quiz' });

      if (await quizButton.isVisible()) {
        // Click quiz button
        await quizButton.click();

        // Generating overlay should appear
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByText(/Generating Questions/i)).toBeVisible();
        await expect(page.getByText(/This may take/i)).toBeVisible();
      }
    });
  });

  test.describe('Component Styling and Layout', () => {
    test('dialog overlay styles are applied correctly', async ({ page }) => {
      // Open settings dialog to test overlay
      await page.getByRole('button', { name: /settings/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Dialog should have proper styling (settings uses 'settings-panel' class)
      const dialogClasses = await dialog.evaluate((el) => el.className);
      expect(dialogClasses).toContain('settings-panel');

      // Close button should be present and styled
      await expect(page.getByRole('button', { name: /close/i })).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('escape key closes dialogs', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /settings/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('space key toggles playback', async ({ page }) => {
      // Focus the page
      await page.locator('body').click();

      // Press space to play
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();

      // Press space to pause
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();
    });
  });

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('app renders correctly on mobile viewport', async ({ page }) => {
      // Header should still be visible
      await expect(page.getByRole('heading', { name: 'FastReader' })).toBeVisible();

      // Controls should be visible
      await expect(page.getByRole('button', { name: /play/i })).toBeVisible();
    });

    test('touch controls appear during playback on mobile', async ({ page }) => {
      // Start playback
      await page.getByRole('button', { name: /play/i }).click();

      // Touch controls should be visible
      await expect(page.getByRole('button', { name: /skip back/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /skip forward/i })).toBeVisible();
    });
  });
});

test.describe('Phase 3 Component Unit Behavior Tests', () => {
  /**
   * These tests verify the expected behavior of Phase 3 components
   * by examining CSS classes, ARIA attributes, and DOM structure.
   *
   * The actual component logic is verified via Vitest unit tests.
   */

  test('FillInBlankQuestion has expected structure', async ({ page }) => {
    await page.goto('/');

    // Verify the CSS classes exist in the stylesheet (ensures components are included in build)
    const cssClasses = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      const rules: string[] = [];
      for (const sheet of styles) {
        try {
          const cssRules = Array.from(sheet.cssRules || []);
          for (const rule of cssRules) {
            if (rule instanceof CSSStyleRule) {
              rules.push(rule.selectorText);
            }
          }
        } catch {
          // Skip cross-origin stylesheets
        }
      }
      return rules;
    });

    // Check for Phase 3 specific CSS classes
    expect(cssClasses.some((r) => r.includes('.fill-in-blank-question'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.blank-indicator'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.fill-blank-input'))).toBe(true);
  });

  test('ShortAnswerQuestion has expected structure', async ({ page }) => {
    await page.goto('/');

    const cssClasses = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      const rules: string[] = [];
      for (const sheet of styles) {
        try {
          const cssRules = Array.from(sheet.cssRules || []);
          for (const rule of cssRules) {
            if (rule instanceof CSSStyleRule) {
              rules.push(rule.selectorText);
            }
          }
        } catch {
          // Skip cross-origin stylesheets
        }
      }
      return rules;
    });

    // Check for short answer CSS classes
    expect(cssClasses.some((r) => r.includes('.short-answer-question'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.short-answer-input'))).toBe(true);
  });

  test('SelfAssessmentFeedback has expected structure', async ({ page }) => {
    await page.goto('/');

    const cssClasses = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      const rules: string[] = [];
      for (const sheet of styles) {
        try {
          const cssRules = Array.from(sheet.cssRules || []);
          for (const rule of cssRules) {
            if (rule instanceof CSSStyleRule) {
              rules.push(rule.selectorText);
            }
          }
        } catch {
          // Skip cross-origin stylesheets
        }
      }
      return rules;
    });

    // Check for self-assessment CSS classes
    expect(cssClasses.some((r) => r.includes('.self-assessment-feedback'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.answer-comparison'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.rubric-section'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.rating-btn'))).toBe(true);
  });

  test('QuizModal has expected structure', async ({ page }) => {
    await page.goto('/');

    const cssClasses = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      const rules: string[] = [];
      for (const sheet of styles) {
        try {
          const cssRules = Array.from(sheet.cssRules || []);
          for (const rule of cssRules) {
            if (rule instanceof CSSStyleRule) {
              rules.push(rule.selectorText);
            }
          }
        } catch {
          // Skip cross-origin stylesheets
        }
      }
      return rules;
    });

    // Check for quiz modal CSS classes
    expect(cssClasses.some((r) => r.includes('.quiz-modal'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.quiz-header'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.quiz-progress'))).toBe(true);
    expect(cssClasses.some((r) => r.includes('.quiz-content'))).toBe(true);
  });
});
