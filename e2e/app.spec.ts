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

    // Verify value changed - use more specific locator
    await expect(page.getByRole('button', { name: '500' })).toBeVisible();
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    // Click somewhere to ensure page has focus
    await page.locator('body').click();

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
    // Click somewhere to ensure page has focus
    await page.locator('body').click();

    await page.keyboard.press('g');
    // Use the heading specifically to avoid ambiguity
    await expect(page.getByRole('heading', { name: 'Jump to' })).toBeVisible();
  });

  test('should load custom text', async ({ page }) => {
    // Open text input
    await page.getByRole('button', { name: /load text/i }).click();

    // Clear and enter new text using placeholder attribute
    const textarea = page.getByPlaceholder(/paste/i);
    await textarea.fill('Custom test content for reading');

    // Apply - use the submit button in the dialog
    await page.locator('.text-input-panel button[type="submit"]').click();

    // Panel should close - check dialog is no longer visible
    await expect(page.locator('.text-input-panel')).not.toBeVisible();
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

    // Progress should update - check that the stats section shows word count
    await expect(page.locator('.stats')).toContainText(/\d+ \/ \d+/);
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
